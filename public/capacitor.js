// Capacitor v5 runtime
(function(win) {
    // Проверяем, загружен ли Capacitor
    if (typeof win.Capacitor === 'undefined') {
        console.log('Capacitor runtime not loaded yet');
        
        // Создаем заглушку для отладки
        win.Capacitor = {
            isNativePlatform: function() { return false; },
            getPlatform: function() { return 'web'; },
            Plugins: {}
        };
        
        // Добавляем заглушки для плагинов
        const plugins = ['Camera', 'Filesystem', 'Share'];
        plugins.forEach(plugin => {
            win.Capacitor.Plugins[plugin] = {
                getPhoto: function() { throw new Error('Plugin not loaded'); },
                readFile: function() { throw new Error('Plugin not loaded'); },
                writeFile: function() { throw new Error('Plugin not loaded'); },
                share: function() { throw new Error('Plugin not loaded'); }
            };
        });
    }
    
    // Добавляем глобальные константы, если их нет
    if (typeof win.CameraResultType === 'undefined') {
        win.CameraResultType = { Uri: 'uri' };
        win.CameraSource = { Photos: 'PHOTOS' };
        win.Directory = { Data: 'DATA', Documents: 'DOCUMENTS', Downloads: 'DOWNLOADS', Cache: 'CACHE' };
    }
    
    console.log('Capacitor helper loaded');
})(window);
