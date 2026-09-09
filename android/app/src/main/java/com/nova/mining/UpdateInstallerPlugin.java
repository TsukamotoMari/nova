package com.nova.mining;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

@CapacitorPlugin(name = "UpdateInstaller")
public class UpdateInstallerPlugin extends Plugin {
    @PluginMethod
    public void install(PluginCall call) {
        String url = call.getString("url");
        if (url == null || url.isEmpty()) {
            call.reject("Missing update URL");
            return;
        }

        new Thread(() -> {
            try {
                File apk = download(url);
                getActivity().runOnUiThread(() -> promptInstall(apk, call));
            } catch (Exception error) {
                call.reject(error.getMessage() == null ? "Download failed" : error.getMessage());
            }
        }).start();
    }

    private File download(String urlString) throws IOException {
        HttpURLConnection conn = openFollowingRedirects(urlString);
        try (InputStream in = conn.getInputStream()) {
            File out = new File(getContext().getCacheDir(), "nova-update.apk");
            try (FileOutputStream fos = new FileOutputStream(out)) {
                byte[] buf = new byte[8192];
                int first = in.read(buf);
                if (first < 2 || buf[0] != 'P' || buf[1] != 'K') {
                    throw new IOException("The download was not an APK. Try again in a moment.");
                }
                fos.write(buf, 0, first);
                int n;
                while ((n = in.read(buf)) > 0) {
                    fos.write(buf, 0, n);
                }
            }
            return out;
        } finally {
            conn.disconnect();
        }
    }

    private HttpURLConnection openFollowingRedirects(String urlString) throws IOException {
        String current = urlString;
        for (int hop = 0; hop < 8; hop++) {
            HttpURLConnection conn = (HttpURLConnection) new URL(current).openConnection();
            conn.setInstanceFollowRedirects(false);
            conn.setConnectTimeout(20000);
            conn.setReadTimeout(60000);
            conn.setRequestProperty(
                "User-Agent",
                "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36"
            );
            conn.setRequestProperty("Accept", "application/vnd.android.package-archive,*/*");
            int code = conn.getResponseCode();
            if (code >= 300 && code < 400) {
                String next = conn.getHeaderField("Location");
                conn.disconnect();
                if (next == null || next.isEmpty()) {
                    throw new IOException("Update redirect failed");
                }
                current = new URL(new URL(current), next).toString();
                continue;
            }
            if (code >= 400) {
                conn.disconnect();
                throw new IOException("Update download failed (" + code + ")");
            }
            return conn;
        }
        throw new IOException("Too many redirects");
    }

    private void promptInstall(File apk, PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            && !getContext().getPackageManager().canRequestPackageInstalls()) {
            Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
            settings.setData(Uri.parse("package:" + getContext().getPackageName()));
            settings.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(settings);
            JSObject ret = new JSObject();
            ret.put("needsPermission", true);
            call.resolve(ret);
            return;
        }

        Uri uri = FileProvider.getUriForFile(
            getContext(),
            getContext().getPackageName() + ".fileprovider",
            apk
        );
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        JSObject ret = new JSObject();
        ret.put("needsPermission", false);
        call.resolve(ret);
    }
}
