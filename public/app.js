// Capacitor imports
const { Filesystem, Directory } = CapacitorPlugins.Filesystem;
const { Share } = CapacitorPlugins.Share;
const { Camera, CameraResultType, CameraSource } = CapacitorPlugins.Camera;

let currentImageData = null;
let currentFileName = null;
let currentImageUri = null;

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

// Convert blob to base64
function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
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
        
        currentImageUri = image.webPath || image.path;
        currentFileName = `IMG_${Date.now()}.jpg`;
        
        // Fetch the image as blob
        const response = await fetch(currentImageUri);
        const blob = await response.blob();
        
        // Convert to base64
        const base64Data = await blobToBase64(blob);
        currentImageData = base64Data.split(',')[1]; // Remove data:image/jpeg;base64, prefix
        
        // Show file info
        const sizeInBytes = blob.size;
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
        
        // Save to Documents directory
        await Filesystem.writeFile({
            path: fileName,
            data: currentImageData,
            directory: Directory.Documents,
            recursive: true
        });
        
        // Also try to save to Downloads if possible
        try {
            await Filesystem.writeFile({
                path: fileName,
                data: currentImageData,
                directory: Directory.Downloads,
                recursive: true
            });
            updateStatus(`✅ Файл успешно сохранен!\n\n📁 Папки: Documents и Downloads\n📄 Имя файла: ${fileName}\n\n🔍 Проверьте в файловом менеджере телефона`, false);
        } catch (downloadsError) {
            updateStatus(`✅ Файл сохранен в папку Documents\n📄 Имя файла: ${fileName}\n\n🔍 Проверьте в файловом менеджере телефона`, false);
        }
        
    } catch (error) {
        console.error('Error saving image:', error);
        updateStatus(`❌ Ошибка сохранения: ${error.message}\n\nВозможно, нужно разрешение на запись в настройках телефона`, true);
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
        
        // Create a blob from base64 data
        const byteCharacters = atob(currentImageData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });
        
        // Create a file from blob
        const file = new File([blob], currentFileName, { type: 'image/jpeg' });
        
        // Share the file
        await Share.share({
            title: 'Поделиться изображением',
            text: 'Проверка сохранения файла на телефон',
            files: [file]
        });
        
        updateStatus('✅ Диалог отправки открыт\nВыберите приложение для отправки');
        
    } catch (error) {
        console.error('Error sharing image:', error);
        updateStatus(`❌ Ошибка отправки: ${error.message}`, true);
    }
}

// Reset everything
function reset() {
    currentImageData = null;
    currentFileName = null;
    currentImageUri = null;
    
    imageInfo.style.display = 'none';
    fileNameSpan.textContent = '';
    fileSizeSpan.textContent = '';
    
    saveImageBtn.disabled = true;
    shareImageBtn.disabled = true;
    
    clearStatus();
    updateStatus('🔄 Сброшено. Выберите новое изображение');
    setTimeout(() => updateStatus('Готов к работе'), 2000);
}

// Check Capacitor availability
function checkCapacitor() {
    if (typeof Capacitor === 'undefined' || !Capacitor.isNativePlatform()) {
        updateStatus('⚠️ Приложение должно быть запущено на устройстве\n(не в браузере)', true);
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
    
    updateStatus('✅ Приложение готово\n\n📱 Выберите изображение для теста\n💾 Проверьте сохранение файла\n📤 Попробуйте поделиться');
}

// Start when DOM is ready
document.addEventListener('DOMContentLoaded', init);
