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

// API 키 관리 모듈
export const apiKeyManager = {
    // 로컬 스토리지 키 프리픽스
    storagePrefix: 'autoshorts_api_key_',
    
    // 암호화 키 생성 (브라우저별 고정 키)
    async generateEncryptionKey() {
        try {
            const encoder = new TextEncoder();
            // 브라우저별 고정된 식별자 사용
            const browserFingerprint = [
                navigator.userAgent,
                navigator.language,
                navigator.platform,
                screen.width + 'x' + screen.height,
                'autoshorts-desktop-v1'
            ].join('|');
            
            const keyMaterial = await crypto.subtle.importKey(
                'raw',
                encoder.encode(browserFingerprint),
                { name: 'PBKDF2' },
                false,
                ['deriveKey']
            );
            
            return crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt: encoder.encode('autoshorts-salt-2025-fixed'),
                    iterations: 100000,
                    hash: 'SHA-256'
                },
                keyMaterial,
                { name: 'AES-GCM', length: 256 },
                false,
                ['encrypt', 'decrypt']
            );
        } catch (error) {
            console.error('암호화 키 생성 실패:', error);
            return null;
        }
    },
    
    // API 키 암호화
    async encryptApiKey(apiKey) {
        try {
            const key = await this.generateEncryptionKey();
            const encoder = new TextEncoder();
            const data = encoder.encode(apiKey);
            
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const encrypted = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv },
                key,
                data
            );
            
            // IV와 암호화된 데이터를 함께 저장
            const combined = new Uint8Array(iv.length + encrypted.byteLength);
            combined.set(iv);
            combined.set(new Uint8Array(encrypted), iv.length);
            
            return btoa(String.fromCharCode(...combined));
        } catch (error) {
            console.error('암호화 실패, 폴백으로 Base64 사용:', error);
            return btoa(apiKey); // 폴백
        }
    },
    
    // API 키 복호화
    async decryptApiKey(encryptedData) {
        try {
            const key = await this.generateEncryptionKey();
            const combined = new Uint8Array(atob(encryptedData).split('').map(c => c.charCodeAt(0)));
            
            const iv = combined.slice(0, 12);
            const data = combined.slice(12);
            
            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                key,
                data
            );
            
            return new TextDecoder().decode(decrypted);
        } catch (error) {
            console.error('복호화 실패, 폴백으로 Base64 시도:', error);
            try {
                return atob(encryptedData); // 폴백
            } catch {
                return null;
            }
        }
    },
    
    // API 키 저장
    async saveApiKey(provider, apiKey) {
        if (!provider || !apiKey) {
            console.error('❌ API 키 저장 실패: provider 또는 apiKey가 없습니다');
            return false;
        }
        
        try {
            // 기본 형식 검증
            if (apiKey.length < 10) {
                console.error('❌ API 키가 너무 짧습니다');
                return false;
            }
            
            // 로컬 스토리지에 암호화하여 저장
            const encryptedKey = await this.encryptApiKey(apiKey);
            localStorage.setItem(`${this.storagePrefix}${provider}`, encryptedKey);
            
            // 메모리의 모델 설정에도 업데이트
            if (aiModels[provider]) {
                aiModels[provider].apiKey = apiKey;
            }
            
            console.log(`✅ ${provider} API 키 저장됨`);
            return true;
            
        } catch (error) {
            console.error('❌ API 키 저장 실패:', error);
            return false;
        }
    },
    
    // API 키 저장 (동기 버전 - 간단한 Base64만 사용)
    saveApiKeySync(provider, apiKey) {
        if (!provider || !apiKey) {
            console.error('❌ API 키 저장 실패: provider 또는 apiKey가 없습니다');
            return false;
        }
        
        try {
            // 기본 형식 검증
            if (apiKey.length < 10) {
                console.error('❌ API 키가 너무 짧습니다');
                return false;
            }
            
            // 간단한 Base64 인코딩으로 저장
            const encodedKey = btoa(apiKey);
            localStorage.setItem(`${this.storagePrefix}${provider}`, encodedKey);
            
            // 메모리의 모델 설정에도 업데이트
            if (aiModels[provider]) {
                aiModels[provider].apiKey = apiKey;
            }
            
            console.log(`✅ ${provider} API 키 저장됨 (동기 방식)`);
            return true;
            
        } catch (error) {
            console.error('❌ API 키 저장 실패:', error);
            return false;
        }
    },
    
    // API 키 로드
    async loadApiKey(provider) {
        if (!provider) {
            console.error('❌ API 키 로드 실패: provider가 없습니다');
            return null;
        }
        
        try {
            const encryptedKey = localStorage.getItem(`${this.storagePrefix}${provider}`);
            if (!encryptedKey) {
                return null;
            }
            
            // 복호화
            const apiKey = await this.decryptApiKey(encryptedKey);
            
            // 메모리의 모델 설정에도 업데이트
            if (aiModels[provider]) {
                aiModels[provider].apiKey = apiKey;
            }
            
            console.log(`✅ ${provider} API 키 로드됨`);
            return apiKey;
            
        } catch (error) {
            console.error('❌ API 키 로드 실패:', error);
            return null;
        }
    },
    
    // API 키 로드 (동기 버전 - 간단한 Base64만 사용)
    loadApiKeySync(provider) {
        if (!provider) {
            console.error('❌ API 키 로드 실패: provider가 없습니다');
            return null;
        }
        
        try {
            const encodedKey = localStorage.getItem(`${this.storagePrefix}${provider}`);
            if (!encodedKey) {
                // 이전 버전 호환성을 위해 apiKey_ 프리픽스로도 시도
                const oldKey = localStorage.getItem(`apiKey_${provider}`);
                if (oldKey) {
                    console.log(`🔄 이전 형식 API 키 발견, 마이그레이션: ${provider}`);
                    this.saveApiKeySync(provider, oldKey);
                    return oldKey;
                }
                return null;
            }
            
            // Base64 디코딩 시도
            let apiKey = null;
            try {
                apiKey = atob(encodedKey);
            } catch (e) {
                // Base64 디코딩 실패시 원본 값 사용 (이전 버전 호환)
                console.log(`🔄 Base64 디코딩 실패, 원본 값 사용: ${provider}`);
                apiKey = encodedKey;
            }
            
            // 메모리의 모델 설정에도 업데이트
            if (aiModels[provider] && apiKey) {
                aiModels[provider].apiKey = apiKey;
            }
            
            console.log(`✅ ${provider} API 키 로드됨 (동기 방식)`);
            return apiKey;
            
        } catch (error) {
            console.error('❌ API 키 로드 실패:', error);
            return null;
        }
    },
    
    // 모든 API 키 로드 (앱 시작 시)
    async loadAllApiKeys() {
        console.log('🔑 저장된 API 키들 로드 중...');
        
        let loadedCount = 0;
        const promises = Object.keys(aiModels).map(async provider => {
            const apiKey = await this.loadApiKey(provider);
            if (apiKey) {
                loadedCount++;
            }
        });
        
        await Promise.all(promises);
        
        console.log(`✅ ${loadedCount}개의 API 키 로드 완료`);
        return loadedCount;
    },
    
    // API 키 삭제
    deleteApiKey(provider) {
        if (!provider) {
            console.error('❌ API 키 삭제 실패: provider가 없습니다');
            return false;
        }
        
        try {
            localStorage.removeItem(`${this.storagePrefix}${provider}`);
            
            // 메모리의 모델 설정에서도 제거
            if (aiModels[provider]) {
                aiModels[provider].apiKey = '';
            }
            
            console.log(`✅ ${provider} API 키 삭제됨`);
            return true;
            
        } catch (error) {
            console.error('❌ API 키 삭제 실패:', error);
            return false;
        }
    },
    
    // 모든 API 키 삭제
    clearAllApiKeys() {
        console.log('🗑️ 모든 API 키 삭제 중...');
        
        let deletedCount = 0;
        Object.keys(aiModels).forEach(provider => {
            if (this.deleteApiKey(provider)) {
                deletedCount++;
            }
        });
        
        console.log(`✅ ${deletedCount}개의 API 키 삭제 완료`);
        return deletedCount;
    },
    
    // 저장된 API 키 목록 확인
    getSavedApiKeys() {
        const saved = {};
        Object.keys(aiModels).forEach(provider => {
            const hasKey = !!localStorage.getItem(`${this.storagePrefix}${provider}`);
            saved[provider] = hasKey;
        });
        return saved;
    },
    
    // API 키 마스킹 (화면 표시용)
    maskApiKey(apiKey) {
        // null, undefined 또는 빈 값 체크
        if (!apiKey) {
            return '';
        }
        
        // 문자열이 아닌 경우 문자열로 변환
        if (typeof apiKey !== 'string') {
            console.warn('⚠️ API 키가 문자열이 아닙니다:', typeof apiKey, apiKey);
            apiKey = String(apiKey);
        }
        
        // 길이 체크
        if (apiKey.length < 8) {
            return apiKey; // 너무 짧은 경우 그대로 반환
        }
        
        const start = apiKey.substring(0, 4);
        const end = apiKey.substring(apiKey.length - 4);
        const middle = '*'.repeat(Math.max(4, apiKey.length - 8));
        
        return `${start}${middle}${end}`;
    },
    
    // API 키 유효성 검사
    validateApiKey(provider, apiKey) {
        if (!provider || !apiKey) {
            return { valid: false, message: 'Provider 또는 API 키가 없습니다' };
        }
        
        // 기본 길이 검증
        if (apiKey.length < 10) {
            return { valid: false, message: 'API 키가 너무 짧습니다' };
        }
        
        // Provider별 기본 검증
        switch (provider) {
            case 'claude':
                if (!apiKey.startsWith('sk-ant-')) {
                    return { valid: false, message: 'Claude API 키는 sk-ant-로 시작해야 합니다' };
                }
                break;
            case 'gpt':
                if (!apiKey.startsWith('sk-')) {
                    return { valid: false, message: 'OpenAI API 키는 sk-로 시작해야 합니다' };
                }
                break;
            case 'gemini':
                if (apiKey.length < 30) {
                    return { valid: false, message: 'Gemini API 키는 30자 이상이어야 합니다' };
                }
                break;
            case 'groq':
                if (!apiKey.startsWith('gsk_')) {
                    return { valid: false, message: 'Groq API 키는 gsk_로 시작해야 합니다' };
                }
                break;
        }
        
        return { valid: true, message: '유효한 API 키 형식입니다' };
    }
};

// 전역으로 사용할 수 있도록 설정
window.apiKeyManager = apiKeyManager; 