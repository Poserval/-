// Capacitor imports
const { Filesystem, Directory } = CapacitorPlugins.Filesystem;
const { Share } = CapacitorPlugins.Share;
const { Camera, CameraResultType, CameraSource } = CapacitorPlugins.Camera;

let currentImagePath = null;
let currentImageData = null;
let currentFileName = null;

// DOM elements
const pickImageBtn = document.getElementById('pickImageBtn');
const saveImageBtn = document.getElementById('saveImageBtn');
const shareImageBtn = document.getElementById('shareImageBtn');
const resetBtn = document.getElementById('resetBtn');
const statusDiv = document.getElementById('status');
const statusText = document.getElementById('statusText');
const imageInfo = document.getElementById('imageInfo');
const fileNameSpan = document.getElementById('fileName');
const fileSizeSpan = document.getElementById('fileSize');

// Update status with message
function updateStatus(message, isError = false) {
    statusText.textContent = message;
    if (isError) {
        statusDiv.classList.add('error');
        statusDiv.classList.remove('success');
    } else {
        statusDiv.classList.add('success');
        statusDiv.classList.remove('error');
    }
}

// Clear status special styling
function clearStatus() {
    statusDiv.classList.remove('success', 'error');
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Pick image from gallery
async function pickImage() {
    try {
        updateStatus('Выбор изображения...');
        
        const image = await Camera.getPhoto({
            quality: 90,
            allowEditing: false,
            resultType: CameraResultType.Uri,
            source: CameraSource.Photos
        });
        
        currentImagePath = image.path;
        currentFileName = `IMG_${Date.now()}.jpg`;
        
        // Read file data
        const fileData = await Filesystem.readFile({
            path: currentImagePath,
            directory: Directory.Data
        });
        
        currentImageData = fileData.data;
        
        // Show file info
        const sizeInBytes = currentImageData.length;
        fileNameSpan.textContent = `Имя: ${currentFileName}`;
        fileSizeSpan.textContent = `Размер: ${formatFileSize(sizeInBytes)}`;
        imageInfo.style.display = 'block';
        
        updateStatus(`✅ Изображение выбрано: ${currentFileName} (${formatFileSize(sizeInBytes)})`);
        
        // Enable buttons
        saveImageBtn.disabled = false;
        shareImageBtn.disabled = false;
        
    } catch (error) {
        console.error('Error picking image:', error);
        if (error.message !== 'User cancelled photos app') {
            updateStatus(`❌ Ошибка выбора: ${error.message}`, true);
        } else {
            updateStatus('Выбор отменен');
            setTimeout(() => updateStatus('Готов к работе'), 2000);
        }
    }
}

// Save image to device
async function saveImage() {
    if (!currentImageData) {
        updateStatus('❌ Нет изображения для сохранения', true);
        return;
    }
    
    try {
        updateStatus('💾 Сохранение файла...');
        
        // Generate unique filename
        const timestamp = Date.now();
        const fileName = `saved_image_${timestamp}.jpg`;
        
        // Save to device
        const result = await Filesystem.writeFile({
            path: fileName,
            data: currentImageData,
            directory: Directory.Documents,
            recursive: true
        });
        
        // Also try to save to Downloads (for easier access)
        try {
            await Filesystem.writeFile({
                path: fileName,
                data: currentImageData,
                directory: Directory.Downloads,
                recursive: true
            });
            updateStatus(`✅ Файл сохранен!\n📁 Documents и Downloads папки\n📄 Имя: ${fileName}`, false);
        } catch (downloadsError) {
            updateStatus(`✅ Файл сохранен в Documents\n📄 Имя: ${fileName}`, false);
        }
        
    } catch (error) {
        console.error('Error saving image:', error);
        updateStatus(`❌ Ошибка сохранения: ${error.message}`, true);
    }
}

// Share image
async function shareImage() {
    if (!currentImageData) {
        updateStatus('❌ Нет изображения для отправки', true);
        return;
    }
    
    try {
        updateStatus('📤 Подготовка к отправке...');
        
        // Save temp file for sharing
        const tempFileName = `share_${Date.now()}.jpg`;
        const result = await Filesystem.writeFile({
            path: tempFileName,
            data: currentImageData,
            directory: Directory.Cache
        });
        
        // Get full URI
        const fileUri = result.uri;
        
        // Share the file
        await Share.share({
            title: 'Поделиться изображением',
            text: 'Проверка сохранения файла',
            url: fileUri,
            dialogTitle: 'Отправить изображение'
        });
        
        updateStatus('✅ Диалог отправки открыт');
        
        // Clean up temp file
        await Filesystem.deleteFile({
            path: tempFileName,
            directory: Directory.Cache
        });
        
    } catch (error) {
        console.error('Error sharing image:', error);
        updateStatus(`❌ Ошибка отправки: ${error.message}`, true);
    }
}

// Reset everything
function reset() {
    currentImagePath = null;
    currentImageData = null;
    currentFileName = null;
    
    imageInfo.style.display = 'none';
    fileNameSpan.textContent = '';
    fileSizeSpan.textContent = '';
    
    saveImageBtn.disabled = true;
    shareImageBtn.disabled = true;
    
    clearStatus();
    updateStatus('Сброшено. Выберите новое изображение');
    setTimeout(() => updateStatus('Готов к работе'), 2000);
}

// Check Capacitor availability
function checkCapacitor() {
    if (typeof Capacitor === 'undefined') {
        updateStatus('⚠️ Запустите приложение на устройстве (не в браузере)', true);
        pickImageBtn.disabled = true;
        saveImageBtn.disabled = true;
        shareImageBtn.disabled = true;
        return false;
    }
    return true;
}

// Initialize event listeners
function init() {
    if (!checkCapacitor()) return;
    
    pickImageBtn.addEventListener('click', pickImage);
    saveImageBtn.addEventListener('click', saveImage);
    shareImageBtn.addEventListener('click', shareImage);
    resetBtn.addEventListener('click', reset);
    
    updateStatus('✅ Приложение готово\nВыберите изображение для теста');
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
