// --- Main Application Entry Point ---

// 필수 모듈만 즉시 로드
import { googleConfig } from './config.js';
import { state } from './state.js';
import { initializeApiManagement } from './api.js';

// 성능 최적화 유틸리티 (필수)
import eventManager from './utils/event-manager.js';
import memoryManager from './utils/memory-manager.js';
import lazyLoader from './utils/lazy-loader.js';
import performanceMonitor from './utils/performance-monitor.js';

// state를 window에 할당하여 전역 접근 가능하게 함
window.state = state;

// 신규: 프로젝트 관리 함수 직접 임포트
import { saveProject, loadProject } from './project-manager.js';

/**
 * Initializes the entire application with lazy loading optimization.
 */
async function main() {
    console.log('🚀 AutoShorts Desktop 애플리케이션 초기화 시작');
    
    try {
        // 1. 성능 모니터링 시작
        performanceMonitor.startMonitoring();
        
        // 2. 메모리 관리자 초기화
        memoryManager.startMonitoring();
        
        // 3. 테마 적용 (즉시)
        initializeTheme();
        
        // 3.5. API 키 초기화 (완료될 때까지 기다림)
        await initializeApiManagement();
        console.log('🔑 저장된 API 키들을 로드했습니다');

        // --- API 초기화 후 순차 실행 보장 ---
        
        // 3.6. 작업 로그 초기화
        const { workLogManager } = await import('./state.js');
        workLogManager.loadWorkLogs();
        workLogManager.addWorkLog('settings', 'AutoShorts 애플리케이션 시작', { 
            version: '1.0.0',
            browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other'
        });
        
        console.log('📝 작업 로그 시스템 초기화 완료');
        
        // 3.7. Electron 환경 감지 및 초기화
        if (window.electronAPI && window.electronAPI.isElectron) {
            console.log('🖥️ Electron 데스크톱 환경 감지됨 (웹 UI 유지)');
            initializeElectronFeatures();
            workLogManager.addWorkLog('settings', 'Electron 데스크톱 모드 시작 (웹 UI 유지)', { 
                platform: window.electronAPI.platform,
                environment: 'desktop-web-ui'
            });
        } else {
            console.log('🌐 웹 브라우저 환경');
            workLogManager.addWorkLog('settings', '웹 브라우저 모드 시작', { 
                userAgent: navigator.userAgent,
                environment: 'web'
            });
        }
        
        // 3.8. AudioUtils 미리 로드
        try {
            const audioUtilsModule = await import('./utils/audio-utils.js');
            window.audioUtils = audioUtilsModule.default || audioUtilsModule;
            console.log('🎵 AudioUtils 미리 로드 완료');
        } catch (audioUtilsError) {
            console.warn('⚠️ AudioUtils 미리 로드 실패, 필요시 동적 로드됩니다:', audioUtilsError.message);
        }
        
        // 4. 중요 모듈 우선 로딩
        performanceMonitor.startModuleTimer('critical-modules');
        await lazyLoader.preloadCriticalModules();
        performanceMonitor.endModuleTimer('critical-modules');
        
        // 5. 필수 UI 모듈 로드
        performanceMonitor.startModuleTimer('ui-modules');
        const { initializeSettingsUI, setupSettingsEventListeners } = await lazyLoader.loadModule('ui-settings', () => import('./ui-settings.js'));
        performanceMonitor.endModuleTimer('ui-modules');
        
        // 6. 기본 UI 초기화 (병렬)
        performanceMonitor.startModuleTimer('ui-initialization');
        await Promise.all([
            initializeSettingsUI(),
            setupSettingsEventListeners() // setupSettingsEventListeners는 initializeSettingsUI와 함께 로드됨
      ]);
        performanceMonitor.endModuleTimer('ui-initialization');
        console.log('✅ 기본 UI 설정 초기화 완료');

        // 7. 모든 비동기 UI 초기화 후, 동기적인 이벤트 리스너 설정
        // setupProjectEventListeners(); // 더 이상 사용하지 않으므로 제거
        console.log('✅ 주요 이벤트 리스너 설정 완료');
        
        // 8. Google 설정 확인
        if (!googleConfig.clientId) {
            console.warn('⚠️ Google Client ID가 설정되지 않았습니다. 설정 페이지에서 구성해주세요.');
        }
        
        // 9. 나머지 모듈들을 백그라운드에서 프리로드
        setupBackgroundPreloading();
        
        // 10. 초기화 완료 및 성능 리포트
        console.log(`🎯 AutoShorts Desktop 기본 초기화 완료 - 추가 기능은 필요시 로드됩니다`);
        console.log(`📊 등록된 이벤트 리스너: ${eventManager.getListenerCount()}개`);
        memoryManager.generateMemoryReport();
        
        // 10초 후 성능 리포트 생성
        setTimeout(() => {
            performanceMonitor.generateReport();
        }, 10000);
        
    } catch (error) {
        console.error('❌ 애플리케이션 초기화 실패:', error);
        
        // 에러 처리 모듈 로드 시도
        try {
            const errorHandlerModule = await lazyLoader.loadErrorHandler();
            if (errorHandlerModule && errorHandlerModule.default) {
                // 에러 핸들러가 있다면 사용
                errorHandlerModule.default.handleError({
                    type: 'initialization',
                    message: error.message,
                    originalError: error,
                    context: { function: 'main' },
                    severity: 'critical'
                });
            }
        } catch (handlerError) {
            console.error('⚠️ 에러 핸들러 로드 실패, 기본 에러 처리 사용:', handlerError.message);
        }
        
        // 기본 에러 처리 - 사용자에게 알림
        alert(`애플리케이션 초기화에 실패했습니다.\n\n오류: ${error.message}\n\n페이지를 새로고침해주세요.`);
    }
}

/**
 * 테마 초기화 및 이벤트 리스너 설정
 */
function initializeTheme() {
    console.log('🎨 테마 시스템 초기화 시작');
    
    // 저장된 테마 적용
    const savedTheme = localStorage.getItem('theme') || 'light';
    const isDarkMode = savedTheme === 'dark';
    
    // 즉시 테마 적용
    document.body.classList.toggle('dark-mode', isDarkMode);
    console.log(`🎨 저장된 테마 적용: ${isDarkMode ? '다크' : '라이트'} 모드`);
    
    // DOM이 완전히 로드된 후 버튼 초기화
    setTimeout(() => {
        const themeToggle = document.getElementById('theme-toggle');
        console.log('🔍 테마 토글 버튼 찾기:', themeToggle ? '발견' : '없음');
        
        if (themeToggle) {
            // 버튼 텍스트 설정
            themeToggle.textContent = isDarkMode ? '☀️' : '🌙';
            
            // 기존 이벤트 리스너 제거 (중복 방지)
            themeToggle.removeEventListener('click', handleThemeToggle);
            
            // 새 이벤트 리스너 추가
            themeToggle.addEventListener('click', handleThemeToggle);
            
            console.log('✅ 테마 토글 버튼 초기화 완료');
        } else {
            // 테마 토글 버튼이 없어도 정상 - Electron 메뉴로만 테마 전환 가능
            console.log('💡 테마 토글 버튼 없음 - 메뉴에서 다크 모드 전환 가능 (Ctrl+Shift+D)');
        }
    }, 100); // 100ms 지연으로 DOM 완전 로드 보장
}

/**
 * 테마 토글 이벤트 핸들러
 */
function handleThemeToggle() {
    console.log('🎨 테마 토글 버튼 클릭됨');
    
    const newIsDarkMode = document.body.classList.toggle('dark-mode');
    const themeToggle = document.getElementById('theme-toggle');
    
    if (themeToggle) {
        themeToggle.textContent = newIsDarkMode ? '☀️' : '🌙';
    }
    
    localStorage.setItem('theme', newIsDarkMode ? 'dark' : 'light');
    console.log(`🎨 테마 변경 완료: ${newIsDarkMode ? '다크' : '라이트'} 모드`);
}

/**
 * Electron 기능 초기화 (웹 UI 유지)
 */
function initializeElectronFeatures() {
    console.log('🖥️ Electron 기능 초기화 시작 (웹 UI 스타일 유지)');
    
    // 메뉴 이벤트 리스너 설정 (핵심 기능)
    if (window.electronAPI) {
        // 새 프로젝트 (기존 웹 기능과 동일)
        window.electronAPI.onNewProject(() => {
            console.log('📋 메뉴: 새 프로젝트 (웹 기능 재사용)');
            if (window.handleNewChat) {
                window.handleNewChat();
            }
        });
        
        // 파일 선택 (네이티브 파일 대화상자)
        window.electronAPI.onFileSelected((event, filePath) => {
            console.log('📁 메뉴: 파일 선택 (네이티브 대화상자)');
            handleElectronFileUpload(filePath);
        });
        
        // 🚀 신규: 프로젝트 저장/불러오기 메뉴 이벤트 리스너
        window.electronAPI.onSaveProjectTriggered(() => {
            console.log('💾 메뉴: 프로젝트 저장');
            saveProject(); // 직접 함수 호출
        });

        window.electronAPI.onLoadProjectTriggered(() => {
            console.log('📂 메뉴: 프로젝트 불러오기');
            loadProject(); // 직접 함수 호출
        });

        // 설정 열기 (기존 웹 UI 재사용)
        window.electronAPI.onOpenSettings(() => {
            console.log('⚙️ 메뉴: 설정 열기 (기존 웹 모달 재사용)');
            const apiSettingsBtn = document.getElementById('apiSettingsBtn');
            if (apiSettingsBtn) {
                apiSettingsBtn.click();
            }
        });
        
        // 다크 모드 전환
        window.electronAPI.onToggleDarkMode(() => {
            console.log('🎨 메뉴: 다크 모드 전환');
            handleThemeToggle();
        });
        
        // 작업 로그 열기 (기존 웹 UI 재사용)
        window.electronAPI.onOpenWorkLog(() => {
            console.log('📝 메뉴: 작업 로그 열기 (기존 웹 모달 재사용)');
            const workLogBtn = document.getElementById('workLogBtn');
            if (workLogBtn) {
                workLogBtn.click();
            }
        });
        
        // AI 연결 테스트 (기존 웹 기능 재사용)
        window.electronAPI.onTestAIConnection(() => {
            console.log('🔬 메뉴: AI 연결 테스트 (기존 웹 기능 재사용)');
            const testAIBtn = document.getElementById('testAIBtn');
            if (testAIBtn) {
                testAIBtn.click();
            }
        });
    }
    
    // 드래그 앤 드롭 향상 (웹 기능과 통합)
    enhanceDragAndDrop();
    
    // 키보드 단축키 설정 (프로덕티비티 향상)
    setupElectronKeyboardShortcuts();
    
    console.log('✅ Electron 기능 초기화 완료 (웹 UI 95% 유지)');
}

/**
 * Electron 파일 업로드 처리
 */
async function handleElectronFileUpload(filePath) {
    try {
        // 파일 정보 가져오기
        const response = await fetch(`file://${filePath}`);
        const blob = await response.blob();
        
        // File 객체 생성
        const fileName = filePath.split(/[/\\]/).pop();
        const file = new File([blob], fileName, { type: blob.type });
        
        // 기존 파일 업로드 로직 활용
        if (window.loadFileModules) {
            await window.loadFileModules();
        }
        
        // 상태 업데이트
        const { state, workLogManager } = await import('./state.js');
        state.uploadedFile = file;
        
        // 작업 로그 기록
        workLogManager.addWorkLog('upload', `메뉴에서 파일 업로드: ${fileName}`, {
            fileName: fileName,
            fileSize: (blob.size / 1024 / 1024).toFixed(2) + 'MB',
            source: 'electron-menu'
        });
        
        // UI 업데이트
        const fileNameElement = document.getElementById('fileName');
        const fileSizeElement = document.getElementById('fileSize');
        const videoPreview = document.getElementById('videoPreview');
        
        if (fileNameElement) fileNameElement.textContent = fileName;
        if (fileSizeElement) fileSizeElement.textContent = (blob.size / 1024 / 1024).toFixed(2) + ' MB';
        if (videoPreview) {
            videoPreview.src = `file://${filePath}`;
            const videoPreviewSection = document.getElementById('videoPreviewSection');
            if (videoPreviewSection) {
                videoPreviewSection.style.display = 'block';
            }
        }
        
        console.log('✅ Electron 파일 업로드 완료:', fileName);
        
        // 조용한 데스크톱 알림 (선택적)
        if (window.desktopAPI && window.desktopAPI.showNotification && fileName.length < 50) {
            setTimeout(() => {
                window.desktopAPI.showNotification(
                    'AutoShorts',
                    `파일 업로드 완료`
                );
            }, 500);
        }
        
    } catch (error) {
        console.error('❌ Electron 파일 업로드 실패:', error);
        alert('파일 업로드에 실패했습니다: ' + error.message);
    }
}

/**
 * 드래그 앤 드롭 기능 향상 (기존 웹 기능과 통합)
 */
function enhanceDragAndDrop() {
    // 전체 윈도우 드래그 앤 드롭 방지 (Electron에서 파일이 새 윈도우로 열리는 것 방지)
    document.addEventListener('dragover', (e) => {
        e.preventDefault();
    });
    
    document.addEventListener('drop', (e) => {
        e.preventDefault();
        
        if (e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            
            // 비디오 파일만 허용
            if (file.type.startsWith('video/')) {
                console.log('🎬 드래그 앤 드롭으로 비디오 파일 업로드:', file.name);
                
                // 기존 파일 업로드 로직 활용 (웹과 동일한 방식)
                const fileInput = document.getElementById('file-input');
                if (fileInput) {
                    // DataTransfer 객체 생성해서 파일 설정
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    fileInput.files = dataTransfer.files;
                    
                    // 파일 변경 이벤트 트리거 (기존 웹 로직 재사용)
                    fileInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
            } else {
                // 기존 웹과 동일한 알림 방식 사용
                console.warn('지원하지 않는 파일 형식:', file.type);
            }
        }
    });
}

/**
 * Electron 키보드 단축키 설정
 */
function setupElectronKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Ctrl+L: 작업 로그 열기
        if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
            e.preventDefault();
            const workLogBtn = document.getElementById('workLogBtn');
            if (workLogBtn) {
                workLogBtn.click();
            }
        }
        
        // Ctrl+N: 새 대화
        if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
            e.preventDefault();
            if (window.handleNewChat) {
                window.handleNewChat();
            }
        }
        
        // Ctrl+,: 설정 열기
        if ((e.ctrlKey || e.metaKey) && e.key === ',') {
            e.preventDefault();
            const apiSettingsBtn = document.getElementById('apiSettingsBtn');
            if (apiSettingsBtn) {
                apiSettingsBtn.click();
            }
        }
    });
}

/**
 * 백그라운드에서 모듈들을 프리로드
 */
function setupBackgroundPreloading() {
    // 사용자가 사용할 가능성이 높은 모듈들을 큐에 추가
    lazyLoader.addToPreloadQueue('ui-file', () => import('./ui-file.js'));
    lazyLoader.addToPreloadQueue('ui-processing', () => import('./ui-processing.js'));
    lazyLoader.addToPreloadQueue('ui-chat', () => import('./ui-chat.js'));
    lazyLoader.addToPreloadQueue('simple-transcription', () => import('./simple-transcription.js'));
    lazyLoader.addToPreloadQueue('shorts-processing', () => import('./shorts-processing-real.js'));
    
    // 프리로딩 시작 (비동기)
    setTimeout(() => {
        lazyLoader.startPreloading();
    }, 1000); // 1초 후 시작하여 초기 로딩에 영향 없음
}

/**
 * 파일 업로드 기능이 사용될 때 관련 모듈 로드
 */
window.loadFileModules = async function() {
    // 이미 로드되었는지 확인 (중복 방지)
    if (window.loadFileModules.loaded) {
        console.log('📝 파일 모듈이 이미 로드되어 있습니다 (중복 방지)');
        return true;
    }
    
    try {
        console.log('📦 파일 처리 모듈 로드 시작...');
        
        const [
            { setupFileEventListeners },
            { setupProcessingEventListeners, updateProcessButtonState }
        ] = await Promise.all([
            lazyLoader.loadModule('ui-file', () => import('./ui-file.js')),
            lazyLoader.loadModule('ui-processing', () => import('./ui-processing.js'))
        ]);
        
        await Promise.all([
            setupFileEventListeners(),
            setupProcessingEventListeners()
        ]);
        
        updateProcessButtonState();
        
        // 로드 완료 플래그 설정
        window.loadFileModules.loaded = true;
        
        console.log('✅ 파일 처리 모듈 로드 완료');
        return true;
    } catch (error) {
        console.error('❌ 파일 처리 모듈 로드 실패:', error);
        return false;
    }
};

/**
 * 자막 추출 기능이 사용될 때 관련 모듈 로드
 */
window.loadTranscriptionModules = async function() {
    try {
        const { setupSimpleTranscriptionEventListeners } = await lazyLoader.loadModule('simple-transcription', () => import('./simple-transcription.js'));
        await setupSimpleTranscriptionEventListeners();
        
        console.log('✅ 자막 추출 모듈 로드 완료');
        return true;
    } catch (error) {
        console.error('❌ 자막 추출 모듈 로드 실패:', error);
        return false;
    }
};

/**
 * 얼굴 분석 기능이 사용될 때 관련 모듈 로드
 */
window.loadFaceAnalysisModules = async function() {
    try {
        const { loadModels } = await lazyLoader.loadModule('face-detection', () => import('./face-detection.js'));
        await loadModels();
        
        console.log('✅ 얼굴 분석 모듈 로드 완료');
        return true;
    } catch (error) {
        console.error('❌ 얼굴 분석 모듈 로드 실패:', error);
        return false;
    }
};

/**
 * 채팅 기능이 사용될 때 관련 모듈 로드
 */
window.loadChatModules = async function() {
    // 이미 로드되었는지 확인 (중복 방지)
    if (window.loadChatModules.loaded) {
        console.log('💬 채팅 모듈이 이미 로드되어 있습니다 (중복 방지)');
        return true;
    }
    
    try {
        const [
            { setupChatEventListeners, startNewChat },
            { initializeCarousel }
        ] = await Promise.all([
            lazyLoader.loadModule('ui-chat', () => import('./ui-chat.js')),
            lazyLoader.loadModule('shorts-processing', () => import('./shorts-processing-real.js'))
        ]);
        
        await setupChatEventListeners();
        
        // 대화가 없을 때만 새 대화 생성
        if (!state.chats || state.chats.length === 0) {
            console.log('📝 초기 대화 생성');
            startNewChat();
        } else {
            console.log('📚 기존 대화 있음, 새 대화 생성 건너뜀');
        }
        
        initializeCarousel();
        
        // 로드 완료 플래그 설정
        window.loadChatModules.loaded = true;
        
        console.log('✅ 채팅 모듈 로드 완료');
        return true;
    } catch (error) {
        console.error('❌ 채팅 모듈 로드 실패:', error);
        return false;
    }
};

/**
 * 새 대화 시작 (버튼 클릭용)
 */
window.handleNewChat = async function() {
    // 채팅 모듈이 로드되지 않았다면 먼저 로드
    if (!window.loadChatModules.loaded) {
        await window.loadChatModules();
    }
    
    // 채팅 모듈에서 startNewChat 함수 가져오기
    try {
        const { startNewChat } = await lazyLoader.loadModule('ui-chat', () => import('./ui-chat.js'));
        startNewChat();
        console.log('✅ 새 대화 생성됨');
    } catch (error) {
        console.error('❌ 새 대화 생성 실패:', error);
    }
};

// --- Google Auth Initialization ---
// Google API 핸들러 (필요시에만 로드)
window.handleGapiLoaded = async () => {
  try {
    const api = await lazyLoader.loadModule('api', () => import('./api.js'));
    gapi.load('client', api.initializeGapiClient);
  } catch (error) {
    console.error('Google API 초기화 실패:', error);
  }
};

window.handleGisLoaded = async () => {
  try {
    // 보안 개선: 설정 파일에서 안전하게 클라이언트 ID 가져오기
    const googleClientId = googleConfig.getClientId();
    const idInfo = googleConfig.getCurrentIdInfo();
    
    console.log(`🔐 Google 인증 초기화: ${idInfo.source} 클라이언트 ID 사용`);
    
    const api = await lazyLoader.loadModule('api', () => import('./api.js'));
    api.initializeGis(googleClientId);
  } catch (error) {
    console.error('Google Identity Services 초기화 실패:', error);
  }
};

// 전역 테마 함수 (디버깅용)
window.toggleTheme = function() {
    handleThemeToggle();
};

window.setTheme = function(theme) {
    const isDarkMode = theme === 'dark';
    document.body.classList.toggle('dark-mode', isDarkMode);
    localStorage.setItem('theme', theme);
    
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.textContent = isDarkMode ? '☀️' : '🌙';
    }
    
    console.log(`🎨 테마 강제 설정: ${theme} 모드`);
};

// Run the main function when the document is ready.
document.addEventListener('DOMContentLoaded', main);

// V2 얼굴 분석 버튼 리스너 추가
document.addEventListener('DOMContentLoaded', () => {
    const analyzeBtnV2 = document.getElementById('analyzeFacesBtnV2');
    if (analyzeBtnV2) {
        analyzeBtnV2.addEventListener('click', async () => {
            try {
                const analyzer = await import('./face-analyzer-new.js');
                analyzer.startAnalysis();
            } catch (error) {
                console.error('Failed to load or run V2 analysis:', error);
                alert('새로운 얼굴 분석 기능을 실행하는 중 오류가 발생했습니다.');
            }
        });
        console.log('✅ 얼굴 분석 (V2) 버튼 이벤트 리스너 설정 완료');
    }
});