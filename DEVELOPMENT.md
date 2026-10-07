# 개발자 문서

공공자전거(대전 타슈·서울 따릉이) 최적 경로 찾기 프로젝트의 개발 환경 설정, 아키텍처, 기여 방법을 안내합니다.

---

## 로컬 개발 환경 구축

### 필수 요구사항
- Node.js 16+
- npm 또는 yarn

### 설치

```bash
git clone https://github.com/Jeric1223/PUBLIC-BIKE-ROUTE-FINDER.git
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

정류소 데이터는 GitHub Actions(`.github/workflows/test-tashu-api.yml`)가 매시 정각에 받아 정적 JSON으로 빌드에 포함한다.

| 파일 | 출처 | Actions 시크릿 |
|------|------|----------------|
| `public/data/stations.json` | 대전 타슈 API | `TASHU_API_KEY` |
| `public/data/seoul-stations.json` | 서울 열린데이터광장 `bikeList` (`scripts/seoul-stations.mjs`) | `SEOUL_API_KEY` |

- 형식: `{ city, updatedAt, stations }` (구형 배열도 허용). 서울 API는 HTTP 전용이라 클라이언트가 아닌 Actions에서만 호출한다.
- 빌드에는 `VITE_KAKAO_JS_KEY`, `VITE_VWORLD_KEY` 시크릿도 전달된다.
- 서울 데이터를 로컬에서 만들려면 `node --env-file=.env scripts/seoul-stations.mjs` (`.env`에 `SEOUL_API_KEY`). 생성 파일은 커밋하지 않는다.

### 개발 서버 실행

```bash
npm run dev        # 개발 서버 (https://localhost:5173/PUBLIC-BIKE-ROUTE-FINDER/)
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
- 타슈 공개 API (대전), 서울 열린데이터광장 따릉이 API (서울)
- 카카오 Geocoder (좌표→주소)
- VWorld 배경지도

---

## 아키텍처 개요

### 전체 구조

```
src/
├── components/     # React UI 컴포넌트
├── services/       # API 호출 & 비즈니스 로직
│   ├── cityService.ts       # 도시 정의(CITIES), 선택 도시 저장, 반납 자리 계산
│   ├── tashuService.ts      # 정류소 데이터 로드·파싱, 거리 계산
│   ├── locationService.ts   # 브라우저 지오로케이션 래퍼
│   ├── kakoApiService.ts    # 카카오 장소 검색, 좌표→주소(reverseGeocode)
│   ├── kakaoSdkLoader.ts    # 카카오 SDK 로더
│   ├── routeService.ts      # 경로·소요 시간 계산
│   ├── roadRouteService.ts  # 도로 경로 조회
│   └── favoriteService.ts   # 즐겨찾기 저장
├── hooks/          # useRoadRoute, useStationAddress, useCountUp
├── types/
│   └── index.ts    # 전역 TypeScript 타입 정의
scripts/
└── seoul-stations.mjs  # 서울 정류소 수집 (Actions에서 실행)
└── App.tsx         # 상태 관리 & 메인 진입점
```

### 주요 데이터 흐름

1. **앱 로드** → 선택된 도시의 정적 JSON 로드 (`tashuService.fetchTashuStations()`)
2. **주변 검색** → `navigator.geolocation` → `tashuService.findNearestStation()` (하버사인 공식)
3. **도시 밖 위치** → 가장 가까운 정류소가 20km 초과면 도시 중심 기준 20곳을 거리 없이 표시(둘러보기)
4. **목적지 검색** → `kakoApiService.searchKakaoLocation()` → 주변 가장 가까운 정류소 탐색

### 핵심 타입 (`src/types/index.ts`)

`Station`, `StationWithDistance`, `Coordinates`, `OptimalRoute`, `RouteSegment`, `FavoriteStation`

> **주의**: 타슈 API는 `x_pos` = 위도, `y_pos` = 경도로 혼용됨

### 배포

GitHub Actions가 정류소 데이터를 갱신·빌드한 뒤 GitHub Pages(`/PUBLIC-BIKE-ROUTE-FINDER/`)로 배포한다. 별도 프록시 서버는 없다.

---

## 디자인 시스템

도시별 브랜드 색을 CSS 변수(`--brand`, `--on-brand` 등, `src/styles/index.css`)로 두고 `<html data-city>`로 전환한다. Tailwind의 `primary`/`on-primary`가 이 변수를 참조하고, 지도 캔버스(마커·클러스터)는 `readCssVar`로 같은 값을 읽는다.

- **대전**: `#FF9A24` (글자색 `#14171C`)
- **서울**: `oklch(50% 0.17 255)` (글자색 `#FFFFFF`)
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

- [ ] 서울 도로 경로 품질 개선
- [ ] 경로 히스토리 저장
- [ ] 추천 경로 알고리즘 개선
- [ ] 실시간 정류소 상태 업데이트
- [ ] 다국어 지원

---

## 테스트

테스트 프레임워크 없이 `tests/services.test.ts`를 esbuild로 번들해 node로 실행한다 (`npm test`). 데이터 파싱, 거리 계산, 도시 설정 등을 검증한다.
