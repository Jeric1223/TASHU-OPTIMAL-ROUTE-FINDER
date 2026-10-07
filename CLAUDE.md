# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

**공공자전거 최적 경로 찾기**는 대전 '타슈'와 서울 '따릉이'의 가장 가까운 정류소를 찾고 최적 경로를 안내하는 PWA 웹 애플리케이션입니다. React, TypeScript, Vite로 구축되었으며, OpenLayers 지도(VWorld 타일)와 카카오 장소 검색, 타슈·따릉이 API를 통합합니다. 별도 백엔드 없이 GitHub Actions가 정류소 데이터를 정적 JSON으로 만들어 GitHub Pages에 배포하고, Workbox로 오프라인 캐싱을 지원합니다.

## 개발 설정

### 필수 환경 변수

프로젝트 루트 디렉토리에 `.env` 파일을 생성하고 다음 변수를 추가하세요:

```env
VITE_KAKAO_JS_KEY=<카카오_JavaScript_키>
VITE_VWORLD_KEY=<VWorld_키>  # 선택사항
```

- **VITE_KAKAO_JS_KEY**: 카카오 JavaScript 키 (`kakaoSdkLoader.ts`에서 SDK 로드, 장소 검색에 사용)
- **VITE_VWORLD_KEY**: VWorld 배경지도 키. 없으면 OpenStreetMap 타일로 대체 (`TashuMap.tsx`)
- 타슈 API 키(`TASHU_API_KEY`)는 GitHub Actions 시크릿에만 있고, 클라이언트는 사용하지 않습니다.

### 자주 사용하는 명령어

```bash
npm install              # 의존성 설치
npm run dev             # 개발 서버 시작 (http://localhost:5173에서 실행)
npm run build           # 프로덕션용 빌드
npm run preview         # 로컬에서 프로덕션 빌드 미리보기
npm run typecheck       # tsc --noEmit
npm test                # tests/services.test.ts 실행 (esbuild 번들 후 node)
```

개발 서버는 `basicSsl` 플러그인으로 HTTPS로 실행됩니다 (지오로케이션 API가 HTTPS를 요구). 경로 별칭 `@`는 `src/`를 가리킵니다.

## 아키텍처 개요

### 전체 구조

애플리케이션은 다음과 같은 클라이언트 중심 아키텍처를 따릅니다:

1. **React 컴포넌트** - 기능 컴포넌트로 나뉜 주요 UI 계층
2. **서비스 계층** - API 호출 및 비즈니스 로직 캡슐화 (locationService, tashuService, kakoApiService, routeService 등)
3. **타입** - 앱 전역에서 타입 안전성을 위한 중앙화된 TypeScript 타입
4. **Vite 설정** - PWA(Workbox), HTTPS 개발 서버, `@` 경로 별칭

### 주요 데이터 흐름

1. **앱 로드 시** (`App.tsx`):
   - `tashuService.fetchTashuStations()`이 `public/data/stations.json`(빌드에 포함된 정적 파일)을 가져옴
   - 지오로케이션을 사용하여 주변 정류소 검색 자동 실행

2. **주변 검색**:
   - `navigator.geolocation`을 사용하여 사용자의 현재 위치 획득 (locationService 사용)
   - `tashuService.findNearestStation()`을 호출하여 가장 가까운 정류소 찾기
   - 하버사인(haversine) 거리 공식을 사용하여 계산

3. **목적지 검색**:
   - 사용자가 목적지 검색어 입력
   - `kakoApiService.searchKakaoLocation()`이 카카오 API를 통해 일치하는 장소 검색
   - 사용자가 결과 중 선택 후, 해당 위치 주변의 가장 가까운 정류소 찾기
   - 지도 중심 및 확대 수준이 결과에 맞게 조정

### 주요 서비스

- **tashuService.ts** - 정류소 데이터(`stations.json`) 로드, 하버사인 거리 계산
- **routeService.ts** - 가장 가까운 정류소, 도보/자전거 소요 시간 계산
- **roadRouteService.ts** / `hooks/useRoadRoute.ts` - 도로 경로 조회
- **locationService.ts** - 브라우저 지오로케이션 API 래퍼
- **kakoApiService.ts** + **kakaoSdkLoader.ts** - 카카오 JavaScript SDK 기반 장소 검색
- **favoriteService.ts** - 즐겨찾기 저장

### 타입 시스템

모든 핵심 타입은 `src/types/index.ts`에 정의되어 있습니다. 주요 타입: `Station`, `StationWithDistance`, `Coordinates`, `OptimalRoute`, `RouteSegment`, `FavoriteStation`.

**주의**: 타슈 API는 혼동의 여지가 있는 네이밍을 사용하는데, `x_pos` = 위도, `y_pos` = 경도입니다.

### 데이터 갱신 & 배포

서버리스 백엔드는 없습니다. `.github/workflows/test-tashu-api.yml`이 매시 정각에 타슈 API(`stations.json`)와 서울 따릉이 API(`scripts/seoul-stations.mjs` → `seoul-stations.json`, 시크릿 `SEOUL_API_KEY`)를 호출해 정적 JSON을 생성하고, 빌드 후 GitHub Pages로 배포합니다. 도시는 `services/cityService.ts`의 `CITIES`로 정의하며, 도시별 브랜드 색은 `<html data-city>` + CSS 변수(`--brand` 등)로 전환합니다.

## 중요한 구현 세부 사항

### 런타임 캐싱

`vite.config.ts`의 Workbox 설정이 배경지도 타일(VWorld/OSM)은 CacheFirst, `/data/stations.json`은 NetworkFirst(5분)로 캐시합니다.

### 거리 계산

`tashuService.ts`에 구현된 하버사인 공식을 사용하여 좌표 간 거리를 킬로미터 단위로 계산합니다. 이는 사용자 또는 목적지 위치에 가장 가까운 정류소를 찾는 데 사용됩니다.

### 상태 관리

모든 애플리케이션 상태는 React 훅(useState, useCallback, useEffect)을 사용하여 `App.tsx`에서 관리됩니다. 앱은 다음을 유지합니다:

- 정류소 데이터 (초기화 시 한 번만 로드)
- 검색 결과 (목적지 및 주변)
- 지도 상태 (중심, 확대 수준, 선택된 정류소)
- 사용자 위치
- UI 상태 (로딩, 오류, 활성 탭)

### 스타일링

프로젝트는 스타일링에 **Tailwind CSS**를 사용합니다 (컴포넌트 파일의 참고 자료 참고). CSS 모듈이나 styled-components는 사용하지 않습니다.

## 일반적인 개발 작업

### 새로운 장소 검색 공급자 추가

1. `services/` 디렉토리에 새로운 서비스 파일 생성 (예: `googleMapsService.ts`)
2. `LocationSearchResult[]`를 반환하는 검색 함수 구현
3. `RouteSearch.tsx`에서 불러오고 호출
4. 필요한 환경 변수를 `.env`에 추가

### 지도 표시 문제 해결

지도 관련 로직은 `TashuMap.tsx`(OpenLayers)에 있습니다. 일반적인 문제:
- OpenLayers는 [경도, 위도] 순서로 `fromLonLat`에 넘긴다 (타슈 API의 x_pos=위도/y_pos=경도 혼동 주의)
- 지도 컨테이너가 CSS에서 명시적인 높이 설정을 가지고 있는지 확인

### API 실패 처리

각 서비스는 사용자 친화적인 한국어 오류 메시지가 포함된 오류 처리를 포함합니다. 새로운 API 통합을 추가할 때:
- 항상 try/catch를 사용하고 의미 있는 오류 메시지 제공
- 디버깅을 위해 자세한 오류를 콘솔에 기록
- 간단한 사용자 메시지를 UI에 표시 (`dataError`, `searchError` 같은 상태를 통해)

### 거리 기반 기능

`tashuService.ts`의 하버사인 거리 계산은 다음의 기초입니다:
- 가장 가까운 정류소 찾기
- 사용 가능한 정류소 필터링
- 근접도에 따른 결과 정렬

대체 거리 알고리즘을 구현하거나 반경 기반 필터를 추가하는 경우 이를 수정하세요.

## 성능 고려 사항

- 정류소 데이터는 앱 로드 시 한 번만 가져오고 컴포넌트 상태에 캐시됩니다
- 거리 계산은 클라이언트 측에서 발생 (하버사인 공식은 빠름)
- 지도 업데이트는 React 리렌더링을 사용하며, 성능이 저하되면 대규모 정류소 데이터세트가 메모이제이션의 이점을 얻을 수 있습니다
- API 응답은 적절한 크기여야 하며, 타슈 정류소 목록이 크게 증가하면 모니터링 필요

## 테스트

테스트 프레임워크 없이 `tests/services.test.ts`를 esbuild로 번들해 node로 실행합니다 (`npm test`).

## 빌드 결과물

- 프로덕션 빌드는 `dist/` 디렉토리로 출력됩니다
- 기본 경로는 vite.config.ts에서 `/PUBLIC-BIKE-ROUTE-FINDER/`로 설정됩니다 (GitHub Pages 기준)
- 빌드는 사용하지 않는 코드를 제거하고 번들 크기를 최적화합니다
