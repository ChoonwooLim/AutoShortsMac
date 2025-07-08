import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    host: true,
    port: 5173,
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  build: {
    // 성능 최적화 설정
    target: 'esnext',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.warn', 'console.error', 'console.debug'],
        passes: 2
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    // 청크 크기 최적화
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // 코드 스플리팅 최적화
        manualChunks: {
          // 벤더 라이브러리 분리
          'ffmpeg-vendor': ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
          'face-api-vendor': ['face-api.js'],
          'd3-vendor': ['d3-scale'],
          
          // 기능별 청크 분리
          'transcription': [
            './js/simple-transcription.js',
            './js/utils/transcription-utils.js',
            './js/utils/audio-utils.js'
          ],
          'face-analysis': [
            './js/face-analysis.js',
            './js/face-detection.js'
          ],
          'error-handling': [
            './js/utils/error-handler.js',
            './js/utils/error-recovery.js',
            './js/utils/error-debug.js'
          ],
          'ui-components': [
            './js/ui-file.js',
            './js/ui-processing.js',
            './js/ui-settings.js',
            './js/ui-theme.js',
            './js/ui-chat.js',
            './js/utils/ui-utils.js'
          ]
        },
        // 에셋 파일명 최적화
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const extType = info[info.length - 1];
          if (/\.(wasm|bin)$/i.test(assetInfo.name)) {
            return `wasm/[name]-[hash][extname]`;
          }
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name)) {
            return `images/[name]-[hash][extname]`;
          }
          if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)$/i.test(assetInfo.name)) {
            return `media/[name]-[hash][extname]`;
          }
          if (/\.css$/i.test(assetInfo.name)) {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: 'js/[name]-[hash].js',
        entryFileNames: 'js/[name]-[hash].js'
      }
    },
    // 소스맵 최적화 (프로덕션에서는 숨김)
    sourcemap: false,
    // 빌드 성능 최적화
    reportCompressedSize: false
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
    include: ['d3-scale', 'face-api.js']
  },
  assetsInclude: [
    '**/*.bin',
    '**/*.wasm'
  ],
  // 개발 서버 최적화
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : []
  },
  // 환경 변수 정의
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },
  // 플러그인 최적화 (필요시 추가)
  plugins: []
}) 