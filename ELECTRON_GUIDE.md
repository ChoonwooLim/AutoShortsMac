# 🖥️ AutoShorts Desktop - Electron 앱 가이드

## 🎉 축하합니다! AutoShorts가 데스크톱 앱으로 전환되었습니다!

AutoShorts 프로젝트가 성공적으로 Electron 기반 데스크톱 애플리케이션으로 전환되었습니다. 이제 웹 브라우저 없이도 네이티브 데스크톱 앱처럼 사용할 수 있습니다!

## 📁 프로젝트 구조

```
AutoShortsDeskTop/
├── electron/
│   ├── main.cjs          # Electron 메인 프로세스
│   └── preload.cjs       # Preload 스크립트
├── dist-electron/        # 빌드된 앱 파일들
│   ├── win-unpacked/     # 압축 해제된 앱
│   └── AutoShorts Desktop Setup 1.0.0.exe  # 설치 파일
├── js/                   # 기존 웹 앱 코드
├── css/                  # 스타일 (데스크톱 앱 스타일 포함)
└── public/              # 정적 자원
```

## 🚀 실행 방법

### 1. 개발 모드 (권장)
개발하면서 실시간으로 변경사항을 확인할 수 있습니다:

```bash
npm run electron-dev
```

이 명령어는:
- Vite 개발 서버 시작 (포트 5173)
- Electron 앱 자동 실행
- 코드 변경시 자동 새로고침

### 2. 프로덕션 모드
완성된 앱을 실행할 때:

```bash
npm run electron
```

### 3. 앱 빌드 및 배포
설치 파일을 생성할 때:

```bash
npm run electron-dist
```

생성된 파일:
- `dist-electron/AutoShorts Desktop Setup 1.0.0.exe` - Windows 설치 파일
- `dist-electron/win-unpacked/` - 포터블 버전

## 🎯 데스크톱 앱의 새로운 기능들

### 🍕 네이티브 메뉴
- **파일 > 새 프로젝트** (`Ctrl+N`) - 새 대화 시작
- **파일 > 영상 열기** (`Ctrl+O`) - 비디오 파일 선택
- **파일 > 설정** (`Ctrl+,`) - 설정 페이지 열기
- **도구 > 작업 로그** (`Ctrl+L`) - 작업 기록 확인
- **보기 > 개발자 도구** (`F12`) - 디버깅

### 🎨 향상된 드래그 앤 드롭
- 윈도우 전체에서 비디오 파일 드래그 앤 드롭 지원
- 파일이 새 창으로 열리는 것 방지
- 시각적 피드백 향상

### ⌨️ 키보드 단축키
- `Ctrl+N` - 새 대화
- `Ctrl+O` - 파일 열기
- `Ctrl+,` - 설정
- `Ctrl+L` - 작업 로그
- `F12` - 개발자 도구
- `F11` - 전체화면

### 🔔 시스템 알림
- 파일 업로드 완료시 데스크톱 알림
- 작업 완료 상태 알림

### 🎨 데스크톱 전용 스타일
- 네이티브 앱 느낌의 UI/UX
- 향상된 글래스 모피즘 효과
- 부드러운 애니메이션
- 고해상도 디스플레이 최적화

## 🛠️ 기술적 개선사항

### 🔒 보안 강화
- Context Isolation 활성화
- Node Integration 비활성화
- 안전한 Preload 스크립트 사용

### ⚡ 성능 최적화
- GPU 가속 활성화
- 메모리 관리 개선
- 백그라운드 프로세스 최적화

### 🌐 크로스 플랫폼 지원
- Windows 완전 지원
- macOS, Linux 빌드 설정 포함
- 플랫폼별 최적화

## 📦 배포 및 설치

### Windows 사용자
1. `dist-electron/AutoShorts Desktop Setup 1.0.0.exe` 실행
2. 설치 마법사 따라 진행
3. 바탕화면 또는 시작 메뉴에서 실행

### 개발자
```bash
# 개발 환경 설정
npm install

# 개발 모드 실행
npm run electron-dev

# 배포용 빌드
npm run electron-dist
```

## 🔧 환경 설정

### 필수 의존성
- Node.js 16+
- npm 또는 yarn
- Windows Build Tools (Windows)

### 개발 의존성
- Electron 37+
- Vite 5+
- Electron Builder
- Concurrently

## 🐛 문제 해결

### 자주 발생하는 문제

1. **"require is not defined" 오류**
   - ✅ 해결됨: `.cjs` 확장자 사용으로 CommonJS 강제 적용

2. **NODE_ENV 설정 오류 (Windows)**
   - ✅ 해결됨: `cross-env` 패키지 사용

3. **아이콘 설정 오류**
   - ✅ 해결됨: Windows 빌드에서 아이콘 설정 최적화

4. **포트 충돌**
   - Vite가 자동으로 다른 포트 찾음 (5173 → 5174)

### 디버깅
- `F12`로 개발자 도구 열기
- Console에서 Electron API 확인: `window.electronAPI`
- 메인 프로세스 로그: 터미널 확인

## 🎊 완료된 작업

✅ **Electron 환경 구축**
- Main 프로세스 및 Preload 스크립트 설정
- 보안 설정 강화
- Windows 빌드 환경 최적화

✅ **네이티브 기능 구현**
- 시스템 메뉴 통합
- 파일 대화상자 연동
- 키보드 단축키 지원

✅ **UI/UX 개선**
- 데스크톱 전용 스타일 추가
- 드래그 앤 드롭 향상
- 애니메이션 최적화

✅ **빌드 시스템**
- 개발/프로덕션 빌드 분리
- 설치 파일 생성
- 자동 서명 설정

## 🚀 다음 단계

1. **자동 업데이트** - Electron Updater 연동
2. **시스템 트레이** - 백그라운드 실행 지원
3. **플러그인 시스템** - 확장 기능 지원
4. **성능 모니터링** - 실시간 성능 추적

---

**🎉 AutoShorts Desktop으로 더욱 강력해진 AI 숏츠 제작 경험을 즐기세요!**

문의사항이나 버그 신고는 GitHub Issues를 이용해주세요. 