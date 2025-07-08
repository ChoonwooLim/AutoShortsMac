/**
 * 옵션 모달 관리 시스템
 * 5개 카테고리별 버튼과 모달을 관리합니다.
 */

// 옵션 데이터 관리
const optionData = {
    video: {
        autoHighlight: true,
        autoCrop: true,
        colorCorrection: true,
        videoStabilization: false
    },
    audio: {
        removeSilence: true,
        enhanceAudio: true,
        noiseReduction: true
    },
    features: {
        addTitle: false,
        addSubtitles: false,
        addEffects: false
    },
    face: {
        faceAnalysisEnable: false,
        faceTracking: false,
        expressionAnalysis: false,
        multiplePersons: false
    },
    shorts: {
        shortsLength: 60,
        shortsCount: 1
    },
    storage: {
        outputFolder: '',
        autoSave: false,
        fileNaming: 'timestamp',
        customName: ''
    }
};

/**
 * 모달 관리 클래스
 */
class OptionsModalManager {
    constructor() {
        this.initializeEventListeners();
        this.updateAllCounters();
        this.syncWithHiddenInputs();
    }

    /**
     * 이벤트 리스너 초기화
     */
    initializeEventListeners() {
        // 옵션 버튼 클릭 이벤트
        document.querySelectorAll('.option-button').forEach(button => {
            button.addEventListener('click', (e) => {
                const category = e.currentTarget.dataset.category;
                this.openModal(category);
            });
        });

        // 모달 닫기 이벤트
        document.querySelectorAll('.modal-close, .modal-btn.secondary').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                const modal = e.target.closest('.option-modal');
                if (modal) {
                    this.closeModal(modal.id);
                }
            });
        });

        // 모달 배경 클릭으로 닫기
        document.querySelectorAll('.option-modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal.id);
                }
            });
        });

        // 파일명 형식 변경 이벤트
        const fileNamingSelect = document.getElementById('modal-fileNaming');
        if (fileNamingSelect) {
            fileNamingSelect.addEventListener('change', (e) => {
                const customContainer = document.getElementById('modal-customNameContainer');
                if (customContainer) {
                    customContainer.style.display = e.target.value === 'custom' ? 'block' : 'none';
                }
            });
        }

        // 폴더 선택 버튼
        const folderBtn = document.getElementById('modal-selectFolderBtn');
        if (folderBtn) {
            folderBtn.addEventListener('click', () => {
                // 실제 구현에서는 파일 시스템 API를 사용하거나 서버 통신
                const folder = prompt('저장할 폴더 경로를 입력하세요:', 'C:\\AutoShorts\\Output');
                if (folder) {
                    document.getElementById('modal-outputFolder').value = folder;
                }
            });
        }
    }

    /**
     * 모달 열기
     */
    openModal(category) {
        const modalId = this.getCategoryModalId(category);
        const modal = document.getElementById(modalId);
        
        if (modal) {
            // 현재 설정을 모달에 적용
            this.syncModalWithData(category);
            modal.style.display = 'block';
            
            // 모달이 열릴 때 애니메이션
            setTimeout(() => {
                modal.style.opacity = '1';
            }, 10);
        }
    }

    /**
     * 모달 닫기
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    /**
     * 카테고리별 모달 ID 반환
     */
    getCategoryModalId(category) {
        const modalIds = {
            video: 'videoProcessingModal',
            audio: 'audioProcessingModal',
            features: 'additionalFeaturesModal',
            face: 'faceAnalysisModal',
            shorts: 'shortsSettingsModal',
            storage: 'storageManagementModal'
        };
        return modalIds[category];
    }

    /**
     * 데이터를 모달에 동기화
     */
    syncModalWithData(category) {
        const data = optionData[category];
        
        if (category === 'video') {
            document.getElementById('modal-autoHighlight').checked = data.autoHighlight;
            document.getElementById('modal-autoCrop').checked = data.autoCrop;
            document.getElementById('modal-colorCorrection').checked = data.colorCorrection;
            document.getElementById('modal-videoStabilization').checked = data.videoStabilization;
        } else if (category === 'audio') {
            document.getElementById('modal-removeSilence').checked = data.removeSilence;
            document.getElementById('modal-enhanceAudio').checked = data.enhanceAudio;
            document.getElementById('modal-noiseReduction').checked = data.noiseReduction;
        } else if (category === 'features') {
            document.getElementById('modal-addTitle').checked = data.addTitle;
            document.getElementById('modal-addSubtitles').checked = data.addSubtitles;
            document.getElementById('modal-addEffects').checked = data.addEffects;
        } else if (category === 'face') {
            document.getElementById('modal-faceAnalysisEnable').checked = data.faceAnalysisEnable;
            document.getElementById('modal-faceTracking').checked = data.faceTracking;
            document.getElementById('modal-expressionAnalysis').checked = data.expressionAnalysis;
            document.getElementById('modal-multiplePersons').checked = data.multiplePersons;
        } else if (category === 'shorts') {
            document.getElementById('modal-shortsLength').value = data.shortsLength;
            document.getElementById('modal-shortsCountNum').value = data.shortsCount;
        } else if (category === 'storage') {
            document.getElementById('modal-outputFolder').value = data.outputFolder;
            document.getElementById('modal-autoSave').checked = data.autoSave;
            document.getElementById('modal-fileNaming').value = data.fileNaming;
            document.getElementById('modal-customName').value = data.customName;
            
            // 커스텀 이름 컨테이너 표시/숨김
            const customContainer = document.getElementById('modal-customNameContainer');
            if (customContainer) {
                customContainer.style.display = data.fileNaming === 'custom' ? 'block' : 'none';
            }
        }
    }

    /**
     * 모달에서 데이터로 동기화
     */
    syncDataWithModal(category) {
        const data = optionData[category];
        
        if (category === 'video') {
            data.autoHighlight = document.getElementById('modal-autoHighlight').checked;
            data.autoCrop = document.getElementById('modal-autoCrop').checked;
            data.colorCorrection = document.getElementById('modal-colorCorrection').checked;
            data.videoStabilization = document.getElementById('modal-videoStabilization').checked;
        } else if (category === 'audio') {
            data.removeSilence = document.getElementById('modal-removeSilence').checked;
            data.enhanceAudio = document.getElementById('modal-enhanceAudio').checked;
            data.noiseReduction = document.getElementById('modal-noiseReduction').checked;
        } else if (category === 'features') {
            data.addTitle = document.getElementById('modal-addTitle').checked;
            data.addSubtitles = document.getElementById('modal-addSubtitles').checked;
            data.addEffects = document.getElementById('modal-addEffects').checked;
        } else if (category === 'face') {
            data.faceAnalysisEnable = document.getElementById('modal-faceAnalysisEnable').checked;
            data.faceTracking = document.getElementById('modal-faceTracking').checked;
            data.expressionAnalysis = document.getElementById('modal-expressionAnalysis').checked;
            data.multiplePersons = document.getElementById('modal-multiplePersons').checked;
        } else if (category === 'shorts') {
            data.shortsLength = parseInt(document.getElementById('modal-shortsLength').value);
            data.shortsCount = parseInt(document.getElementById('modal-shortsCountNum').value);
        } else if (category === 'storage') {
            data.outputFolder = document.getElementById('modal-outputFolder').value;
            data.autoSave = document.getElementById('modal-autoSave').checked;
            data.fileNaming = document.getElementById('modal-fileNaming').value;
            data.customName = document.getElementById('modal-customName').value;
        }
    }

    /**
     * 숨겨진 입력 요소와 동기화
     */
    syncWithHiddenInputs() {
        // 영상 처리
        const videoData = optionData.video;
        document.getElementById('autoHighlight').checked = videoData.autoHighlight;
        document.getElementById('autoCrop').checked = videoData.autoCrop;
        document.getElementById('colorCorrection').checked = videoData.colorCorrection;
        document.getElementById('videoStabilization').checked = videoData.videoStabilization;

        // 오디오 처리
        const audioData = optionData.audio;
        document.getElementById('removeSilence').checked = audioData.removeSilence;
        document.getElementById('enhanceAudio').checked = audioData.enhanceAudio;
        document.getElementById('noiseReduction').checked = audioData.noiseReduction;

        // 추가 기능
        const featuresData = optionData.features;
        document.getElementById('addTitle').checked = featuresData.addTitle;
        document.getElementById('addSubtitles').checked = featuresData.addSubtitles;
        document.getElementById('addEffects').checked = featuresData.addEffects;

        // 숏츠 설정
        const shortsData = optionData.shorts;
        document.getElementById('shortsLength').value = shortsData.shortsLength;
        document.getElementById('shortsCount').value = shortsData.shortsCount;

        // 저장 관리
        const storageData = optionData.storage;
        document.getElementById('outputFolder').value = storageData.outputFolder;
        document.getElementById('autoSave').checked = storageData.autoSave;
        document.getElementById('fileNaming').value = storageData.fileNaming;
        document.getElementById('customName').value = storageData.customName;
    }

    /**
     * 카운터 업데이트
     */
    updateCounter(category) {
        const data = optionData[category];
        let count = '';

        if (category === 'video') {
            const checkedCount = Object.values(data).filter(v => v).length;
            count = `${checkedCount}개 선택됨`;
        } else if (category === 'audio') {
            const checkedCount = Object.values(data).filter(v => v).length;
            count = `${checkedCount}개 선택됨`;
        } else if (category === 'features') {
            const checkedCount = Object.values(data).filter(v => v).length;
            count = `${checkedCount}개 선택됨`;
        } else if (category === 'face') {
            const checkedCount = Object.values(data).filter(v => v).length;
            if (checkedCount > 0) {
                count = '활성화됨';
            } else {
                count = '비활성화';
            }
        } else if (category === 'shorts') {
            count = `${data.shortsLength}초, ${data.shortsCount}개`;
        } else if (category === 'storage') {
            if (data.outputFolder) {
                count = '설정 완료';
            } else {
                count = '설정 필요';
            }
        }

        // 카운터 업데이트 - ID 매핑 수정
        const counterIdMap = {
            video: 'videoCount',
            audio: 'audioCount', 
            features: 'featuresCount',
            face: 'faceCount',
            shorts: 'shortsCount',
            storage: 'storageCount'
        };
        
        const counterId = counterIdMap[category];
        const counterElement = document.getElementById(counterId);
        if (counterElement) {
            counterElement.textContent = count;
        }
    }

    /**
     * 모든 카운터 업데이트
     */
    updateAllCounters() {
        ['video', 'audio', 'features', 'face', 'shorts', 'storage'].forEach(category => {
            this.updateCounter(category);
        });
    }

    /**
     * 옵션 적용 (카테고리별)
     */
    applyOptions(category) {
        // 모달에서 데이터로 동기화
        this.syncDataWithModal(category);
        
        // 숨겨진 입력 요소 업데이트
        this.syncWithHiddenInputs();
        
        // 카운터 업데이트
        this.updateCounter(category);
        
        // 얼굴분석 특별 처리 - 갤러리 컨테이너 표시/숨김
        if (category === 'face') {
            const faceGalleryContainer = document.getElementById('faceGalleryContainer');
            if (faceGalleryContainer) {
                if (optionData.face.faceAnalysisEnable) {
                    faceGalleryContainer.style.display = 'block';
                    console.log('🎭 얼굴 분석 갤러리가 활성화되었습니다.');
                } else {
                    faceGalleryContainer.style.display = 'none';
                    console.log('🎭 얼굴 분석 갤러리가 비활성화되었습니다.');
                }
            }
        }
        
        // 모달 닫기
        const modalId = this.getCategoryModalId(category);
        this.closeModal(modalId);
        
        console.log(`✅ ${category} 옵션이 적용되었습니다:`, optionData[category]);
    }
}

// 전역 적용 함수들 (HTML의 onclick에서 호출)
function applyVideoProcessingOptions() {
    if (window.optionsModalManager) {
        window.optionsModalManager.applyOptions('video');
    }
}

function applyAudioProcessingOptions() {
    if (window.optionsModalManager) {
        window.optionsModalManager.applyOptions('audio');
    }
}

function applyAdditionalFeaturesOptions() {
    if (window.optionsModalManager) {
        window.optionsModalManager.applyOptions('features');
    }
}

function applyFaceAnalysisOptions() {
    if (window.optionsModalManager) {
        window.optionsModalManager.applyOptions('face');
    }
}

function applyShortsSettingsOptions() {
    if (window.optionsModalManager) {
        window.optionsModalManager.applyOptions('shorts');
    }
}

function applyStorageManagementOptions() {
    if (window.optionsModalManager) {
        window.optionsModalManager.applyOptions('storage');
    }
}

// 전역 함수로 노출
window.applyVideoProcessingOptions = applyVideoProcessingOptions;
window.applyAudioProcessingOptions = applyAudioProcessingOptions;
window.applyAdditionalFeaturesOptions = applyAdditionalFeaturesOptions;
window.applyFaceAnalysisOptions = applyFaceAnalysisOptions;
window.applyShortsSettingsOptions = applyShortsSettingsOptions;
window.applyStorageManagementOptions = applyStorageManagementOptions;

// 옵션 데이터 접근을 위한 전역 함수
function getOptionData() {
    return optionData;
}

function getCurrentOptions() {
    return {
        // 영상 처리 옵션 - 기존 호환성 유지
        videoProcessing: {
            autoHighlight: optionData.video.autoHighlight,
            autoCrop: optionData.video.autoCrop,
            colorCorrection: optionData.video.colorCorrection,
            videoStabilization: optionData.video.videoStabilization
        },
        // 오디오 처리 옵션
        audioProcessing: {
            removeSilence: optionData.audio.removeSilence,
            enhanceAudio: optionData.audio.enhanceAudio,
            noiseReduction: optionData.audio.noiseReduction
        },
        // 추가 기능
        features: {
            addTitle: optionData.features.addTitle,
            addSubtitles: optionData.features.addSubtitles,
            addEffects: optionData.features.addEffects
        },
        // 배우얼굴분석
        faceAnalysis: {
            faceAnalysisEnable: optionData.face.faceAnalysisEnable,
            faceTracking: optionData.face.faceTracking,
            expressionAnalysis: optionData.face.expressionAnalysis,
            multiplePersons: optionData.face.multiplePersons
        },
        // 숏츠 설정
        settings: {
            shortsLength: optionData.shorts.shortsLength,
            shortsCount: optionData.shorts.shortsCount
        },
        // 저장 관리 설정
        storage: {
            outputFolder: optionData.storage.outputFolder,
            autoSave: optionData.storage.autoSave,
            fileNaming: optionData.storage.fileNaming,
            customName: optionData.storage.customName
        }
    };
}

// 초기화
let optionsModalManager;

// DOM 로드 완료 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    optionsModalManager = new OptionsModalManager();
    // 전역으로 노출
    window.optionsModalManager = optionsModalManager;
    window.getOptionData = getOptionData;
    window.getCurrentOptions = getCurrentOptions;
    console.log('🎛️ 옵션 모달 관리자 초기화 완료');
});

// 모듈 내보내기
export { optionsModalManager, getOptionData, getCurrentOptions }; 