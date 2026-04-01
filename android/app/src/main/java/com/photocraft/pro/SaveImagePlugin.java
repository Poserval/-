package com.photocraft.pro;

import android.content.ContentValues;
import android.content.Context;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;

import java.io.OutputStream;

public class SaveImagePlugin extends Plugin {
    
    private static final String TAG = "SaveImagePlugin";
    
    @PluginMethod
    public void saveToGallery(PluginCall call) {
        String base64 = call.getString("base64");
        String fileName = call.getString("fileName");
        
        if (base64 == null || fileName == null) {
            call.reject("Missing base64 or fileName");
            return;
        }
        
        try {
            // Убираем префикс если есть
            if (base64.contains(",")) {
                base64 = base64.split(",")[1];
            }
            
            byte[] decodedBytes = Base64.decode(base64, Base64.DEFAULT);
            Context context = getContext();
            
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Android 10+ используем MediaStore
                ContentValues values = new ContentValues();
                values.put(MediaStore.Images.Media.DISPLAY_NAME, fileName);
                values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
                values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/PhotoCraftPro");
                values.put(MediaStore.Images.Media.IS_PENDING, 1);
                
                Uri uri = context.getContentResolver().insert(
                    MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
                
                if (uri != null) {
                    OutputStream out = context.getContentResolver().openOutputStream(uri);
                    out.write(decodedBytes);
                    out.close();
                    
                    values.clear();
                    values.put(MediaStore.Images.Media.IS_PENDING, 0);
                    context.getContentResolver().update(uri, values, null, null);
                }
            } else {
                // Android 9 и ниже
                String picturesDir = Environment.getExternalStoragePublicDirectory(
                    Environment.DIRECTORY_PICTURES).getAbsolutePath();
                String appDir = picturesDir + "/PhotoCraftPro";
                
                java.io.File dir = new java.io.File(appDir);
                if (!dir.exists()) {
                    dir.mkdirs();
                }
                
                java.io.File file = new java.io.File(dir, fileName);
                java.io.FileOutputStream out = new java.io.FileOutputStream(file);
                out.write(decodedBytes);
                out.close();
                
                // Сканируем файл для появления в галерее
                android.media.MediaScannerConnection.scanFile(
                    context,
                    new String[]{file.getAbsolutePath()},
                    null,
                    null
                );
            }
            
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
            
            Log.d(TAG, "Image saved: " + fileName);
            
        } catch (Exception e) {
            Log.e(TAG, "Save error", e);
            call.reject("Save failed: " + e.getMessage());
        }
    }
}
