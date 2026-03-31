package com.test.saveimage;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {
    
    private TextView tvStatus;
    private File savedFile = null;
    
    private final ActivityResultLauncher<String> permissionLauncher = registerForActivityResult(
        new ActivityResultContracts.RequestPermission(),
        isGranted -> {
            if (isGranted) pickImage();
            else Toast.makeText(this, "Нужно разрешение для выбора файла", Toast.LENGTH_SHORT).show();
        }
    );
    
    private final ActivityResultLauncher<String[]> multiplePermissionLauncher = registerForActivityResult(
        new ActivityResultContracts.RequestMultiplePermissions(),
        result -> {
            if (result.values().stream().allMatch(granted -> granted)) pickImage();
            else Toast.makeText(this, "Нужны разрешения для сохранения", Toast.LENGTH_SHORT).show();
        }
    );
    
    private final ActivityResultLauncher<Intent> pickImageLauncher = registerForActivityResult(
        new ActivityResultContracts.StartActivityForResult(),
        result -> {
            if (result.getResultCode() == RESULT_OK && result.getData() != null) {
                Uri imageUri = result.getData().getData();
                if (imageUri != null) saveImageToStorage(imageUri);
            }
        }
    );
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        
        tvStatus = findViewById(R.id.tvStatus);
        Button btnPick = findViewById(R.id.btnPick);
        Button btnShare = findViewById(R.id.btnShare);
        
        btnPick.setOnClickListener(v -> checkPermissionsAndPick());
        btnShare.setOnClickListener(v -> shareImage());
    }
    
    private void checkPermissionsAndPick() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            // Android 13+: READ_MEDIA_IMAGES
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_MEDIA_IMAGES) 
                    != PackageManager.PERMISSION_GRANTED) {
                permissionLauncher.launch(Manifest.permission.READ_MEDIA_IMAGES);
            } else {
                pickImage();
            }
        } else {
            // Android 12 и ниже
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE) 
                    != PackageManager.PERMISSION_GRANTED) {
                multiplePermissionLauncher.launch(new String[]{
                    Manifest.permission.READ_EXTERNAL_STORAGE,
                    Manifest.permission.WRITE_EXTERNAL_STORAGE
                });
            } else {
                pickImage();
            }
        }
    }
    
    private void pickImage() {
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.setType("image/*");
        pickImageLauncher.launch(intent);
    }
    
    private void saveImageToStorage(Uri imageUri) {
        try {
            // Создаем папку Pictures/TestApp
            File picturesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES);
            File appDir = new File(picturesDir, "TestApp");
            if (!appDir.exists()) {
                appDir.mkdirs();
            }
            
            // Создаем уникальное имя файла
            String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
            String fileName = "IMG_" + timeStamp + ".jpg";
            File destFile = new File(appDir, fileName);
            
            // Копируем изображение
            InputStream inputStream = getContentResolver().openInputStream(imageUri);
            FileOutputStream outputStream = new FileOutputStream(destFile);
            
            byte[] buffer = new byte[4096];
            int bytesRead;
            while ((bytesRead = inputStream.read(buffer)) != -1) {
                outputStream.write(buffer, 0, bytesRead);
            }
            
            outputStream.close();
            inputStream.close();
            
            savedFile = destFile;
            
            // Сканируем файл, чтобы он появился в галерее
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                MediaStore.scanFile(getContentResolver(), new String[]{destFile.getAbsolutePath()}, null, null);
            } else {
                sendBroadcast(new Intent(Intent.ACTION_MEDIA_SCANNER_SCAN_FILE, Uri.fromFile(destFile)));
            }
            
            tvStatus.setText("✅ Сохранено:\n" + destFile.getAbsolutePath());
            Toast.makeText(this, "Файл сохранен: " + fileName, Toast.LENGTH_LONG).show();
            
        } catch (Exception e) {
            tvStatus.setText("❌ Ошибка: " + e.getMessage());
            Toast.makeText(this, "Ошибка сохранения: " + e.getMessage(), Toast.LENGTH_SHORT).show();
            e.printStackTrace();
        }
    }
    
    private void shareImage() {
        if (savedFile == null || !savedFile.exists()) {
            Toast.makeText(this, "Сначала выберите и сохраните изображение", Toast.LENGTH_SHORT).show();
            return;
        }
        
        Uri fileUri = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", savedFile);
        
        Intent shareIntent = new Intent(Intent.ACTION_SEND);
        shareIntent.setType("image/jpeg");
        shareIntent.putExtra(Intent.EXTRA_STREAM, fileUri);
        shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        
        startActivity(Intent.createChooser(shareIntent, "Поделиться изображением"));
    }
}
