// Глобальные переменные
let selectedImage = null;
let selectedImageName = null;
let logEntries = [];

// Функция для добавления в лог
function addLog(message, isError = false) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    logEntries.unshift(logEntry);
    if (logEntries.length > 20) logEntries.pop();
    
    const logDiv = document.getElementById('logEntries');
    if (logDiv) {
        logDiv.innerHTML = logEntries.map(entry => 
            `<div class="log-entry">${entry}</div>`
        ).join('');
    }
    
    console.log(logEntry);
}

// Обновление статуса
function updateStatus(message, isError = false) {
    const statusText = document.getElementById('statusText');
    const statusCard = document.getElementById('statusCard');
    
    if (statusText) statusText.textContent = message;
    if (statusCard) {
        if (isError) {
            statusCard.classList.add('error-border');
            statusCard.classList.remove('success-border');
        } else {
            statusCard.classList.add('success-border');
            statusCard.classList.remove('error-border');
        }
    }
    
    addLog(message, isError);
}

// Проверка Capacitor
function isCapacitorAvailable() {
    const available = typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform();
    addLog(`Capacitor доступен: ${available}`);
    if (!available) {
        updateStatus('⚠️ Приложение запущено в браузере. Для работы установите APK на телефон!', true);
    }
    return available;
}

// Выбор изображения
async function selectImage() {
    addLog('Нажата кнопка выбора изображения');
    
    if (!isCapacitorAvailable()) {
        updateStatus('❌ Capacitor не доступен. Установите приложение на телефон!', true);
        return;
    }
    
    try {
        updateStatus('📷 Открываю галерею...');
        addLog('Вызов Camera.getPhoto()');
        
        const Camera = Capacitor.Plugins.Camera;
        const image = await Camera.getPhoto({
            quality: 90,
            allowEditing: false,
            resultType: CameraResultType.Uri,
            source: CameraSource.Photos
        });
        
        addLog(`Изображение выбрано: ${image.path || image.webPath}`);
        
        // Получаем данные файла
        const Filesystem = Capacitor.Plugins.Filesystem;
        const fileData = await Filesystem.readFile({
            path: image.path,
            directory: Directory.Data
        });
        
        selectedImage = fileData.data;
        selectedImageName = `image_${Date.now()}.jpg`;
        
        // Показываем информацию
        const sizeKB = Math.round(selectedImage.length / 1024);
        document.getElementById('fileName').textContent = `Имя: ${selectedImageName}`;
        document.getElementById('fileSize').textContent = `Размер: ${sizeKB} KB`;
        document.getElementById('infoPanel').style.display = 'block';
        
        updateStatus(`✅ Изображение выбрано! Размер: ${sizeKB} KB`);
        
        // Активируем кнопки
        document.getElementById('saveBtn').disabled = false;
        document.getElementById('shareBtn').disabled = false;
        
    } catch (error) {
        addLog(`Ошибка: ${error.message}`, true);
        if (error.message !== 'User cancelled photos app') {
            updateStatus(`❌ Ошибка: ${error.message}`, true);
        } else {
            updateStatus('Выбор изображения отменен');
        }
    }
}

// Сохранение изображения
async function saveImage() {
    addLog('Нажата кнопка сохранения');
    
    if (!selectedImage) {
        updateStatus('❌ Нет выбранного изображения', true);
        return;
    }
    
    try {
        updateStatus('💾 Сохраняю файл...');
        addLog('Начинаю сохранение');
        
        const Filesystem = Capacitor.Plugins.Filesystem;
        const fileName = `IMG_${Date.now()}.jpg`;
        
        // Сохраняем в Documents
        await Filesystem.writeFile({
            path: fileName,
            data: selectedImage,
            directory: Directory.Documents
        });
        addLog(`Сохранено в Documents: ${fileName}`);
        
        // Пробуем сохранить в Downloads
        try {
            await Filesystem.writeFile({
                path: fileName,
                data: selectedImage,
                directory: Directory.Downloads
            });
            addLog(`Сохранено в Downloads: ${fileName}`);
            updateStatus(`✅ Файл сохранен!\n📁 Папки: Documents и Downloads\n📄 Имя: ${fileName}`);
        } catch (e) {
            addLog(`Не удалось сохранить в Downloads: ${e.message}`);
            updateStatus(`✅ Файл сохранен в Documents\n📄 Имя: ${fileName}`);
        }
        
    } catch (error) {
        addLog(`Ошибка сохранения: ${error.message}`, true);
        updateStatus(`❌ Ошибка сохранения: ${error.message}`, true);
    }
}

// Поделиться изображением
async function shareImage() {
    addLog('Нажата кнопка поделиться');
    
    if (!selectedImage) {
        updateStatus('❌ Нет выбранного изображения', true);
        return;
    }
    
    try {
        updateStatus('📤 Открываю меню отправки...');
        addLog('Подготовка к отправке');
        
        // Создаем временный файл для отправки
        const Filesystem = Capacitor.Plugins.Filesystem;
        const tempName = `temp_${Date.now()}.jpg`;
        
        await Filesystem.writeFile({
            path: tempName,
            data: selectedImage,
            directory: Directory.Cache
        });
        
        addLog(`Временный файл создан: ${tempName}`);
        
        const Share = Capacitor.Plugins.Share;
        await Share.share({
            title: 'Поделиться изображением',
            text: 'Тест сохранения файла на телефон',
            url: `file://${tempName}`,
            dialogTitle: 'Отправить через'
        });
        
        addLog('Диалог отправки открыт');
        updateStatus('✅ Диалог отправки открыт');
        
        // Удаляем временный файл через 5 секунд
        setTimeout(async () => {
            try {
                await Filesystem.deleteFile({
                    path: tempName,
                    directory: Directory.Cache
                });
                addLog('Временный файл удален');
            } catch (e) {
                addLog(`Ошибка удаления: ${e.message}`);
            }
        }, 5000);
        
    } catch (error) {
        addLog(`Ошибка отправки: ${error.message}`, true);
        updateStatus(`❌ Ошибка отправки: ${error.message}`, true);
    }
}

// Сброс
function reset() {
    addLog('Сброс состояния');
    selectedImage = null;
    selectedImageName = null;
    document.getElementById('infoPanel').style.display = 'none';
    document.getElementById('saveBtn').disabled = true;
    document.getElementById('shareBtn').disabled = true;
    updateStatus('Сброшено. Выберите новое изображение');
}

// Проверка и инициализация плагинов
async function checkPlugins() {
    addLog('Проверка плагинов Capacitor...');
    
    if (!isCapacitorAvailable()) return false;
    
    const plugins = ['Camera', 'Filesystem', 'Share'];
    let allAvailable = true;
    
    for (const plugin of plugins) {
        const available = Capacitor.Plugins[plugin] !== undefined;
        addLog(`Плагин ${plugin}: ${available ? 'доступен' : 'НЕ ДОСТУПЕН'}`);
        if (!available) allAvailable = false;
    }
    
    if (!allAvailable) {
        updateStatus('⚠️ Некоторые плагины недоступны. Переустановите приложение.', true);
        return false;
    }
    
    return true;
}

// Главная инициализация
async function init() {
    addLog('========== ЗАПУСК ПРИЛОЖЕНИЯ ==========');
    addLog('Версия: 1.0.0');
    
    // Ждем загрузки Capacitor
    if (typeof Capacitor === 'undefined') {
        addLog('Capacitor не загружен, ждем 2 секунды...');
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Проверяем наличие глобальных объектов
    if (typeof Capacitor !== 'undefined') {
        addLog('Capacitor версия: ' + (Capacitor.getPlatform ? Capacitor.getPlatform() : 'unknown'));
        addLog('Платформа: ' + (Capacitor.getPlatform ? Capacitor.getPlatform() : 'web'));
    } else {
        addLog('Capacitor не обнаружен! Приложение работает в браузере.');
    }
    
    await checkPlugins();
    
    // Назначаем обработчики
    const pickBtn = document.getElementById('pickBtn');
    const saveBtn = document.getElementById('saveBtn');
    const shareBtn = document.getElementById('shareBtn');
    const resetBtn = document.getElementById('resetBtn');
    
    if (pickBtn) pickBtn.onclick = selectImage;
    if (saveBtn) saveBtn.onclick = saveImage;
    if (shareBtn) shareBtn.onclick = shareImage;
    if (resetBtn) resetBtn.onclick = reset;
    
    addLog('Обработчики событий назначены');
    
    if (isCapacitorAvailable()) {
        updateStatus('✅ Приложение готово к работе! Нажмите "ВЫБРАТЬ ИЗОБРАЖЕНИЕ"');
    } else {
        updateStatus('⚠️ Приложение запущено в браузере. Установите APK на телефон для тестирования!', true);
        document.getElementById('pickBtn').disabled = true;
    }
}

// Запускаем инициализацию после загрузки страницы
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
