import { apiKeyManager } from './config.js';

export const aiModels = {
    claude: { 
        name: "Anthropic Claude", 
        subModels: ["Claude 3.5 Sonnet", "Claude 3.5 Haiku", "Claude 3 Opus", "Claude 3 Sonnet", "Claude 3 Haiku"], 
        apiKey: "", 
        apiKeyUrl: "https://console.anthropic.com/settings/keys",
        endpoint: "https://api.anthropic.com/v1/messages"
    },
    gpt: { 
        name: "OpenAI GPT", 
        subModels: ["GPT-4o", "GPT-4o Mini", "GPT-4 Turbo", "GPT-4", "o1", "o1-mini", "GPT-3.5 Turbo"], 
        apiKey: "", 
        apiKeyUrl: "https://platform.openai.com/api-keys",
        endpoint: "https://api.openai.com/v1/chat/completions"
    },
    gemini: { 
        name: "Google Gemini", 
        subModels: ["Gemini 2.0 Flash", "Gemini 1.5 Pro", "Gemini 1.5 Flash", "Gemini 1.0 Pro"], 
        apiKey: "", 
        apiKeyUrl: "https://aistudio.google.com/app/api-keys",
        endpoint: "https://generativelanguage.googleapis.com/v1beta/models"
    },
    groq: { 
        name: "Groq (Meta Llama)", 
        subModels: ["Llama 3.3 70B Versatile", "Llama 3.1 70B Versatile", "Llama 3.1 8B Instant", "Gemma2 9B"], 
        apiKey: "", 
        apiKeyUrl: "https://console.groq.com/keys",
        endpoint: "https://api.groq.com/openai/v1/chat/completions"
    },
};

async function loadSavedApiKeys() {
    console.log('🔑 저장된 API 키들 로드 시작...');
    
    // 동기 방식으로 모든 API 키 로드
    let loadedCount = 0;
    for (const provider of Object.keys(aiModels)) {
        // 먼저 새로운 암호화 방식으로 시도
        let apiKey = apiKeyManager.loadApiKeySync(provider);
        
        // 실패시 기존 localStorage 방식으로 시도 (fallback)
        if (!apiKey) {
            const oldKey = localStorage.getItem(`apiKey_${provider}`);
            if (oldKey) {
                console.log(`🔄 ${provider}: 기존 방식 API 키 발견, 마이그레이션 시도...`);
                // 새로운 암호화 방식으로 저장
                try {
                    apiKeyManager.saveApiKeySync(provider, oldKey);
                    apiKey = oldKey;
                    // 기존 키 삭제
                    localStorage.removeItem(`apiKey_${provider}`);
                    console.log(`✅ ${provider}: API 키 마이그레이션 완료`);
                } catch (error) {
                    console.error(`❌ ${provider}: 마이그레이션 실패`, error);
                    // 마이그레이션 실패해도 기존 키 사용
                    apiKey = oldKey;
                }
            }
        }
        
        if (apiKey) {
            aiModels[provider].apiKey = apiKey;
            loadedCount++;
            console.log(`✅ ${provider} API 키 로드됨`);
        }
    }
    
    console.log(`🔑 API 키 로드 완료: ${loadedCount}/${Object.keys(aiModels).length}개 모델`);
}

export async function getApiKey(modelKey) {
    // For transcription services, we can alias them to the main model
    const key = modelKey === 'google_stt' ? 'gemini' : modelKey;
    
    // 새로운 apiKeyManager 사용
    const apiKey = await apiKeyManager.loadApiKey(key);
    
    console.log(`API Key for ${key} requested. Found: ${!!apiKey}`);
    return apiKey;
}

export async function saveApiKey(modelKey, apiKey) {
    if (aiModels[modelKey]) {
        // 새로운 apiKeyManager 사용
        const success = await apiKeyManager.saveApiKey(modelKey, apiKey);
        
        if (success) {
            console.log(`🔐 API 키 저장 완료:`, {
                modelKey,
                keyLength: apiKey.length
            });
        }
    }
}

// --- API Call Functions ---

async function callClaudeAPI(message, systemPrompt, modelData, subModel, imageData = null) {
    if (!modelData.apiKey) throw new Error("API 키가 설정되지 않았습니다.");
    const modelMap = {
        "Claude 3.5 Sonnet": "claude-3-5-sonnet-20241022",
        "Claude 3.5 Haiku": "claude-3-5-haiku-20241022",
        "Claude 3 Opus": "claude-3-opus-20240229",
        "Claude 3 Sonnet": "claude-3-sonnet-20240229",
        "Claude 3 Haiku": "claude-3-haiku-20240307"
    };
    
    // 메시지 내용 구성 (텍스트 + 이미지)
    const messageContent = [];
    
    if (imageData) {
        // 이미지 데이터 추가
        const base64Data = imageData.dataUrl.split(',')[1];
        const mimeType = imageData.dataUrl.split(';')[0].split(':')[1];
        
        messageContent.push({
            type: "image",
            source: {
                type: "base64",
                media_type: mimeType,
                data: base64Data
            }
        });
        
        console.log(`🖼️ Claude에 이미지 전송:`, {
            fileName: imageData.name,
            fileSize: imageData.size,
            mimeType: mimeType
        });
    }
    
    if (message) {
        messageContent.push({
            type: "text",
            text: message
        });
    }
    
    const response = await fetch(modelData.endpoint, {
        method: 'POST',
        headers: {
            'x-api-key': modelData.apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            model: modelMap[subModel] || "claude-3-5-sonnet-20241022",
            max_tokens: 4096,
            system: systemPrompt,
            messages: [{ role: 'user', content: messageContent }]
        })
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({error:{message: response.statusText}}));
        throw new Error(err.error.message);
    }
    const result = await response.json();
    return result.content[0].text;
}

async function callGenericOpenAIAPI(message, systemPrompt, modelData, subModel, modelMap, imageData = null) {
    if (!modelData.apiKey) throw new Error("API 키가 설정되지 않았습니다.");
    
    // 메시지 내용 구성 (텍스트 + 이미지)
    const userContent = [];
    
    if (imageData) {
        // 이미지 데이터 추가
        userContent.push({
            type: "image_url",
            image_url: {
                url: imageData.dataUrl
            }
        });
        
        console.log(`🖼️ OpenAI에 이미지 전송:`, {
            fileName: imageData.name,
            fileSize: imageData.size
        });
    }
    
    if (message) {
        userContent.push({
            type: "text",
            text: message
        });
    }
    
    const response = await fetch(modelData.endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${modelData.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: modelMap[subModel],
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent.length > 1 || imageData ? userContent : message }
            ]
        })
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({error:{message: response.statusText}}));
        throw new Error(err.error.message);
    }
    const result = await response.json();
    return result.choices[0].message.content;
}

async function callOpenAIAPI(message, systemPrompt, modelData, subModel, imageData = null) {
    const modelMap = {
        "GPT-4o": "gpt-4o",
        "GPT-4o Mini": "gpt-4o-mini",
        "GPT-4 Turbo": "gpt-4-turbo",
        "GPT-4": "gpt-4",
        "o1": "o1",
        "o1-mini": "o1-mini",
        "GPT-3.5 Turbo": "gpt-3.5-turbo"
    };
    
    // 이미지 분석을 지원하는 모델들
    const visionModels = ["GPT-4o", "GPT-4o Mini", "GPT-4 Turbo"];
    
    // 이미지가 있는데 vision을 지원하지 않는 모델인 경우
    if (imageData && !visionModels.includes(subModel)) {
        console.warn(`⚠️ ${subModel} 모델은 이미지 분석을 지원하지 않습니다.`);
        return `⚠️ 죄송합니다. ${subModel} 모델은 이미지 분석을 지원하지 않습니다.\n\n**이미지 분석 가능한 모델:**\n• GPT-4o\n• GPT-4o Mini\n• GPT-4 Turbo\n\n이미지 분석을 위해서는 위 모델 중 하나를 선택해주세요.`;
    }
    
    return callGenericOpenAIAPI(message, systemPrompt, modelData, subModel, modelMap, imageData);
}

async function callGroqAPI(message, systemPrompt, modelData, subModel, imageData = null) {
    const modelMap = {
        "Llama 3.3 70B Versatile": "llama-3.3-70b-versatile",
        "Llama 3.1 70B Versatile": "llama-3.1-70b-versatile",
        "Llama 3.1 8B Instant": "llama-3.1-8b-instant",
        "Gemma2 9B": "gemma2-9b-it"
    };
    
    // Groq는 현재 이미지를 지원하지 않으므로 경고 메시지
    if (imageData) {
        console.warn('⚠️ Groq 모델은 현재 이미지 분석을 지원하지 않습니다.');
        return "⚠️ 죄송합니다. Groq 모델은 현재 이미지 분석을 지원하지 않습니다. 이미지 분석을 위해서는 Google Gemini, OpenAI GPT-4o, 또는 Claude를 사용해주세요.";
    }
    
    return callGenericOpenAIAPI(message, systemPrompt, modelData, subModel, modelMap, imageData);
}


async function callGeminiAPI(message, systemPrompt, modelData, subModel, imageData = null) {
    if (!modelData.apiKey) throw new Error("API 키가 설정되지 않았습니다.");
    
    const modelMap = {
        "Gemini 2.0 Flash": "gemini-2.0-flash-001",
        "Gemini 1.5 Pro": "gemini-1.5-pro-latest",
        "Gemini 1.5 Flash": "gemini-1.5-flash-latest",
        "Gemini 1.0 Pro": "gemini-1.0-pro"
    };
    
    // ⚠️ 잘못된 모델명 확인
    if (!modelMap[subModel]) {
        console.warn(`⚠️ 알 수 없는 Gemini 서브모델: "${subModel}". 사용 가능한 모델: ${Object.keys(modelMap).join(', ')}`);
        console.log(`🔄 기본 모델로 대체: gemini-2.0-flash-001`);
    }
    const modelName = modelMap[subModel] || "gemini-2.0-flash-001";
    const url = `${modelData.endpoint}/${modelName}:generateContent?key=${modelData.apiKey}`;

    console.log(`🔍 Gemini API 호출:`, {
        url: url.replace(modelData.apiKey, '***'),
        modelName,
        subModel
    });

    try {
        // Gemini API는 systemInstruction을 별도로 전달
        const requestBody = {
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            },
            contents: []
        };

        // 메시지 내용 구성 (텍스트 + 이미지)
        const messageParts = [];
        
        if (imageData) {
            // 이미지 데이터 추가 (base64에서 data:image/... 부분 제거)
            const base64Data = imageData.dataUrl.split(',')[1];
            const mimeType = imageData.dataUrl.split(';')[0].split(':')[1];
            
            messageParts.push({
                inlineData: {
                    mimeType: mimeType,
                    data: base64Data
                }
            });
            
            console.log(`🖼️ Gemini에 이미지 전송:`, {
                fileName: imageData.name,
                fileSize: imageData.size,
                mimeType: mimeType
            });
        }
        
        if (message) {
            messageParts.push({ text: message });
        }
        
        requestBody.contents.push({ parts: messageParts });

        console.log(`📝 Gemini 요청 구조:`, {
            systemInstruction: systemPrompt.substring(0, 100) + '...',
            userMessage: message.substring(0, 100) + '...'
        });

        const response = await fetch(url, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log(`📡 Gemini API 응답 상태:`, response.status, response.statusText);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`❌ Gemini API 오류 응답:`, errorText);
            
            let errorObj;
            try {
                errorObj = JSON.parse(errorText);
            } catch (e) {
                errorObj = { error: { message: errorText || response.statusText } };
            }
            
            throw new Error(errorObj.error?.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        console.log(`✅ Gemini API 성공 응답:`, result);
        
        if (!result.candidates || !result.candidates[0] || !result.candidates[0].content) {
            console.error(`❌ 응답 구조 오류:`, result);
            throw new Error("API 응답에서 예상된 데이터를 찾을 수 없습니다.");
        }
        
        const responseText = result.candidates[0].content.parts[0].text;
        console.log(`📝 실제 응답 내용:`, responseText.substring(0, 200) + '...');
        
        return responseText;
    } catch (error) {
        console.error(`❌ Gemini API 호출 중 오류:`, error);
        throw error;
    }
}


export async function callAI(modelKey, subModel, systemPrompt, userMessage, imageData = null) {
    // 입력 매개변수 검증
    if (!modelKey) {
        return `❌ **모델 선택 오류**\n\n모델이 선택되지 않았습니다.\n\n**해결 방법:**\n1. 화면 하단의 드롭다운에서 AI 모델 선택\n2. 예: Google Gemini → Gemini 1.5 Flash`;
    }
    
    const modelData = aiModels[modelKey];
    
    // 모델 데이터 존재 확인
    if (!modelData) {
        console.error(`❌ 알 수 없는 모델 키:`, modelKey);
        console.log(`🔍 사용 가능한 모델들:`, Object.keys(aiModels));
        return `❌ **모델 오류**\n\n선택된 모델 '${modelKey}'을(를) 찾을 수 없습니다.\n\n**사용 가능한 모델:**\n${Object.keys(aiModels).map(key => `• ${aiModels[key].name}`).join('\n')}`;
    }
    
    console.log(`🔍 API 호출 디버그 정보:`, {
        modelKey,
        subModel,
        modelName: modelData.name,
        hasApiKey: !!modelData.apiKey,
        apiKeyLength: modelData.apiKey ? modelData.apiKey.length : 0,
        endpoint: modelData.endpoint
    });

    // API 키 확인 (메모리와 localStorage 모두 체크)
    let apiKey = modelData.apiKey;
    if (!apiKey) {
        // 메모리에 없으면 localStorage에서 재시도
        apiKey = localStorage.getItem(`apiKey_${modelKey}`);
        if (apiKey) {
            // localStorage에서 찾았으면 메모리에도 업데이트
            modelData.apiKey = apiKey;
            console.log(`🔄 API 키 메모리 복원:`, { modelKey, keyLength: apiKey.length });
        }
    }
    
    if (!apiKey) {
        return `⚠️ ${modelData.name} API 키가 설정되지 않았습니다.\n\n**설정 방법:**\n1. 화면 우측 하단의 ⚙️ 버튼 클릭\n2. ${modelData.name} API 키 입력\n3. 저장 후 다시 시도\n\n**API 키 발급:** ${modelData.apiKeyUrl}`;
    }

    try {
        switch (modelKey) {
            case 'claude':
                return await callClaudeAPI(userMessage, systemPrompt, modelData, subModel, imageData);
            case 'gpt':
                return await callOpenAIAPI(userMessage, systemPrompt, modelData, subModel, imageData);
            case 'gemini':
                return await callGeminiAPI(userMessage, systemPrompt, modelData, subModel, imageData);
            case 'groq':
                return await callGroqAPI(userMessage, systemPrompt, modelData, subModel, imageData);
            default:
                throw new Error("선택된 AI 모델을 호출하는 기능이 아직 구현되지 않았습니다.");
        }
    } catch (error) {
        console.error(`❌ ${modelData.name} API 호출 상세 오류:`, {
            message: error.message,
            stack: error.stack,
            modelKey,
            subModel,
            hasApiKey: !!modelData.apiKey
        });
        
        // 더 구체적인 오류 메시지 제공
        let errorMessage = error.message;
        if (error.message.includes('API 키가 설정되지 않았습니다')) {
            errorMessage = `API 키가 설정되지 않았습니다. ⚙️ 버튼을 클릭하여 ${modelData.name} API 키를 설정해주세요.`;
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            errorMessage = `❌ **API 키 오류**\n\nAPI 키가 유효하지 않습니다.\n\n**해결 방법:**\n1. ⚙️ 버튼 클릭\n2. 올바른 ${modelData.name} API 키 재입력\n3. API 키 발급: ${modelData.apiKeyUrl}`;
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
            errorMessage = `❌ **액세스 거부**\n\nAPI 액세스가 거부되었습니다.\n\n**확인사항:**\n- ${modelData.name} 계정 활성화 상태\n- API 사용 권한 설정\n- 결제 정보 등록 여부`;
        } else if (error.message.includes('429') || error.message.includes('rate limit')) {
            errorMessage = `⏳ **사용량 초과**\n\nAPI 호출 한도를 초과했습니다.\n\n잠시 후 다시 시도해주세요.`;
        } else if (error.message.includes('fetch') || error.message.includes('network') || error.message.includes('Failed to fetch')) {
            errorMessage = `🌐 **네트워크 오류**\n\n인터넷 연결을 확인해주세요.\n\n**가능한 원인:**\n- WiFi/이더넷 연결 상태\n- 방화벽 설정\n- VPN 사용 여부\n\n**기술 정보:** Failed to fetch\n\n이는 보통 CORS 정책이나 네트워크 차단 때문입니다.`;
            
            // 개발자를 위한 추가 디버깅 정보
            console.log('🔍 네트워크 오류 디버깅 정보:', {
                endpoint: modelData.endpoint,
                modelKey,
                subModel,
                error: error.message,
                stack: error.stack
            });
        }
        
        return `${errorMessage}\n\n**기술 정보:** ${error.message}`;
    }
}

// --- Google Auth ---
let gapiInited = false;
let gisInited = false;
let tokenClient;

export function initializeGis(clientId) {
    if (!clientId) {
        console.error("Google Client ID가 없습니다.");
        return;
    }
    
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/devstorage.read_write',
        callback: '', // Immediate response, no need for a callback here
    });
    gisInited = true;
}

export function initializeGapiClient() {
    gapi.client.init({})
        .then(() => {
            gapiInited = true;
        });
}

export function handleGisAuthClick() {
    return new Promise((resolve, reject) => {
        // Wait for GIS to be initialized.
        const interval = setInterval(() => {
            if (gisInited) {
                clearInterval(interval);

                tokenClient.callback = (resp) => {
                    if (resp.error !== undefined) {
                        reject(resp);
                    }
                    console.log("GIS Auth successful:", resp);
                    resolve(resp);
                };

                if (gapi.client.getToken() === null) {
                    tokenClient.requestAccessToken({prompt: 'consent'});
                } else {
                    tokenClient.requestAccessToken({prompt: ''});
                }
            }
        }, 100);
    });
}

// 디버깅용 전역 함수들
window.testApiKey = async function(provider, apiKey) {
    console.log(`🔑 ${provider} API 키 테스트 시작...`);
    
    if (!apiKey) {
        // 저장된 키 사용
        apiKey = apiKeyManager.loadApiKeySync(provider);
        if (!apiKey) {
            console.error('❌ 저장된 API 키가 없습니다');
            return false;
        }
    }
    
    // 메모리에 임시 설정
    if (aiModels[provider]) {
        aiModels[provider].apiKey = apiKey;
    }
    
    try {
        // 간단한 테스트 호출
        const result = await callAI(provider, aiModels[provider].subModels[0], 
            "테스트용 시스템 프롬프트", 
            "안녕하세요. API 연결 테스트입니다. 간단히 응답해주세요.");
        
        console.log('✅ API 테스트 성공:', result.substring(0, 100) + '...');
        return true;
    } catch (error) {
        console.error('❌ API 테스트 실패:', error.message);
        return false;
    }
};

window.debugApiKeys = function() {
    console.log('🔍 저장된 API 키 상태:');
    for (const provider of Object.keys(aiModels)) {
        const savedKey = apiKeyManager.loadApiKeySync(provider);
        const memoryKey = aiModels[provider].apiKey;
        
        console.log(`${provider}:`, {
            saved: !!savedKey,
            savedLength: savedKey ? savedKey.length : 0,
            memory: !!memoryKey,
            memoryLength: memoryKey ? memoryKey.length : 0,
            match: savedKey === memoryKey
        });
    }
};

window.clearApiKey = function(provider) {
    if (apiKeyManager.deleteApiKey(provider)) {
        console.log(`✅ ${provider} API 키 삭제됨`);
    } else {
        console.error(`❌ ${provider} API 키 삭제 실패`);
    }
};

// 전체 초기화
export async function initializeApiManagement() {
    await loadSavedApiKeys();
    
    // GAPI client - gapi가 정의되어 있을 때만 실행
    if (typeof gapi !== 'undefined' && gapi.load) {
        gapi.load('client', async () => {
            await gapi.client.init({});
            gapiInited = true;
        });
    } else {
        console.log('🔍 GAPI 라이브러리가 아직 로드되지 않았습니다. Google STT 기능은 나중에 초기화됩니다.');
    }
}

// 각 AI 모델의 실제 연결 및 고유 특성 테스트
export async function testAIConnection(modelKey, subModel) {
    const modelData = aiModels[modelKey];
    if (!modelData || !modelData.apiKey) {
        return `❌ ${modelData?.name || modelKey} API 키가 설정되지 않았습니다.`;
    }

    try {
        console.log(`🔬 ${modelData.name} 연결 테스트 시작...`);
        
        // 각 AI의 고유한 특성을 확인하는 테스트 질문
        const testPrompt = getAISpecificTestPrompt(modelKey, subModel);
        const testMessage = "이 테스트는 당신이 실제로 연결되어 있는지 확인하는 것입니다. 당신의 고유한 특성을 보여주세요.";
        
        const startTime = Date.now();
        const response = await callAI(modelKey, subModel, testPrompt, testMessage);
        const responseTime = Date.now() - startTime;
        
        return `✅ **${modelData.name} ${subModel} 연결 성공!**
        
**응답 시간:** ${responseTime}ms
**실제 응답:**
${response}

---
🔍 **이 응답이 해당 AI의 실제 특성을 보여줍니다.**`;
        
    } catch (error) {
        console.error(`❌ ${modelData.name} 연결 테스트 실패:`, error);
        return `❌ **${modelData.name} 연결 실패**
        
**오류:** ${error.message}
        
**가능한 원인:**
- API 키가 유효하지 않음
- API 서비스 일시 중단
- 네트워크 연결 문제`;
    }
}

function getAISpecificTestPrompt(modelKey, subModel) {
    switch(modelKey) {
        case 'gemini':
            return `당신은 Google Gemini ${subModel}입니다. 
            다음 특성들을 보여주세요:
            1. 자신이 Google에서 개발된 Gemini임을 명확히 밝히세요
            2. 멀티모달 능력에 대해 언급하세요
            3. Google의 AI 철학을 간단히 설명하세요
            4. 절대로 OpenAI나 다른 회사 모델이라고 말하지 마세요`;
            
        case 'claude':
            return `당신은 Anthropic Claude ${subModel}입니다.
            다음 특성들을 보여주세요:
            1. 자신이 Anthropic에서 개발된 Claude임을 명확히 밝히세요
            2. Constitutional AI에 대해 간단히 설명하세요
            3. 안전성과 도움됨의 균형에 대해 언급하세요
            4. 절대로 OpenAI나 Google 모델이라고 말하지 마세요`;
            
        case 'gpt':
            return `당신은 OpenAI ${subModel}입니다.
            다음 특성들을 보여주세요:
            1. 자신이 OpenAI에서 개발된 GPT임을 명확히 밝히세요
            2. 트랜스포머 아키텍처에 대해 간단히 언급하세요
            3. ChatGPT와의 관계를 설명하세요
            4. 절대로 Anthropic이나 Google 모델이라고 말하지 마세요`;
            
        case 'groq':
            return `당신은 ${subModel}입니다 (Groq 플랫폼).
            다음 특성들을 보여주세요:
            1. 자신이 ${subModel}임을 명확히 밝히세요
            2. Groq의 초고속 추론에 대해 언급하세요
            3. 오픈소스 모델의 장점을 설명하세요
            4. 절대로 OpenAI나 Google 모델이라고 말하지 마세요`;
            
        default:
            return `당신의 실제 정체성과 고유한 특성을 보여주세요.`;
    }
}

// 모든 AI 모델 연결 상태를 한번에 테스트
export async function testAllAIConnections() {
    const results = {};
    
    for (const [modelKey, modelData] of Object.entries(aiModels)) {
        if (!modelData.apiKey) {
            results[modelKey] = `⚠️ API 키 없음`;
            continue;
        }
        
        // 각 모델의 첫 번째 서브모델로 테스트
        const subModel = modelData.subModels[0];
        
        try {
            const testResult = await testAIConnection(modelKey, subModel);
            results[modelKey] = testResult;
        } catch (error) {
            results[modelKey] = `❌ 오류: ${error.message}`;
        }
    }
    
    return results;
}

// 디버깅 및 복구용 전역 함수들
window.apiDebug = {
    // 모든 API 키 상태 확인
    checkAll: function() {
        console.log('=== API 키 상태 확인 ===');
        
        // 메모리상의 API 키
        console.log('📝 메모리 상태:');
        for (const [provider, model] of Object.entries(aiModels)) {
            console.log(`${provider}: ${model.apiKey ? '✅ 있음' : '❌ 없음'} (길이: ${model.apiKey?.length || 0})`);
        }
        
        // localStorage 상태
        console.log('\n📦 localStorage 상태:');
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('apiKey_') || key === 'encryptedApiKeys') {
                const value = localStorage.getItem(key);
                console.log(`${key}: ${value ? value.substring(0, 30) + '...' : 'null'}`);
            }
        }
        
        return '완료';
    },
    
    // 특정 프로바이더의 API 키 복구
    restore: async function(provider, apiKey) {
        if (!provider || !apiKey) {
            console.error('사용법: apiDebug.restore("provider", "your-api-key")');
            console.log('예시: apiDebug.restore("gemini", "AIza...")');
            return false;
        }
        
        try {
            // 메모리에 직접 설정
            if (aiModels[provider]) {
                aiModels[provider].apiKey = apiKey;
                console.log(`✅ ${provider} API 키 메모리 설정 완료`);
                
                // 영구 저장
                await apiKeyManager.saveApiKeySync(provider, apiKey);
                console.log(`✅ ${provider} API 키 저장 완료`);
                
                return true;
            } else {
                console.error(`❌ 알 수 없는 프로바이더: ${provider}`);
                console.log('사용 가능한 프로바이더:', Object.keys(aiModels));
                return false;
            }
        } catch (error) {
            console.error('❌ API 키 복구 실패:', error);
            return false;
        }
    },
    
    // 모든 암호화된 데이터 제거 및 재설정
    reset: function() {
        if (!confirm('⚠️ 모든 저장된 API 키가 삭제됩니다. 계속하시겠습니까?')) {
            return '취소됨';
        }
        
        // 모든 관련 localStorage 항목 제거
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('apiKey_') || key === 'encryptedApiKeys' || key === 'encryptionKey') {
                keysToRemove.push(key);
            }
        }
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log(`🗑️ 제거됨: ${key}`);
        });
        
        // 메모리 초기화
        for (const provider of Object.keys(aiModels)) {
            aiModels[provider].apiKey = '';
        }
        
        console.log('✅ 모든 API 키가 초기화되었습니다. 페이지를 새로고침해주세요.');
        return '완료';
    },
    
    // API 연결 테스트
    test: async function(provider) {
        if (!provider) {
            console.log('사용법: apiDebug.test("provider")');
            console.log('예시: apiDebug.test("gemini")');
            console.log('사용 가능한 프로바이더:', Object.keys(aiModels));
            return;
        }
        
        console.log(`🔍 ${provider} API 테스트 시작...`);
        
        try {
            const result = await testApiKey(provider);
            console.log(`✅ ${provider} API 테스트 성공!`);
            return result;
        } catch (error) {
            console.error(`❌ ${provider} API 테스트 실패:`, error);
            return false;
        }
    },
    
    // 도움말
    help: function() {
        console.log(`
🛠️ API 디버깅 도구 사용법:

1. apiDebug.checkAll()
   - 모든 API 키 상태 확인

2. apiDebug.restore("provider", "api-key")
   - 특정 프로바이더의 API 키 복구
   - 예: apiDebug.restore("gemini", "AIza...")

3. apiDebug.test("provider")
   - API 연결 테스트
   - 예: apiDebug.test("gemini")

4. apiDebug.reset()
   - 모든 저장된 API 키 제거 (주의!)

5. apiDebug.help()
   - 이 도움말 표시

사용 가능한 프로바이더: ${Object.keys(aiModels).join(', ')}
        `);
    }
};

// 시작시 자동으로 도움말 표시
console.log('💡 API 디버깅 도구가 로드되었습니다. apiDebug.help()를 입력하여 사용법을 확인하세요.');