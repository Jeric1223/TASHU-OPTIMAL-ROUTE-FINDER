# 🛠️ 개발자 문서

타슈 최적 경로 찾기 프로젝트의 개발 환경 설정, 아키텍처, 기여 방법을 안내합니다.

---

## 로컬 개발 환경 구축

### 필수 요구사항
- Node.js 16+
- npm 또는 yarn

### 설치

```bash
git clone https://github.com/kimjaehyeon/TASHU-OPTIMAL-ROUTE-FINDER.git
cd TASHU-OPTIMAL-ROUTE-FINDER
npm install
```

### 환경 변수 설정

`.env` 파일 생성:

```env
VITE_KAKAO_API_KEY=YOUR_KAKAO_API_KEY
VITE_TASHU_PROXY_URL=https://your-proxy-server.com
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

| 변수 | 필수 | 설명 |
|------|------|------|
| `VITE_KAKAO_API_KEY` | 필수 | 카카오 개발자 센터의 REST API 키 (장소 검색) |
| `VITE_TASHU_PROXY_URL` | 필수 | 타슈 정류소 데이터를 가져오는 프록시 서버 URL |
| `GEMINI_API_KEY` | 선택 | Google Gemini AI API 키 |

### 개발 서버 실행

```bash
npm run dev        # 개발 서버 (https://localhost:5173)
npm run build      # 프로덕션 빌드
npm run preview    # 빌드 결과 로컬 미리보기
npm run deploy     # GitHub Pages 배포
```

> 개발 서버는 `basicSsl` 플러그인으로 HTTPS 실행 (지오로케이션 API 요구사항)

---

## 기술 스택

- **React 18** - UI 라이브러리
- **TypeScript** - 타입 안전성
- **Vite** - 고속 번들러
- **Tailwind CSS** - 유틸리티 CSS
- **Leaflet** - 지도 라이브러리
- **Workbox** - PWA 서비스 워커

### 외부 API
- 카카오 Maps/Local API
- 타슈 공개 API
- 네이버 지도

---

## 아키텍처 개요

### 전체 구조

```
src/
├── components/     # React UI 컴포넌트
├── services/       # API 호출 & 비즈니스 로직
│   ├── tashuService.ts      # 정류소 데이터, 거리 계산
│   ├── locationService.ts   # 브라우저 지오로케이션 래퍼
│   ├── kakoApiService.ts    # 카카오 장소 검색
│   ├── naverApiService.ts   # 네이버 지도 (준비됨)
│   └── geminiService.ts     # Gemini AI (준비됨)
├── types/
│   └── index.ts    # 전역 TypeScript 타입 정의
└── App.tsx         # 상태 관리 & 메인 진입점
```

### 주요 데이터 흐름

1. **앱 로드** → `tashuService.fetchTashuStations()`로 전체 정류소 데이터 로드
2. **주변 검색** → `navigator.geolocation` → `tashuService.findNearestStation()` (하버사인 공식)
3. **목적지 검색** → `kakoApiService.searchKakaoLocation()` → 주변 가장 가까운 정류소 탐색

### 핵심 타입 (`src/types/index.ts`)

`Station`, `StationWithDistance`, `Coordinates`, `OptimalRoute`, `RouteSegment`, `FavoriteStation`

> **주의**: 타슈 API는 `x_pos` = 위도, `y_pos` = 경도로 혼용됨

### API 프록시 구조

- **개발**: `vite.config.ts` 프록시 설정
  - `/api/tashu/*` → `https://bikeapp.tashu.or.kr:50041/v1/openapi/*`
  - `/api/kakao/*` → `https://dapi.kakao.com/*`
- **프로덕션**: `netlify/functions/`의 서버리스 함수로 API 키 보호

---

## 디자인 시스템

**Stitch 디자인 시스템** 기반의 Material Design 3

- **Primary Color**: `#006a3c` (타슈 녹색)
- **Typography**: Plus Jakarta Sans + Manrope
- **스타일링**: Tailwind CSS (CSS 모듈/styled-components 미사용)

---

## 기여 방법

1. Fork 이 저장소
2. Feature 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 커밋 (`git commit -m 'Add amazing feature'`)
4. 브랜치 Push (`git push origin feature/amazing-feature`)
5. Pull Request 열기

---

## 향후 계획

- [ ] 자전거 반납 지점 찾기
- [ ] 경로 히스토리 저장
- [ ] 추천 경로 알고리즘 개선
- [ ] 실시간 정류소 상태 업데이트
- [ ] 다국어 지원

---

## 테스트

현재 테스트 프레임워크 미구성. 추가 시 권장 방향:
- **Vitest** (Vite 네이티브 테스트 러너)
- 모의 지오로케이션으로 위치 서비스 테스트
- 알려진 좌표 쌍으로 거리 계산 검증
