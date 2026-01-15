# 타슈 최적 경로 찾기 - Netlify 배포 가이드

## 📋 사전 요구사항

- Netlify 계정 (https://netlify.com)
- Git 저장소 (GitHub, GitLab, Bitbucket)
- Node.js 20+
- Kakao 개발자 센터 REST API 키

## 🚀 배포 단계

### 1단계: Git 저장소에 푸시

```bash
# 로컬 변경사항 커밋
git add .
git commit -m "Phase 4-7 완성: 경로 안내, 즐겨찾기, PWA, 모바일 최적화"

# GitHub에 푸시
git push origin main
```

### 2단계: Netlify 연결

#### 방법 A: Netlify 대시보드에서 (추천)

1. https://app.netlify.com에 로그인
2. "New site from Git" 클릭
3. Git 제공자 선택 (GitHub/GitLab/Bitbucket)
4. 저장소 선택: `TASHU-OPTIMAL-ROUTE-FINDER`
5. Build 설정 확인:
   - Build command: `npm run build`
   - Publish directory: `dist`
   - Functions directory: `netlify/functions`

#### 방법 B: Netlify CLI 사용

```bash
# Netlify CLI 설치
npm install -g netlify-cli

# Netlify에 로그인
netlify login

# 사이트 초기화
netlify init

# 배포
netlify deploy --prod
```

### 3단계: 환경 변수 설정

Netlify 대시보드에서:

1. **Site settings** → **Build & deploy** → **Environment**
2. **Edit variables** 클릭
3. 다음 환경 변수 추가:

| 변수명 | 값 | 설명 |
|--------|-----|------|
| `KAKAO_API_KEY` | `your_kakao_rest_api_key` | 카카오 REST API 키 (kakao_search.ts에서 사용) |

**Kakao API 키 구하기:**
1. https://developers.kakao.com에 접속
2. "앱 만들기" → 새 앱 생성
3. "제품" → "카카오 로컬" → "Web 문서 검색" 활성화
4. REST API 키 복사

### 4단계: Netlify Functions 배포 확인

배포 후 다음을 확인하세요:

```bash
# 배포된 함수 확인
curl https://your-site.netlify.app/.netlify/functions/tashu-stations

# 응답 예시:
# {
#   "station": [
#     { "id": "...", "name": "...", ... }
#   ]
# }
```

## ✅ 배포 후 검증

### 기능 확인 체크리스트

- [ ] **주변 검색**
  - 위치 권한 허용 후 "현재 위치에서 검색" 클릭
  - 가장 가까운 정류소 표시 확인

- [ ] **목적지 검색**
  - 목적지 탭에서 "태평로" 등 검색
  - 검색 결과 표시 및 정류소 표시 확인

- [ ] **경로 안내**
  - 경로 탭에서 출발지와 목적지 입력
  - 경로 계산 및 소요 시간 표시 확인

- [ ] **즐겨찾기**
  - 정류소에서 별 아이콘 클릭
  - 즐겨찾기 탭에 추가 확인

- [ ] **PWA**
  - Chrome/Edge에서 주소 표시줄의 설치 버튼 확인
  - 홈화면에 추가 후 독립 앱으로 실행 확인

- [ ] **Netlify Functions**
  - 브라우저 DevTools → Network
  - `/.netlify/functions/kakao-search?query=...` 호출 확인
  - API 키 노출 안 됨 확인

### 모바일 테스트

```bash
# 모바일 장치에서 테스트
# 또는 Chrome DevTools에서 모바일 에뮬레이션 사용

# 확인 사항:
# - 하단 탭 네비게이션 표시
# - 터치 반응성 (최소 44x44px)
# - Safe Area 적용 (iPhone notch)
# - 지도 로드 및 줌/팬 동작
```

### Lighthouse 성능 측정

1. Chrome DevTools 열기 (F12)
2. "Lighthouse" 탭 선택
3. "Analyze page load" 클릭
4. 결과 확인:

| 지표 | 목표 | 현재 |
|------|------|------|
| Performance | 85+ | - |
| Accessibility | 90+ | - |
| Best Practices | 90+ | - |
| SEO | 90+ | - |
| PWA | Pass | - |

## 🔒 보안 확인

- ✅ API 키가 클라이언트에 노출되지 않음 (Netlify Functions 사용)
- ✅ HTTPS 자동 적용
- ✅ 보안 헤더 설정 (X-Frame-Options, X-Content-Type-Options 등)
- ✅ CORS 헤더 설정
- ✅ CSP (Content Security Policy) 권장

## 📊 모니터링

### Netlify Analytics 활용

1. Site settings → Analytics
2. Netlify Analytics 활성화
3. 트래픽 및 성능 모니터링

### 로그 확인

```bash
# 실시간 로그 확인
netlify logs

# 함수 로그 확인
netlify functions:invoke tashu-stations
```

## 🚨 문제 해결

### Mixed Content 오류 (이미 해결됨)
- **문제**: HTTPS 페이지에서 HTTP 리소스 로드
- **해결**: Netlify Functions로 모든 API 호출 라우팅

### 타슈 정류소 데이터 로드 안 됨
- **확인**: `/.netlify/functions/tashu-stations` 접근 가능한지 테스트
- **해결**: netlify.toml의 functions 설정 확인

### Kakao 검색 실패
- **확인**: KAKAO_API_KEY 환경 변수 설정 여부
- **해결**: Netlify 대시보드에서 환경 변수 다시 확인

### PWA 설치 버튼 안 보임
- **확인**: HTTPS 연결 확인 (필수)
- **확인**: manifest.json 유효성 확인
- **해결**: Chrome DevTools → Application → Manifest 탭에서 오류 확인

## 📝 환경 변수 템플릿

필요시 `.env.example` 파일 생성:

```env
# Kakao API Key
KAKAO_API_KEY=your_kakao_rest_api_key_here

# Netlify Functions
# (자동으로 환경에서 읽음)
```

## 🔄 지속적 배포 설정

### GitHub Actions로 자동 배포

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Netlify

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'
      - run: npm install
      - run: npm run build
      - uses: netlify/actions/cli@master
        with:
          args: deploy --prod
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

## 📞 지원

- Netlify 지원: https://support.netlify.com
- 프로젝트 이슈: GitHub Issues
- 개발 문서: CLAUDE.md 참조

---

**배포 완료!** 🎉

타슈 최적 경로 찾기가 성공적으로 배포되었습니다.
사용자들이 모바일 웹과 PWA 앱으로 자유롭게 접근할 수 있습니다.
