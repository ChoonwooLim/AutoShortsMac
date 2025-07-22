// js/face-analyzer-new.js
// "세계 최고"를 지향하는 전문가용 얼굴 분석 엔진

import { state } from './state.js';

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
 * 전문가 분석에 필요한 모든 AI 모델(나이/성별, 표정 포함)을 로드합니다.
 */
async function loadModels() {
    if (modelsLoaded) return true;
    progressText.textContent = '전문가용 분석 모델 로딩 중...';
    progressContainer.style.display = 'block';

    try {
        console.log('⏳ V2(전문가) 모델 로딩 시작...');
        await Promise.all([
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            faceapi.nets.ageGenderNet.loadFromUri(MODEL_URL),
            faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
        ]);
        modelsLoaded = true;
        console.log('✅ V2(전문가) 모델 로딩 완료.');
        return true;
    } catch (error) {
        console.error('❌ V2(전문가) 모델 로딩 실패:', error);
        alert('얼굴 분석 모델 로딩에 실패했습니다. 인터넷 연결을 확인해주세요.');
        return false;
    }
}

/**
 * 분석 결과를 전문가 수준의 UI로 화면에 표시합니다.
 * @param {Array} actors - 분석된 배우 정보 배열
 * @param {number} duration - 비디오 총 길이 (타임라인 생성용)
 */
function displayResults(actors, duration) {
    resultsContainer.innerHTML = '';
    if (actors.length === 0) {
        resultsContainer.innerHTML = '<p style="text-align: center; color: #888;">영상에서 인물을 찾지 못했습니다.</p>';
        return;
    }

    actors.sort((a, b) => b.totalAppearances - a.totalAppearances);

    actors.forEach((actor, index) => {
        const emotions = Object.entries(actor.emotionSummary)
            .sort(([, a], [, b]) => b - a)
            .map(([emotion, count]) => `${emotion}(${count})`)
            .join(', ');

        const timelineMarkers = actor.appearances.map(time =>
            `<div class="timeline-marker" style="left: ${(time / duration) * 100}%;" data-time="${time}"></div>`
        ).join('');

        const actorCard = document.createElement('div');
        actorCard.className = 'face-card professional';
        actorCard.innerHTML = `
            <img src="${actor.image}" alt="${actor.label}" class="face-card-img">
            <div class="face-card-content">
                <div class="face-card-header">
                    <div class="face-card-title">
                        <h4>${actor.label}</h4>
                        <p>추정: ${actor.gender}, 약 ${Math.round(actor.avgAge)}세</p>
                    </div>
                </div>
                <div class="face-card-body">
                    <p><strong>총 등장 횟수:</strong> ${actor.totalAppearances}회</p>
                    <p><strong>주요 감정:</strong> ${emotions || '분석 정보 없음'}</p>
                    <p><strong>등장 타임라인:</strong></p>
                    <div class="timeline-container">${timelineMarkers}</div>
                </div>
            </div>
        `;
        resultsContainer.appendChild(actorCard);
    });

    // 타임라인 마커에 클릭 이벤트 추가
    resultsContainer.querySelectorAll('.timeline-marker').forEach(marker => {
        marker.addEventListener('click', (e) => {
            const time = parseFloat(e.target.dataset.time);
            if (videoEl) {
                videoEl.currentTime = time;
                videoEl.play(); // 클릭 시 바로 재생
                setTimeout(() => videoEl.pause(), 500); // 0.5초 후 정지
            }
        });
    });
}

/**
 * '전문가 모드' 얼굴 분석 프로세스
 */
export async function startAnalysis() {
    if (isAnalyzing) {
        alert('분석이 이미 진행 중입니다.');
        return;
    }
    isAnalyzing = true;

    // 1. UI 초기화
    videoEl = document.getElementById('videoPreview');
    progressContainer = document.getElementById('analysisProgressV2');
    progressText = document.getElementById('progressTextV2');
    progressBarFill = document.getElementById('progressBarFillV2');
    resultsContainer = document.getElementById('faceResultsV2');
    analyzeBtn = document.getElementById('analyzeFacesBtnV2');

    resultsContainer.innerHTML = '<p style="text-align: center; color: #888;">전문가 분석을 시작합니다. 정확도를 위해 시간이 오래 소요될 수 있습니다...</p>';
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = '분석 중...';
    progressBarFill.style.width = '0%';
    progressContainer.style.display = 'block';

    if (!state.uploadedFile || !videoEl.src) {
        alert('먼저 동영상 파일을 업로드해주세요.');
        isAnalyzing = false;
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = '얼굴 분석 (V2)';
        return;
    }

    // 2. 모델 로드
    if (!await loadModels()) {
        isAnalyzing = false;
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = '얼굴 분석 (V2)';
        progressContainer.style.display = 'none';
        return;
    }

    // 3. 비디오 준비
    await new Promise(resolve => {
        if (videoEl.readyState >= 2) return resolve();
        videoEl.onloadeddata = () => resolve();
    });
    videoEl.pause();
    videoEl.currentTime = 0;

    // 4. 초고밀도 프레임 분석 (1초당 2프레임)
    const SAMPLING_RATE_FPS = 2;
    const interval = 1 / SAMPLING_RATE_FPS;
    const allDetections = [];

    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = videoEl.videoWidth;
    tempCanvas.height = videoEl.videoHeight;

    for (let time = 0; time < videoEl.duration; time += interval) {
        videoEl.currentTime = time;
        await new Promise(resolve => { videoEl.onseeked = () => resolve(); });

        tempCtx.drawImage(videoEl, 0, 0, tempCanvas.width, tempCanvas.height);

        const detections = await faceapi
            .detectAllFaces(tempCanvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
            .withFaceLandmarks()
            .withFaceExpressions()
            .withAgeAndGender()
            .withFaceDescriptors();

        detections.forEach(d => {
            d.timestamp = time;
            allDetections.push(d);
        });

        const progress = (time / videoEl.duration) * 100;
        progressBarFill.style.width = `${progress}%`;
        progressText.textContent = `정밀 분석 중... (${Math.round(progress)}%)`;
    }

    if (allDetections.length === 0) {
        displayResults([], videoEl.duration);
        isAnalyzing = false;
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = '얼굴 분석 (V2)';
        progressContainer.style.display = 'none';
        return;
    }

    // 5. 정교한 인물 식별 클러스터링
    progressText.textContent = '탐지된 얼굴 그룹화 시작...';
    const actors = [];
    const DISTANCE_THRESHOLD = 0.5; // 유사도 기준 (낮을수록 엄격)

    progressBarFill.style.width = '0%';
    const totalDetections = allDetections.length;

    for (const [index, detection] of allDetections.entries()) {
        let bestMatch = null;
        let minDistance = 1;

        const progress = ((index + 1) / totalDetections) * 100;
        progressBarFill.style.width = `${progress}%`;
        progressText.textContent = `얼굴 그룹화 진행 중... (${index + 1}/${totalDetections})`;

        for (let i = 0; i < actors.length; i++) {
            const dist = faceapi.euclideanDistance(detection.descriptor, actors[i].avgDescriptor);
            if (dist < minDistance) {
                minDistance = dist;
                bestMatch = actors[i];
            }
        }

        if (bestMatch && minDistance < DISTANCE_THRESHOLD) {
            bestMatch.detections.push(detection);
            // 그룹의 평균 특징을 계속 업데이트하여 정확도 향상
            const newDescriptors = bestMatch.detections.map(d => d.descriptor);
            const avgDescriptor = new Float32Array(newDescriptors[0].length);
            for (let i = 0; i < avgDescriptor.length; i++) {
                avgDescriptor[i] = newDescriptors.reduce((sum, desc) => sum + desc[i], 0) / newDescriptors.length;
            }
            bestMatch.avgDescriptor = avgDescriptor;
        } else {
            // 새로운 인물 발견
            actors.push({
                label: `인물 #${actors.length + 1}`,
                detections: [detection],
                avgDescriptor: detection.descriptor,
            });
        }
    }

    // 6. 데이터 집계 및 Best Shot 대표 이미지 추출
    progressText.textContent = '최종 데이터 집계 시작...';
    const finalActors = [];

    progressBarFill.style.width = '0%';
    const totalActors = actors.length;

    for (const [index, actor] of actors.entries()) {
        const progress = ((index + 1) / totalActors) * 100;
        progressBarFill.style.width = `${progress}%`;
        progressText.textContent = `인물별 Best Shot 선정 및 정보 정리 중... (${index + 1}/${totalActors}명)`;

        const bestDetection = actor.detections.reduce((best, current) =>
            current.detection.box.area > best.detection.box.area ? current : best
        );

        videoEl.currentTime = bestDetection.timestamp;
        await new Promise(resolve => { videoEl.onseeked = () => resolve(); });

        const faceCanvas = document.createElement('canvas');
        const { x, y, width, height } = bestDetection.detection.box;

        // 여권 사진처럼 보이도록 박스 확장 (세로 비율을 더 늘림)
        const widthScale = 1.5;
        const heightScale = 2.0;
        const newWidth = width * widthScale;
        const newHeight = height * heightScale;

        // 얼굴이 프레임의 상단 1/3 지점에 위치하도록 y 좌표 조정
        let newX = x - (newWidth - width) / 2;
        let newY = y - (newHeight - height) / 3;

        // 비디오 프레임 경계를 벗어나지 않도록 좌표 보정
        newX = Math.max(0, newX);
        newY = Math.max(0, newY);
        const finalWidth = Math.min(newWidth, videoEl.videoWidth - newX);
        const finalHeight = Math.min(newHeight, videoEl.videoHeight - newY);

        faceCanvas.width = finalWidth;
        faceCanvas.height = finalHeight;
        faceCanvas.getContext('2d').drawImage(videoEl, newX, newY, finalWidth, finalHeight, 0, 0, finalWidth, finalHeight);

        const gender = actor.detections.map(d => d.gender).sort((a,b) => actor.detections.filter(v => v.gender===a).length - actor.detections.filter(v => v.gender===b).length).pop();
        const avgAge = actor.detections.reduce((sum, d) => sum + d.age, 0) / actor.detections.length;

        const emotionSummary = {};
        actor.detections.forEach(d => {
            const topEmotion = Object.keys(d.expressions).reduce((a, b) => d.expressions[a] > d.expressions[b] ? a : b);
            emotionSummary[topEmotion] = (emotionSummary[topEmotion] || 0) + 1;
        });

        finalActors.push({
            label: actor.label,
            image: faceCanvas.toDataURL(),
            gender: gender === 'male' ? '남성' : '여성',
            avgAge: avgAge,
            emotionSummary: emotionSummary,
            totalAppearances: actor.detections.length,
            appearances: actor.detections.map(d => d.timestamp).sort((a,b) => a - b)
        });
    }

    // 7. 결과 표시 및 정리
    displayResults(finalActors, videoEl.duration);
    isAnalyzing = false;
    analyzeBtn.disabled = false;
    analyzeBtn.textContent = '얼굴 분석 (V2)';
    progressContainer.style.display = 'none';

    console.log('✅ V2(전문가) 얼굴 분석 완료.');
} 