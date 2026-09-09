package com.nova.mining;

import android.app.Activity;
import android.app.ActivityOptions;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageInstaller;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Log;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.List;

@CapacitorPlugin(name = "UpdateInstaller")
public class UpdateInstallerPlugin extends Plugin {
    private static final String TAG = "NovaUpdate";
    private static final String APK_NAME = "nova-update.apk";
    private static final String META_NAME = "nova-update.version";
    private static final String ACTION_INSTALL_STATUS = "com.nova.mining.INSTALL_STATUS";

    private boolean resumeInstall;

    private final BroadcastReceiver installReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            int status = intent.getIntExtra(PackageInstaller.EXTRA_STATUS, PackageInstaller.STATUS_FAILURE);
            if (status != PackageInstaller.STATUS_PENDING_USER_ACTION) {
                Log.i(TAG, "Install status " + status);
                return;
            }
            Intent confirm = extraIntent(intent);
            if (confirm == null) {
                Log.w(TAG, "Install confirm intent missing");
                return;
            }
            startFromActivity(confirm);
        }
    };

    @Override
    public void load() {
        IntentFilter filter = new IntentFilter(ACTION_INSTALL_STATUS);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            getContext().registerReceiver(installReceiver, filter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            getContext().registerReceiver(installReceiver, filter);
        }
    }

    @Override
    protected void handleOnDestroy() {
        try {
            getContext().unregisterReceiver(installReceiver);
        } catch (Exception ignored) {
        }
    }

    @Override
    protected void handleOnResume() {
        if (!resumeInstall) return;
        File apk = cachedApk();
        if (!isValidApk(apk) || needsInstallPermission()) return;
        resumeInstall = false;
        try {
            launchInstaller(apk);
        } catch (Exception error) {
            Log.w(TAG, "Resume install failed", error);
        }
    }

    @PluginMethod
    public void install(PluginCall call) {
        String url = call.getString("url");
        Integer versionCode = call.getInt("versionCode");
        if (url == null || url.isEmpty()) {
            call.reject("Missing update URL");
            return;
        }

        new Thread(() -> {
            try {
                File apk = ensureApk(url, versionCode);
                Activity activity = getActivity();
                if (activity == null) {
                    call.reject("Open Nova and tap Install again.");
                    return;
                }
                activity.runOnUiThread(() -> finishLaunch(apk, call));
            } catch (Exception error) {
                call.reject(error.getMessage() == null ? "Download failed" : error.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void openInstaller(PluginCall call) {
        File apk = cachedApk();
        if (!isValidApk(apk)) {
            call.reject("The update file is gone. Tap Install update to download it again.");
            return;
        }
        finishLaunch(apk, call);
    }

    private void finishLaunch(File apk, PluginCall call) {
        try {
            if (needsInstallPermission()) {
                resumeInstall = true;
                Intent settings = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
                settings.setData(Uri.parse("package:" + getContext().getPackageName()));
                startFromActivity(settings);
                JSObject ret = new JSObject();
                ret.put("needsPermission", true);
                ret.put("ready", true);
                ret.put("launched", false);
                call.resolve(ret);
                return;
            }

            launchInstaller(apk);
            JSObject ret = new JSObject();
            ret.put("needsPermission", false);
            ret.put("ready", true);
            ret.put("launched", true);
            call.resolve(ret);
        } catch (Exception error) {
            call.reject(error.getMessage() == null ? "Could not open installer" : error.getMessage());
        }
    }

    private void launchInstaller(File apk) throws Exception {
        try {
            startViewIntent(apk);
        } catch (Exception viewError) {
            Log.w(TAG, "ACTION_VIEW install failed, using session", viewError);
            commitSession(apk);
        }
    }

    private void startViewIntent(File apk) {
        Uri uri = FileProvider.getUriForFile(
            getContext(),
            getContext().getPackageName() + ".fileprovider",
            apk
        );
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(uri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.putExtra(Intent.EXTRA_NOT_UNKNOWN_SOURCE, true);
        grantUri(intent, uri);
        startFromActivity(intent);
    }

    private void commitSession(File apk) throws IOException {
        PackageInstaller installer = getContext().getPackageManager().getPackageInstaller();
        PackageInstaller.SessionParams params = new PackageInstaller.SessionParams(
            PackageInstaller.SessionParams.MODE_FULL_INSTALL
        );
        params.setAppPackageName(getContext().getPackageName());
        int sessionId = installer.createSession(params);
        try (PackageInstaller.Session session = installer.openSession(sessionId)) {
            try (InputStream in = new FileInputStream(apk);
                 OutputStream out = session.openWrite("nova", 0, apk.length())) {
                byte[] buf = new byte[65536];
                int n;
                while ((n = in.read(buf)) > 0) {
                    out.write(buf, 0, n);
                }
                session.fsync(out);
            }
            Intent callback = new Intent(ACTION_INSTALL_STATUS);
            callback.setPackage(getContext().getPackageName());
            int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_MUTABLE;
            PendingIntent pending = pendingBroadcast(sessionId, callback, flags);
            session.commit(pending.getIntentSender());
        }
    }

    private PendingIntent pendingBroadcast(int sessionId, Intent callback, int flags) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            Bundle options = ActivityOptions.makeBasic()
                .setPendingIntentBackgroundActivityStartMode(
                    ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED
                )
                .toBundle();
            return PendingIntent.getBroadcast(getContext(), sessionId, callback, flags, options);
        }
        return PendingIntent.getBroadcast(getContext(), sessionId, callback, flags);
    }

    private void startFromActivity(Intent intent) {
        Activity activity = getActivity();
        if (activity != null) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                Bundle options = ActivityOptions.makeBasic()
                    .setPendingIntentBackgroundActivityStartMode(
                        ActivityOptions.MODE_BACKGROUND_ACTIVITY_START_ALLOWED
                    )
                    .toBundle();
                activity.startActivity(intent, options);
            } else {
                activity.startActivity(intent);
            }
            return;
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
    }

    private void grantUri(Intent intent, Uri uri) {
        PackageManager pm = getContext().getPackageManager();
        List<ResolveInfo> matches = pm.queryIntentActivities(intent, PackageManager.MATCH_DEFAULT_ONLY);
        for (ResolveInfo info : matches) {
            getContext().grantUriPermission(
                info.activityInfo.packageName,
                uri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION
            );
        }
    }

    private boolean needsInstallPermission() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
            && !getContext().getPackageManager().canRequestPackageInstalls();
    }

    private File ensureApk(String url, Integer versionCode) throws IOException {
        if (hasCachedApk(versionCode)) {
            return cachedApk();
        }
        File apk = download(url);
        writeMeta(versionCode);
        return apk;
    }

    private boolean hasCachedApk(Integer versionCode) {
        File apk = cachedApk();
        File meta = cachedMeta();
        if (!isValidApk(apk) || !meta.exists() || versionCode == null) return false;
        try (FileInputStream in = new FileInputStream(meta)) {
            byte[] raw = new byte[(int) meta.length()];
            int read = in.read(raw);
            if (read <= 0) return false;
            return String.valueOf(versionCode).equals(new String(raw, 0, read, StandardCharsets.UTF_8).trim());
        } catch (IOException error) {
            return false;
        }
    }

    private void writeMeta(Integer versionCode) throws IOException {
        if (versionCode == null) return;
        try (FileOutputStream out = new FileOutputStream(cachedMeta())) {
            out.write(String.valueOf(versionCode).getBytes(StandardCharsets.UTF_8));
        }
    }

    private File download(String urlString) throws IOException {
        HttpURLConnection conn = openFollowingRedirects(urlString);
        File out = cachedApk();
        File tmp = new File(getContext().getCacheDir(), APK_NAME + ".part");
        try (InputStream in = conn.getInputStream();
             FileOutputStream fos = new FileOutputStream(tmp)) {
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
        } finally {
            conn.disconnect();
        }
        if (out.exists() && !out.delete()) {
            throw new IOException("Could not replace the old update file");
        }
        if (!tmp.renameTo(out)) {
            throw new IOException("Could not save the update file");
        }
        return out;
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

    private File cachedApk() {
        return new File(getContext().getCacheDir(), APK_NAME);
    }

    private File cachedMeta() {
        return new File(getContext().getCacheDir(), META_NAME);
    }

    private static boolean isValidApk(File apk) {
        return apk != null && apk.isFile() && apk.length() > 100_000;
    }

    @SuppressWarnings("deprecation")
    private static Intent extraIntent(Intent intent) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return intent.getParcelableExtra(Intent.EXTRA_INTENT, Intent.class);
        }
        return intent.getParcelableExtra(Intent.EXTRA_INTENT);
    }
}
