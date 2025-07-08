const { contextBridge, ipcRenderer } = require('electron');

// Electron API를 웹 페이지에 안전하게 노출
contextBridge.exposeInMainWorld('electronAPI', {
    // 앱 정보
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getUserDataPath: () => ipcRenderer.invoke('get-user-data-path'),
    
    // 파일 시스템 대화상자
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),

    // 파일 시스템 API
    writeFile: (filePath, data) => ipcRenderer.invoke('fs-write-file', filePath, data),
    readFile: (filePath) => ipcRenderer.invoke('fs-read-file', filePath),
    
    // 시스템 연동
    openPath: (path) => ipcRenderer.invoke('shell-open-path', path),
    
    // 테마 관리
    getTheme: () => ipcRenderer.invoke('get-theme'),
    setTheme: (theme) => ipcRenderer.invoke('set-theme', theme),
    
    // 알림
    showNotification: (title, body) => {
        if (Notification.permission === 'granted') {
            new Notification(title, { body });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(title, { body });
                }
            });
        }
    },
    
        // 이벤트 리스너
    onNewProject: (callback) => ipcRenderer.on('new-project', callback),
    onFileSelected: (callback) => ipcRenderer.on('file-selected', callback),
    onLoadProject: (callback) => ipcRenderer.on('load-project', callback),
    onSaveProject: (callback) => ipcRenderer.on('save-project', callback),
    onOpenSettings: (callback) => ipcRenderer.on('open-settings', callback),
    onOpenWorkLog: (callback) => ipcRenderer.on('open-work-log', callback),
    onOpenApiKeyManager: (callback) => ipcRenderer.on('open-api-key-manager', callback),
    onTestAIConnection: (callback) => ipcRenderer.on('test-ai-connection', callback),
    onToggleDarkMode: (callback) => ipcRenderer.on('toggle-dark-mode', callback),
    onThemeChanged: (callback) => ipcRenderer.on('theme-changed', callback),
    
    // 이벤트 리스너 제거
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
    
    // 플랫폼 정보
    platform: process.platform,
    isElectron: true
});

// 데스크톱 특화 기능들
contextBridge.exposeInMainWorld('desktopAPI', {
    // 파일 드래그 앤 드롭 지원
    isDragAndDropSupported: true,
    
    // 네이티브 메뉴 지원
    hasNativeMenu: true,
    
    // 시스템 트레이 지원 (나중에 구현 가능)
    hasSystemTray: false,
    
    // 자동 업데이트 지원 (나중에 구현 가능)
    hasAutoUpdate: false,
    
    // 데스크톱 알림
    showNotification: (title, body) => {
        if (Notification.permission === 'granted') {
            new Notification(title, { body });
        }
    }
});

// 개발 모드에서 디버깅 정보 제공
if (process.env.NODE_ENV === 'development') {
    contextBridge.exposeInMainWorld('debugAPI', {
        log: (...args) => console.log('[Preload]', ...args),
        electronVersion: process.versions.electron,
        nodeVersion: process.versions.node,
        chromeVersion: process.versions.chrome
    });
}

// 초기화 완료 시그널
window.addEventListener('DOMContentLoaded', () => {
    console.log('🖥️ AutoShorts Desktop - Electron Preload 로드 완료 (웹 UI 유지)');
    
    // 데스크톱 환경 표시 (최소한의 클래스만 추가)
    document.body.classList.add('desktop-app');
    
    // 웹 UI 유지 표시
    console.log('🎨 기존 웹 UI 스타일 유지 - 데스크톱 기능만 추가');
    
    // 앱 버전 표시 (개발 모드에서만)
    if (process.env.NODE_ENV === 'development') {
        console.log(`📱 앱 버전: ${process.env.npm_package_version || '개발 중'}`);
        console.log(`⚡ Electron: ${process.versions.electron}`);
        console.log(`🔧 Node.js: ${process.versions.node}`);
        console.log(`🎨 UI 모드: 웹 호환 (95% 동일)`);
    }
}); 