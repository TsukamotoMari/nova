package com.nova.mining;

import android.content.ContentValues;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.provider.Settings;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "SaveVault")
public class SaveVaultPlugin extends Plugin {
    private static final String FOLDER = "Nova";
    private static final String FILE_NAME = "nova-cosmic-mining-v1.json";

    @PluginMethod
    public void write(PluginCall call) {
        String json = call.getString("json");
        if (json == null) {
            call.reject("Missing save data");
            return;
        }
        try {
            try {
                writeFile(json);
            } catch (Exception ignored) {
                // Scoped storage may block the public Documents path; MediaStore is enough.
            }
            writeMediaStore(json);
            call.resolve();
        } catch (Exception error) {
            call.reject(error.getMessage() == null ? "Could not keep a durable save" : error.getMessage());
        }
    }

    @PluginMethod
    public void read(PluginCall call) {
        try {
            boolean exists = saveFile().exists() || findMediaStoreUri() != null;
            String json = readFile();
            if (json == null) {
                json = readMediaStore();
            }
            JSObject ret = new JSObject();
            if (json != null && !json.isEmpty()) {
                ret.put("json", json);
                exists = true;
            }
            ret.put("exists", exists);
            call.resolve(ret);
        } catch (Exception error) {
            call.reject(error.getMessage() == null ? "Could not read durable save" : error.getMessage());
        }
    }

    @PluginMethod
    public void clear(PluginCall call) {
        try {
            File file = saveFile();
            if (file.exists()) {
                //noinspection ResultOfMethodCallIgnored
                file.delete();
            }
            Uri uri = findMediaStoreUri();
            if (uri != null) {
                getContext().getContentResolver().delete(uri, null, null);
            }
            call.resolve();
        } catch (Exception error) {
            call.reject(error.getMessage() == null ? "Could not clear durable save" : error.getMessage());
        }
    }

    @PluginMethod
    public void prepareRestore(PluginCall call) {
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && !Environment.isExternalStorageManager()) {
            Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            ret.put("needsPermission", true);
        } else {
            ret.put("needsPermission", false);
        }
        call.resolve(ret);
    }

    private File saveDir() {
        return new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS), FOLDER);
    }

    private File saveFile() {
        return new File(saveDir(), FILE_NAME);
    }

    private void writeFile(String json) throws Exception {
        File dir = saveDir();
        if (!dir.exists() && !dir.mkdirs() && !dir.exists()) {
            return;
        }
        File file = saveFile();
        try (FileOutputStream out = new FileOutputStream(file)) {
            out.write(json.getBytes(StandardCharsets.UTF_8));
        }
    }

    private String readFile() throws Exception {
        File file = saveFile();
        if (!file.exists()) {
            return null;
        }
        try (FileInputStream in = new FileInputStream(file)) {
            return readStream(in);
        }
    }

    private void writeMediaStore(String json) throws Exception {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            return;
        }
        byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
        Uri existing = findMediaStoreUri();
        if (existing != null) {
            try (OutputStream out = getContext().getContentResolver().openOutputStream(existing, "wt")) {
                if (out != null) {
                    out.write(bytes);
                    return;
                }
            }
        }
        ContentValues values = new ContentValues();
        values.put(MediaStore.MediaColumns.DISPLAY_NAME, FILE_NAME);
        values.put(MediaStore.MediaColumns.MIME_TYPE, "application/json");
        values.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOCUMENTS + "/" + FOLDER + "/");
        Uri uri = getContext().getContentResolver().insert(MediaStore.Files.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY), values);
        if (uri == null) {
            return;
        }
        try (OutputStream out = getContext().getContentResolver().openOutputStream(uri)) {
            if (out != null) {
                out.write(bytes);
            }
        }
    }

    private String readMediaStore() throws Exception {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            return null;
        }
        Uri uri = findMediaStoreUri();
        if (uri == null) {
            return null;
        }
        try (InputStream in = getContext().getContentResolver().openInputStream(uri)) {
            return in == null ? null : readStream(in);
        }
    }

    private Uri findMediaStoreUri() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            return null;
        }
        String selection = MediaStore.MediaColumns.DISPLAY_NAME + "=?";
        String[] args = new String[] { FILE_NAME };
        try (Cursor cursor = getContext().getContentResolver().query(
            MediaStore.Files.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY),
            new String[] { MediaStore.MediaColumns._ID },
            selection,
            args,
            null
        )) {
            if (cursor != null && cursor.moveToFirst()) {
                long id = cursor.getLong(0);
                return Uri.withAppendedPath(MediaStore.Files.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY), Long.toString(id));
            }
        }
        return null;
    }

    private String readStream(InputStream in) throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[4096];
        int n;
        while ((n = in.read(buf)) > 0) {
            out.write(buf, 0, n);
        }
        return out.toString(StandardCharsets.UTF_8.name());
    }
}
