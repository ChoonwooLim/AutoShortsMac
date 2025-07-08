import * as DOM from './dom-elements.js';

const MODEL_URL = './models';

let modelsLoaded = false;

export async function loadModels() {
    if (modelsLoaded) return;
    try {
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL),
            faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL)
        ]);
        modelsLoaded = true;
        console.log("FaceAPI 모델 로딩 완료");
    } catch (error) {
        console.error("FaceAPI 모델 로딩 실패:", error);
    }
}

// 🔄 리팩토링: UIUtils 사용으로 통합된 진행률 함수
function updateProgressBar(progress, text) {
    // 새로운 UIUtils 사용
    if (window.uiUtils) {
        window.uiUtils.updateProgressBar(progress, text);
    }
    
    // 기존 호환성 유지
    DOM.faceProgressFill.style.width = `${progress * 100}%`;
    DOM.faceProgressText.textContent = text || `${Math.round(progress * 100)}%`;
}

// Add event listener for face data generation
function onFaceDataGenerated(faceData) {
    console.log('Face data generated:', faceData);
    // Call AI model for analysis
    analyzeFaceDataWithAI(faceData);
}

// Example function to analyze face data with AI
function analyzeFaceDataWithAI(faceData) {
    // Simple AI analysis logic
    console.log('Analyzing face data with AI:', faceData);
    // Example: Count faces
    const faceCount = faceData.length;
    console.log('Number of faces:', faceCount);
}

function displayActorResults(actors) {
    const actorList = DOM.faceResults;
    actorList.innerHTML = '';

    if (actors.length === 0) {
        actorList.innerHTML = '<p style="text-align: center;">분석된 배우 정보가 없습니다.</p>';
        return;
    }

    actors.forEach(actor => {
        const card = document.createElement('div');
        card.className = 'face-card';
        card.innerHTML = `
            <div class="face-image-container" style="background-image: url('${actor.representativeImg}')"></div>
            <div class="face-info">
                <h4>${actor.label}</h4>
                <p><strong>신뢰도:</strong> ${actor.confidence}%</p>
                <p><strong>등장 횟수:</strong> ${actor.appearances}회</p>
                <p><strong>첫 등장:</strong> ${actor.firstAppearance}</p>
                <p><strong>역할:</strong> ${actor.role}</p>
                <p><strong>나이:</strong> 약 ${actor.age}세</p>
                <p><strong>성별:</strong> ${actor.gender}</p>
                <p><strong>주요 표정:</strong> ${actor.mainExpression}</p>
            </div>
            <div class="face-actions">
                <button class="btn-edit">수정</button>
                <button class="btn-upload">이미지 업로드</button>
                <button class="btn-delete">삭제</button>
            </div>
        `;
        actorList.appendChild(card);
    });
    onFaceDataGenerated(actors);
}

function generateActorInfo(groups) {
    return groups.map((group, index) => {
        const bestDetection = group.detections.sort((a, b) => b.detection.box.area - a.detection.box.area)[0];
        const appearances = group.detections.length;
        const firstAppearance = group.detections.sort((a, b) => a.timestamp - b.timestamp)[0].timestamp;
        
        const age = Math.round(group.detections.reduce((sum, d) => sum + d.age, 0) / appearances);
        
        const gender = group.detections.reduce((acc, d) => {
            acc[d.gender] = (acc[d.gender] || 0) + 1;
            return acc;
        }, {});
        const mainGender = Object.keys(gender).reduce((a, b) => gender[a] > gender[b] ? a : b);

        const expressions = group.detections.reduce((acc, d) => {
            const mainExpression = Object.keys(d.expressions).reduce((a, b) => d.expressions[a] > d.expressions[b] ? a : b);
            acc[mainExpression] = (acc[mainExpression] || 0) + 1;
            return acc;
        }, {});
        const mainExpression = Object.keys(expressions).reduce((a, b) => expressions[a] > expressions[b] ? a : b);

        return {
            id: `actor_${index + 1}`,
            label: `배우 ${index + 1}`,
            representativeImg: bestDetection.canvas.toDataURL(),
            confidence: Math.round(bestDetection.detection.score * 100),
            appearances: appearances,
            firstAppearance: new Date(firstAppearance * 1000).toISOString().substr(11, 8),
            role: '주연', // Placeholder
            age: age,
            gender: mainGender === 'male' ? '남성' : '여성',
            mainExpression: mainExpression
        };
    });
}

function groupByFace(allDetections) {
    const groups = [];
    const distanceThreshold = 0.5; 

    allDetections.forEach(detection => {
        let foundGroup = false;
        for (const group of groups) {
            const representative = group.detections[0];
            const distance = faceapi.euclideanDistance(detection.descriptor, representative.descriptor);
            
            if (distance < distanceThreshold) {
                group.detections.push(detection);
                foundGroup = true;
                break;
            }
        }

        if (!foundGroup) {
            groups.push({ detections: [detection] });
        }
    });
    return groups;
}

export async function analyzeFaces(videoElement) {
    if (!modelsLoaded) {
        console.error("모델이 로드되지 않았습니다.");
        return;
    }

    DOM.analyzeFacesBtn.disabled = true;
    DOM.analyzeFacesBtn.textContent = "분석 중...";
    DOM.analysisProgress.style.display = 'block';
    DOM.faceResults.innerHTML = '';
    updateProgressBar(0, '분석 준비 중...');

    const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });
    const videoDuration = videoElement.duration;
    const sampleCount = Math.min(30, Math.floor(videoDuration));
    const allDetections = [];

    const tempCanvas = document.createElement('canvas');

    for (let i = 0; i < sampleCount; i++) {
        const currentTime = (i / (sampleCount - 1)) * videoDuration;
        videoElement.currentTime = currentTime;
        await new Promise(resolve => {
            videoElement.addEventListener('seeked', () => resolve(), { once: true });
        });

        tempCanvas.width = videoElement.videoWidth;
        tempCanvas.height = videoElement.videoHeight;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(videoElement, 0, 0);

        const detections = await faceapi.detectAllFaces(tempCanvas, options)
            .withFaceLandmarks()
            .withFaceExpressions()
            .withAgeAndGender()
            .withFaceDescriptors();
        
        for (const d of detections) {
            const faceCanvas = document.createElement('canvas');
            const faceCtx = faceCanvas.getContext('2d');
            const { x, y, width, height } = d.detection.box;
            faceCanvas.width = width;
            faceCanvas.height = height;
            faceCtx.drawImage(tempCanvas, x, y, width, height, 0, 0, width, height);

            allDetections.push({ ...d, canvas: faceCanvas, timestamp: currentTime });
        }
        
        updateProgressBar((i + 1) / sampleCount, `영상 분석 중... (${i+1}/${sampleCount})`);
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    if (allDetections.length === 0) {
        updateProgressBar(1, '영상에서 얼굴을 찾지 못했습니다.');
        DOM.analyzeFacesBtn.disabled = false;
        DOM.analyzeFacesBtn.textContent = "얼굴 분석 시작";
        DOM.faceResults.innerHTML = '<p style="text-align: center;">영상에서 얼굴을 찾지 못했습니다.</p>';
        
        // 프로그래스바 숨기기 (3초 후)
        setTimeout(() => {
            DOM.analysisProgress.style.display = 'none';
        }, 3000);
        
        return;
    }

    updateProgressBar(1, '얼굴 그룹화 중...');
    await new Promise(resolve => setTimeout(resolve, 10));

    const faceGroups = groupByFace(allDetections);
    const actors = generateActorInfo(faceGroups);
    displayActorResults(actors);

    updateProgressBar(1, `분석 완료! 총 ${actors.length}명의 배우를 찾았습니다.`);
    DOM.analyzeFacesBtn.disabled = false;
    DOM.analyzeFacesBtn.textContent = "얼굴 분석 시작";
    
    // 프로그래스바 숨기기 (3초 후)
    setTimeout(() => {
        DOM.analysisProgress.style.display = 'none';
    }, 3000);
}

// 외부에서 호출할 수 있는 진입점 함수
export async function startFaceAnalysis() {
    try {
        console.log('🎭 startFaceAnalysis 함수 시작');
        console.log('📊 현재 state:', {
            hasState: !!window.state,
            hasUploadedFile: !!window.state?.uploadedFile,
            fileName: window.state?.uploadedFile?.name
        });
        
        // 모델 로드 확인
        if (!modelsLoaded) {
            console.log('🎭 Face-api.js 모델 로드 중...');
            await loadModels();
        }
        
        // 비디오 엘리먼트 가져오기
        const videoElement = DOM.videoPreview;
        console.log('🎬 비디오 엘리먼트 상태:', {
            element: !!videoElement,
            src: videoElement?.src,
            duration: videoElement?.duration,
            readyState: videoElement?.readyState
        });
        
        if (!videoElement || !videoElement.src) {
            alert('분석할 영상이 없습니다. 먼저 영상을 업로드해주세요.');
            return;
        }
        
        console.log('🎭 얼굴 분석 시작...');
        await analyzeFaces(videoElement);
        
    } catch (error) {
        console.error('❌ 얼굴 분석 중 오류:', error);
        alert('얼굴 분석 중 오류가 발생했습니다.');
        
        // UI 복원
        if (DOM.analyzeFacesBtn) {
            DOM.analyzeFacesBtn.disabled = false;
            DOM.analyzeFacesBtn.textContent = "얼굴 분석 시작";
        }
        if (DOM.analysisProgress) {
            DOM.analysisProgress.style.display = 'none';
        }
    }
} 