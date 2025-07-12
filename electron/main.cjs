const { app, BrowserWindow, Menu, dialog, shell, ipcMain, safeStorage } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const apiKeyStorePath = path.join(app.getPath('userData'), 'apiKeys');
if (!fs.existsSync(apiKeyStorePath)) {
    fs.mkdirSync(apiKeyStorePath);
}
console.log('🔑 API 키 저장 경로:', apiKeyStorePath);

// 개발 모드 확인 - 더 정확한 판단 로직
const isDev = process.env.NODE_ENV === 'development' || 
              (!app.isPackaged && process.defaultApp) ||
              (process.argv.length >= 2 && process.argv[1].indexOf('app.asar') === -1);

let mainWindow;
let viteProcess;

console.log('🔧 실행 모드:', isDev ? 'Development' : 'Production');
console.log('🔧 app.isPackaged:', app.isPackaged);
console.log('🔧 __dirname:', __dirname);

// 메인 윈도우 생성
function createWindow() {
    // 윈도우 생성
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false,
            preload: path.join(__dirname, 'preload.cjs'),
            webSecurity: false // API 호출을 위해 일시적으로 비활성화
        },
        icon: path.join(__dirname, '../image/AutoShortsIco.ico'),
        title: 'AutoShorts Desktop',
        titleBarStyle: 'default',
        show: false // 로딩 완료 후 표시
    });

    // 추가 보안 헤더 설정
    mainWindow.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
        const { url } = details;
        // API 엔드포인트에 대해서만 헤더 수정
        if (url.includes('api.anthropic.com') || 
            url.includes('api.openai.com') || 
            url.includes('generativelanguage.googleapis.com') || 
            url.includes('api.groq.com')) {
            delete details.requestHeaders['Origin'];
            delete details.requestHeaders['Referer'];
        }
        callback({ requestHeaders: details.requestHeaders });
    });
    
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Access-Control-Allow-Origin': ['*'],
                'Access-Control-Allow-Headers': ['*']
            }
        });
    });

    // 윈도우 로딩 완료 후 표시
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        
        // 개발자 도구는 수동으로 열기 (F12 또는 메뉴에서)
        // if (isDev) {
        //     mainWindow.webContents.openDevTools();
        // }
    });

    // 개발 모드와 프로덕션 모드에 따른 로딩
    if (isDev) {
        // 개발 모드: Vite 서버에 연결
        console.log('🔧 개발 모드: Vite 서버에 연결 중...');
        mainWindow.loadURL('http://localhost:5173');
    } else {
        // 프로덕션 모드: 빌드된 파일 로드
        console.log('🔧 프로덕션 모드: 빌드된 파일 로드 중...');
        
        // 가능한 경로들
        const possiblePaths = [
            path.join(__dirname, '../dist/index.html'),     // 개발 시 구조
            path.join(__dirname, '../../dist/index.html'),  // 패키지된 앱 구조
            path.join(__dirname, '../app/index.html'),      // electron-builder 대체 구조
            path.join(process.resourcesPath, 'app/dist/index.html'), // 리소스 경로
            path.join(process.resourcesPath, 'dist/index.html')      // 리소스 경로 2
        ];
        
        let foundPath = null;
        for (const testPath of possiblePaths) {
            console.log('🔧 경로 확인 중:', testPath);
            if (fs.existsSync(testPath)) {
                console.log('✅ 파일 발견:', testPath);
                foundPath = testPath;
                break;
            }
        }
        
        if (foundPath) {
            mainWindow.loadFile(foundPath);
        } else {
            console.error('❌ 모든 경로에서 index.html을 찾을 수 없습니다');
            console.log('📁 현재 디렉토리 구조:');
            try {
                const currentDir = path.dirname(__dirname);
                console.log('🔧 현재 위치:', currentDir);
                const files = fs.readdirSync(currentDir);
                console.log('📁 디렉토리 내용:', files);
            } catch (err) {
                console.error('📁 디렉토리 읽기 오류:', err);
            }
        }
    }

    // 윈도우 닫힐 때
    mainWindow.on('closed', () => {
        mainWindow = null;
        if (viteProcess) {
            viteProcess.kill();
        }
    });

    // 외부 링크는 기본 브라우저에서 열기
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

// API 키 저장을 위한 IPC 핸들러
ipcMain.handle('save-api-key', (event, { provider, apiKey }) => {
    if (!safeStorage.isEncryptionAvailable()) {
        console.error('Safe Storage is not available. The login keychain might be locked.');
        return { 
            success: false, 
            error: '암호화를 사용할 수 없습니다. Mac의 "로그인" 키체인이 잠겨있거나 사용할 수 없는 상태일 수 있습니다. 키체인 접근을 허용하고 다시 시도해주세요.' 
        };
    }
    try {
        const encryptedKey = safeStorage.encryptString(apiKey);
        const filePath = path.join(apiKeyStorePath, `${provider}.key`);
        fs.writeFileSync(filePath, encryptedKey);
        return { success: true };
    } catch (error) {
        console.error(`Failed to save API key for ${provider}:`, error);
        return { success: false, error: error.message };
    }
});

// API 키 로드를 위한 IPC 핸들러
ipcMain.handle('load-api-key', (event, provider) => {
    if (!safeStorage.isEncryptionAvailable()) {
        console.warn('Safe Storage is not available for decryption.');
        // 키를 로드할 수 없음을 알리지만, 오류로 처리하지는 않음
        return { success: true, apiKey: null };
    }
    try {
        const filePath = path.join(apiKeyStorePath, `${provider}.key`);
        if (fs.existsSync(filePath)) {
            const encryptedKey = fs.readFileSync(filePath);
            const decryptedKey = safeStorage.decryptString(encryptedKey);
            return { success: true, apiKey: decryptedKey };
        }
        return { success: true, apiKey: null }; // 키가 없는 경우
    } catch (error) {
        console.error(`Failed to load API key for ${provider}:`, error);
        return { success: false, error: error.message };
    }
});

// API 키 삭제를 위한 IPC 핸들러
ipcMain.handle('delete-api-key', (event, provider) => {
    try {
        const filePath = path.join(apiKeyStorePath, `${provider}.key`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        return { success: true };
    } catch (error) {
        console.error(`Failed to delete API key for ${provider}:`, error);
        return { success: false, error: error.message };
    }
});

// 저장된 모든 API 키 존재 여부 확인
ipcMain.handle('get-all-api-keys', (event) => {
    try {
        const files = fs.readdirSync(apiKeyStorePath);
        const providers = files.map(file => path.basename(file, '.key'));
        const keyStatus = {};
        providers.forEach(provider => {
            keyStatus[provider] = true;
        });
        return { success: true, keys: keyStatus };
    } catch (error) {
        console.error('Failed to get all API keys:', error);
        return { success: false, error: error.message };
    }
});


// 앱 준비 완료
app.whenReady().then(() => {
    createWindow();
    createMenu();

    // macOS에서 독 아이콘 클릭 시 윈도우 재생성
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// 모든 윈도우가 닫혔을 때
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// 메뉴 생성
function createMenu() {
    const template = [
        {
            label: '파일',
            submenu: [
                {
                    label: '새 프로젝트',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow.webContents.send('new-project');
                    }
                },
                {
                    label: '영상 열기',
                    accelerator: 'CmdOrCtrl+O',
                    click: async () => {
                        const result = await dialog.showOpenDialog(mainWindow, {
                            properties: ['openFile'],
                            filters: [
                                { name: 'Video Files', extensions: ['mp4', 'avi', 'mov', 'mkv', 'webm'] },
                                { name: 'All Files', extensions: ['*'] }
                            ]
                        });
                        
                        if (!result.canceled && result.filePaths.length > 0) {
                            mainWindow.webContents.send('file-selected', result.filePaths[0]);
                        }
                    }
                },
                { type: 'separator' },
                {
                    label: '설정',
                    accelerator: 'CmdOrCtrl+,',
                    click: () => {
                        mainWindow.webContents.send('open-settings');
                    }
                },
                { type: 'separator' },
                {
                    label: '종료',
                    accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: '편집',
            submenu: [
                { label: '실행 취소', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
                { label: '다시 실행', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
                { type: 'separator' },
                { label: '잘라내기', accelerator: 'CmdOrCtrl+X', role: 'cut' },
                { label: '복사', accelerator: 'CmdOrCtrl+C', role: 'copy' },
                { label: '붙여넣기', accelerator: 'CmdOrCtrl+V', role: 'paste' },
                { label: '모두 선택', accelerator: 'CmdOrCtrl+A', role: 'selectall' }
            ]
        },
        {
            label: '보기',
            submenu: [
                { label: '새로고침', accelerator: 'CmdOrCtrl+R', role: 'reload' },
                { label: '강제 새로고침', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
                { label: '개발자 도구', accelerator: 'F12', role: 'toggleDevTools' },
                { type: 'separator' },
                {
                    label: '다크 모드 전환',
                    accelerator: 'CmdOrCtrl+Shift+D',
                    click: () => {
                        mainWindow.webContents.send('toggle-dark-mode');
                    }
                },
                { type: 'separator' },
                { label: '실제 크기', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
                { label: '확대', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
                { label: '축소', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
                { type: 'separator' },
                { label: '전체화면', accelerator: 'F11', role: 'togglefullscreen' }
            ]
        },
        {
            label: '도구',
            submenu: [
                {
                    label: '작업 로그',
                    accelerator: 'CmdOrCtrl+L',
                    click: () => {
                        mainWindow.webContents.send('open-work-log');
                    }
                },
                {
                    label: 'AI 연결 테스트',
                    click: () => {
                        mainWindow.webContents.send('test-ai-connection');
                    }
                },
                { type: 'separator' },
                {
                    label: '앱 데이터 폴더 열기',
                    click: () => {
                        const userDataPath = app.getPath('userData');
                        shell.openPath(userDataPath);
                    }
                }
            ]
        },
        {
            label: '도움말',
            submenu: [
                {
                    label: 'AutoShorts 정보',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'AutoShorts Desktop',
                            message: 'AutoShorts Desktop',
                            detail: `버전: 1.0.0\n\nAI 기반 자동 숏츠 제작 도구\n\n개발: Twinverse`,
                            buttons: ['확인']
                        });
                    }
                },
                {
                    label: '키보드 단축키',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: '키보드 단축키',
                            message: '주요 단축키',
                            detail: `새 프로젝트: Ctrl+N\n영상 열기: Ctrl+O\n설정: Ctrl+,\n작업 로그: Ctrl+L\n새로고침: Ctrl+R\n개발자 도구: F12\n전체화면: F11`,
                            buttons: ['확인']
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// IPC 핸들러들
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

ipcMain.handle('get-user-data-path', () => {
    return app.getPath('userData');
});

ipcMain.handle('show-save-dialog', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, options);
    return result;
});

ipcMain.handle('show-open-dialog', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, options);
    return result;
});

ipcMain.handle('shell-open-path', async (event, path) => {
    return await shell.openPath(path);
});

ipcMain.handle('show-directory-dialog', async () => {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'createDirectory'],
        title: '저장할 폴더를 선택하세요'
    });
    if (filePaths && filePaths.length > 0) {
        return filePaths[0];
    }
    return null;
});

// 애플리케이션 종료 전 정리
app.on('before-quit', () => {
    if (viteProcess) {
        viteProcess.kill();
    }
});

// 보안 강화
app.on('web-contents-created', (event, contents) => {
    contents.on('new-window', (event, navigationUrl) => {
        event.preventDefault();
        shell.openExternal(navigationUrl);
    });
}); 