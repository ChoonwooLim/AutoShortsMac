export const aiModels = {
    claude: { 
        name: "Claude", 
        subModels: [
            "Claude 3.5 Sonnet", 
            "Claude 3.5 Haiku", 
            "Claude 3 Opus", 
            "Claude 3 Sonnet", 
            "Claude 3 Haiku"
        ], 
        apiKey: "", 
        apiKeyUrl: "https://console.anthropic.com/settings/keys",
        endpoint: "https://api.anthropic.com/v1/messages"
    },
    gpt: { 
        name: "OpenAI GPT", 
        subModels: [
            "GPT-4o", 
            "GPT-4o mini", 
            "GPT-4 Turbo", 
            "GPT-4", 
            "GPT-3.5 Turbo", 
            "GPT-3.5 Turbo 16k"
        ], 
        apiKey: "", 
        apiKeyUrl: "https://platform.openai.com/api-keys",
        endpoint: "https://api.openai.com/v1/chat/completions"
    },
    gemini: { 
        name: "Google Gemini", 
        subModels: [
            "Gemini 2.0 Flash", 
            "Gemini 1.5 Pro", 
            "Gemini 1.5 Flash", 
            "Gemini 1.5 Flash-8B", 
            "Gemini 1.0 Pro"
        ], 
        apiKey: "", 
        apiKeyUrl: "https://aistudio.google.com/app/api-keys",
        endpoint: "https://generativelanguage.googleapis.com/v1beta/models"
    },
    groq: { 
        name: "Groq", 
        subModels: [
            "Llama 3.3 70B", 
            "Llama 3.1 405B", 
            "Llama 3.1 70B", 
            "Llama 3.1 8B", 
            "Llama 3 70B", 
            "Llama 3 8B", 
            "Mixtral 8x7B", 
            "Gemma 2 9B", 
            "Gemma 7B"
        ], 
        apiKey: "", 
        apiKeyUrl: "https://console.groq.com/keys",
        endpoint: "https://api.groq.com/openai/v1/chat/completions"
    },
    perplexity: {
        name: "Perplexity",
        subModels: [
            "Llama 3.1 Sonar Large",
            "Llama 3.1 Sonar Small", 
            "Llama 3.1 70B",
            "Llama 3.1 8B"
        ],
        apiKey: "",
        apiKeyUrl: "https://www.perplexity.ai/settings/api",
        endpoint: "https://api.perplexity.ai/chat/completions"
    },
    cohere: {
        name: "Cohere",
        subModels: [
            "Command R+",
            "Command R",
            "Command",
            "Command Light"
        ],
        apiKey: "",
        apiKeyUrl: "https://dashboard.cohere.com/api-keys",
        endpoint: "https://api.cohere.ai/v1/chat"
    }
};

// Google 인증 설정 (보안 개선)
export const googleConfig = {
    // 기본 클라이언트 ID (개발용) - 프로덕션에서는 환경변수 사용 권장
    defaultClientId: "529987184437-62ihej9kr96pq8b20jose5ceu9o0r8nv.apps.googleusercontent.com",
    
    // 사용자 정의 클라이언트 ID 저장소 키
    customClientIdKey: "custom_google_client_id",
    
    // 클라이언트 ID 가져오기 (사용자 정의 > 환경변수 > 기본값 순)
    getClientId() {
        // 1. 사용자가 설정한 커스텀 클라이언트 ID 확인
        const customId = localStorage.getItem(this.customClientIdKey);
        if (customId && customId.trim()) {
            console.log("🔐 사용자 정의 Google Client ID 사용");
            return customId.trim();
        }
        
        // 2. 환경변수 확인 (브라우저 환경에서는 제한적)
        if (typeof process !== 'undefined' && process.env && process.env.GOOGLE_CLIENT_ID) {
            console.log("🔐 환경변수 Google Client ID 사용");
            return process.env.GOOGLE_CLIENT_ID;
        }
        
        // 3. 기본값 사용 (개발용)
        console.warn("⚠️ 기본 Google Client ID 사용 중 - 프로덕션에서는 사용자 정의 설정 권장");
        return this.defaultClientId;
    },
    
    // 사용자 정의 클라이언트 ID 설정
    setCustomClientId(clientId) {
        if (!clientId || !clientId.trim()) {
            localStorage.removeItem(this.customClientIdKey);
            console.log("🗑️ 사용자 정의 Google Client ID 제거됨");
            return false;
        }
        
        // 기본적인 Google Client ID 형식 검증
        const clientIdPattern = /^\d+-[a-zA-Z0-9]+\.apps\.googleusercontent\.com$/;
        if (!clientIdPattern.test(clientId.trim())) {
            console.error("❌ 잘못된 Google Client ID 형식");
            return false;
        }
        
        localStorage.setItem(this.customClientIdKey, clientId.trim());
        console.log("✅ 사용자 정의 Google Client ID 저장됨");
        return true;
    },
    
    // 현재 사용 중인 클라이언트 ID 정보
    getCurrentIdInfo() {
        const currentId = this.getClientId();
        const isCustom = !!localStorage.getItem(this.customClientIdKey);
        const isDefault = currentId === this.defaultClientId;
        
        return {
            clientId: currentId,
            isCustom: isCustom,
            isDefault: isDefault,
            source: isCustom ? "사용자 정의" : (isDefault ? "기본값" : "환경변수")
        };
    }
};

// API 키 관리 모듈 (Electron SafeStorage 기반)
export const apiKeyManager = {
    // API 제공자가 유효한지 확인
    _isProviderValid(provider) {
        if (!provider) {
            console.error('❌ API 키 작업 실패: "provider"가 지정되지 않았습니다.');
            return false;
        }
        return true;
    },

    // API 키 저장
    async saveApiKey(provider, apiKey) {
        if (!this._isProviderValid(provider) || !apiKey) {
            console.error(`❌ API 키 저장 실패: ${provider}의 키가 비어있습니다.`);
            return { success: false, error: 'Provider 또는 API 키가 없습니다.' };
        }
        try {
            const result = await window.electronAPI.saveApiKey(provider, apiKey);
            if (result.success) {
                console.log(`✅ ${provider} API 키가 안전하게 저장되었습니다.`);
            }
            return result; // 객체를 그대로 반환
        } catch (error) {
            console.error(`❌ ${provider} API 키 저장 중 오류 발생:`, error);
            return { success: false, error: error.message };
        }
    },

    // API 키 로드
    async loadApiKey(provider) {
        if (!this._isProviderValid(provider)) return null;
        try {
            const result = await window.electronAPI.loadApiKey(provider);
            if (!result.success) {
                throw new Error(result.error || '메인 프로세스에서 키 로드 실패');
            }
            console.log(`🔑 ${provider} API 키 로드 ${result.apiKey ? '성공' : '실패 (저장된 키 없음)'}`);
            return result.apiKey;
        } catch (error) {
            console.error(`❌ ${provider} API 키 로드 중 오류 발생:`, error);
            return null;
        }
    },

    // 모든 API 키 로드 (앱 초기화용)
    async loadAllApiKeys() {
        const keyStatus = await this.getSavedApiKeys();
        if (!keyStatus) return {};
        
        const loadedKeys = {};
        for (const provider in aiModels) {
            if (keyStatus[provider]) {
                const apiKey = await this.loadApiKey(provider);
                if (apiKey) {
                    loadedKeys[provider] = apiKey;
                }
            }
        }
        return loadedKeys;
    },

    // API 키 삭제
    async deleteApiKey(provider) {
        if (!this._isProviderValid(provider)) return false;
        try {
            const result = await window.electronAPI.deleteApiKey(provider);
            if (!result.success) {
                throw new Error(result.error || '메인 프로세스에서 키 삭제 실패');
            }
            console.log(`🗑️ ${provider} API 키가 삭제되었습니다.`);
            return true;
        } catch (error) {
            console.error(`❌ ${provider} API 키 삭제 중 오류 발생:`, error);
            return false;
        }
    },

    // 모든 API 키 삭제
    async clearAllApiKeys() {
        console.log('🗑️ 모든 API 키 삭제 중...');
        const keyStatus = await this.getSavedApiKeys();
        if (!keyStatus) return;

        for (const provider of Object.keys(keyStatus)) {
            await this.deleteApiKey(provider);
        }
        console.log('✅ 모든 API 키가 성공적으로 삭제되었습니다.');
    },
    
    // 저장된 키 존재 여부 확인
    async getSavedApiKeys() {
        try {
            const result = await window.electronAPI.getAllApiKeys();
            if (!result.success) {
                throw new Error(result.error || '메인 프로세스에서 키 목록 가져오기 실패');
            }
            return result.keys;
        } catch (error) {
            console.error('❌ 저장된 API 키 목록 가져오기 실패:', error);
            return {};
        }
    },
    
    // API 키 마스킹 (UI 표시용)
    maskApiKey(apiKey) {
        if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 8) {
            return "유효하지 않은 키";
        }
        return `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
    }
};

// 전역으로 사용할 수 있도록 설정
window.apiKeyManager = apiKeyManager; 