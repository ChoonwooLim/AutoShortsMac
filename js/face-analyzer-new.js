// js/face-analyzer-new.js
// face-api.js와 TensorFlow.js v1.7.4를 사용하는 새로운 독립 분석기

const MODEL_URL = './models';
let modelsLoaded = false;
let isAnalyzing = false;

// --- UI Elements ---
let videoEl;
let progressContainer;
let progressText;
let progressBarFill;
let resultsContainer;
let analyzeBtn;

/**
 * 필요한 모델을 로드합니다. 한 번만 실행됩니다.
 */
async function loadModels() {
    if (modelsLoaded) return true;
    console.log('V2 - Loading models...');
    progressText.textContent = 'AI 모델을 로딩 중입니다...';
    progressContainer.style.display = 'block';
    try {
        await faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        modelsLoaded = true;
        console.log('V2 - Models loaded successfully.');
        return true;
    } catch (error) {
        console.error('V2 - Error loading models:', error);
        progressText.textContent = '오류: AI 모델 로딩 실패.';
        return false;
    }
}

/**
 * 분석 결과를 UI에 표시합니다.
 * @param {Array} actors - 감지된 배우 정보 배열
 */
function displayResults(actors) {
    resultsContainer.innerHTML = '';
    if (actors.length === 0) {
        resultsContainer.innerHTML = '<p style="text-align: center; color: #888;">영상에서 얼굴을 찾지 못했습니다.</p>';
        return;
    }

    actors.forEach(actor => {
        const card = document.createElement('div');
        card.className = 'face-card';
        card.innerHTML = `
            <div class="face-image-container" style="background-image: url('${actor.image}')"></div>
            <div class="face-info">
                <h4>${actor.label}</h4>
                <p><strong>등장 횟수:</strong> ${actor.count}회</p>
            </div>
        `;
        resultsContainer.appendChild(card);
    });
}

/**
 * 분석을 시작하는 메인 함수
 */
export async function startAnalysis() {
    if (isAnalyzing) {
        console.warn('V2 - Analysis is already in progress.');
        return;
    }

    // 1. UI 요소 초기화
    videoEl = document.getElementById('videoPreview');
    progressContainer = document.getElementById('analysisProgressV2');
    progressText = document.getElementById('progressTextV2');
    progressBarFill = document.getElementById('progressBarFillV2');
    resultsContainer = document.getElementById('faceResultsV2');
    analyzeBtn = document.getElementById('analyzeFacesBtnV2');
    
    if (!videoEl || !videoEl.src) {
        alert('얼굴 분석을 시작하기 전에 먼저 영상을 업로드해주세요.');
        return;
    }

    isAnalyzing = true;
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = '분석 중...';
    resultsContainer.innerHTML = '';
    
    // 2. 모델 로드
    const modelsReady = await loadModels();
    if (!modelsReady) {
        isAnalyzing = false;
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = '얼굴 분석 (V2)';
        return;
    }

    // 3. 비디오 준비
    if (videoEl.readyState < 2) {
        progressText.textContent = '비디오 로딩 중...';
        await new Promise(resolve => {
            videoEl.onloadeddata = () => resolve();
        });
    }

    // 4. 프레임 샘플링 및 분석
    const videoDuration = videoEl.duration;
    const sampleCount = Math.min(20, Math.floor(videoDuration)); // 샘플 수 줄임
    const allDescriptors = [];
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = videoEl.videoWidth;
    tempCanvas.height = videoEl.videoHeight;
    const tempCtx = tempCanvas.getContext('2d');

    for (let i = 0; i < sampleCount; i++) {
        const currentTime = (i / (sampleCount - 1)) * videoDuration;
        videoEl.currentTime = currentTime;
        await new Promise(resolve => {
            videoEl.onseeked = () => resolve();
        });
        
        tempCtx.drawImage(videoEl, 0, 0);

        const detections = await faceapi.detectAllFaces(tempCanvas).withFaceLandmarks().withFaceDescriptors();
        detections.forEach(d => allDescriptors.push(d.descriptor));
        
        const progress = ((i + 1) / sampleCount) * 100;
        progressBarFill.style.width = `${progress}%`;
        progressText.textContent = `영상 분석 중... (${i + 1}/${sampleCount})`;
    }
    
    // 5. 얼굴 그룹화
    progressText.textContent = '얼굴 그룹화 중...';
    const faceMatcher = new faceapi.FaceMatcher(allDescriptors, 0.5);
    const actorGroups = {};
    allDescriptors.forEach(descriptor => {
        const bestMatch = faceMatcher.findBestMatch(descriptor);
        const label = bestMatch.label;
        if (!actorGroups[label]) {
            actorGroups[label] = { label, count: 0, descriptors: [] };
        }
        actorGroups[label].count++;
        actorGroups[label].descriptors.push(descriptor);
    });

    // 6. 대표 이미지 추출
    progressText.textContent = '대표 이미지 추출 중...';
    const actors = Object.values(actorGroups);
    for (const actor of actors) {
        // 대표 이미지를 추출하기 위해 비디오의 첫 프레임으로 이동
        videoEl.currentTime = 0;
        await new Promise(resolve => { videoEl.onseeked = () => resolve(); });

        const detection = await faceapi.detectSingleFace(videoEl).withFaceLandmarks();
         if(detection) {
             const faceCanvas = faceapi.createCanvasFromMedia(videoEl);
             // *** 중요 수정: videoEl.width -> videoEl.videoWidth 로 변경 ***
             const displaySize = { width: videoEl.videoWidth, height: videoEl.videoHeight };
             faceapi.matchDimensions(faceCanvas, displaySize);
             
             const resizedDetection = faceapi.resizeResults(detection, displaySize);
             const { x, y, width, height } = resizedDetection.detection.box;

             const faceImageCanvas = document.createElement('canvas');
             faceImageCanvas.width = width;
             faceImageCanvas.height = height;
             faceImageCanvas.getContext('2d').drawImage(videoEl, x, y, width, height, 0, 0, width, height);
             actor.image = faceImageCanvas.toDataURL();
         } else {
             // Fallback: 얼굴을 찾지 못한 경우 비디오의 현재 프레임을 사용
             const fallbackCanvas = document.createElement('canvas');
             fallbackCanvas.width = 100;
             fallbackCanvas.height = 100;
             fallbackCanvas.getContext('2d').drawImage(videoEl, 0, 0, 100, 100);
             actor.image = fallbackCanvas.toDataURL();
         }
    }
    
    // 7. 결과 표시 및 정리
    displayResults(actors);
    isAnalyzing = false;
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = '얼굴 분석 (V2)';
    progressContainer.style.display = 'none';
    progressBarFill.style.width = '0%';
} 