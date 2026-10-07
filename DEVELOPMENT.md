# 🛠️ 개발자 문서

타슈 최적 경로 찾기 프로젝트의 개발 환경 설정, 아키텍처, 기여 방법을 안내합니다.

---

## 로컬 개발 환경 구축

### 필수 요구사항
- Node.js 16+
- npm 또는 yarn

### 설치

```bash
git clone https://github.com/kimjaehyeon/PUBLIC-BIKE-ROUTE-FINDER.git
cd PUBLIC-BIKE-ROUTE-FINDER
npm install
```

### 환경 변수 설정

`.env` 파일 생성:

```env
VITE_KAKAO_JS_KEY=YOUR_KAKAO_JS_KEY
VITE_VWORLD_KEY=YOUR_VWORLD_KEY
```

| 변수 | 필수 | 설명 |
|------|------|------|
| `VITE_KAKAO_JS_KEY` | 필수 | 카카오 JavaScript 키 (장소 검색 SDK) |
| `VITE_VWORLD_KEY` | 선택 | VWorld 배경지도 키 (없으면 OpenStreetMap 타일로 대체) |

정류소 데이터는 GitHub Actions(`.github/workflows/test-tashu-api.yml`)가 매시 타슈 API에서 받아 `public/data/stations.json`으로 빌드에 포함한다.

### 개발 서버 실행

```bash
npm run dev        # 개발 서버 (https://localhost:5173)
npm run build      # 프로덕션 빌드
npm run preview    # 빌드 결과 로컬 미리보기
npm run typecheck  # 타입 체크
npm test           # 서비스 테스트
```

> 개발 서버는 `basicSsl` 플러그인으로 HTTPS 실행 (지오로케이션 API 요구사항)

---

## 기술 스택

- **React 18** - UI 라이브러리
- **TypeScript** - 타입 안전성
- **Vite** - 고속 번들러
- **Tailwind CSS** - 유틸리티 CSS
- **OpenLayers** - 지도 라이브러리
- **Workbox** - PWA 서비스 워커

### 외부 API
- 카카오 Maps JavaScript SDK (장소 검색)
- 타슈 공개 API
- VWorld 배경지도

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
│   ├── kakaoSdkLoader.ts    # 카카오 SDK 로더
│   ├── routeService.ts      # 경로·소요 시간 계산
│   ├── roadRouteService.ts  # 도로 경로 조회
│   └── favoriteService.ts   # 즐겨찾기 저장
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

### 배포

GitHub Actions가 정류소 데이터를 갱신·빌드한 뒤 GitHub Pages(`/PUBLIC-BIKE-ROUTE-FINDER/`)로 배포한다. 별도 프록시 서버는 없다.

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
