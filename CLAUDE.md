# CLAUDE.md

이 파일은 이 저장소에서 코드 작업을 할 때 Claude Code(claude.ai/code)에 제공되는 지침입니다.

## 프로젝트 개요

**타슈 최적 경로 찾기**는 대전시의 공공자전거 '타슈'의 가장 가까운 정류소를 찾도록 도와주는 웹 애플리케이션입니다. 현재 위치 주변 정류소 찾기와 목적지 주변 정류소 찾기의 두 가지 주요 기능을 제공합니다. React, TypeScript, Vite로 구축되었으며, Leaflet을 인터랙티브 지도에 사용하고 여러 API(카카오맵, 네이버지도, 타슈 공식 API)와 통합됩니다.

## 개발 설정

### 필수 환경 변수

프로젝트 루트 디렉토리에 `.env` 파일을 생성하고 다음 변수를 추가하세요:

```env
VITE_KAKAO_API_KEY=<카카오_REST_API_키>
VITE_TASHU_PROXY_URL=<타슈_프록시_URL>
```

- **VITE_KAKAO_API_KEY**: 카카오 개발자 센터의 REST API 키 (장소 검색에 사용)
- **VITE_TASHU_PROXY_URL**: 타슈 프록시 서버 URL (정류소 데이터를 가져오는 데 필수). 이것이 없으면 앱이 정류소 데이터를 불러올 수 없습니다.

### 자주 사용하는 명령어

```bash
npm install              # 의존성 설치
npm run dev             # 개발 서버 시작 (http://localhost:5173에서 실행)
npm run build           # 프로덕션용 빌드
npm run preview         # 로컬에서 프로덕션 빌드 미리보기
npm run deploy          # GitHub Pages에 배포
```

## 아키텍처 개요

### 전체 구조

애플리케이션은 다음과 같은 클라이언트 중심 아키텍처를 따릅니다:

1. **React 컴포넌트** - 기능 컴포넌트로 나뉜 주요 UI 계층
2. **서비스 계층** - API 호출 및 비즈니스 로직 캡슐화 (locationService, tashuService, kakoApiService, naverApiService 등)
3. **타입** - 앱 전역에서 타입 안전성을 위한 중앙화된 TypeScript 타입
4. **Vite 설정** - 개발용 API 프록시 및 Tailwind CSS 지원으로 구성

### 주요 데이터 흐름

1. **앱 로드 시** (`App.tsx`):
   - `tashuService.fetchTashuStations()`을 통해 모든 타슈 정류소 데이터 가져오기
   - 지오로케이션을 사용하여 주변 정류소 검색 자동 실행
   - 환경 변수에서 API 키 로드

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

- **tashuService.ts** - 타슈 정류소 데이터 가져오기, 거리 계산, 하버사인 공식을 사용한 가장 가까운 정류소 찾기
- **locationService.ts** - 브라우저 지오로케이션 API 래퍼로 사용자의 현재 좌표 획득
- **kakoApiService.ts** - 장소 검색용 카카오 키워드 검색 API 통합 (현재 사용하는 유일한 서비스)
- **naverApiService.ts** & **naverService.ts** - 네이버맵 통합 (향후 사용을 위해 준비됨)
- **geminiService.ts** - Google Gemini AI 통합 (향후 기능을 위해 준비됨)

### 컴포넌트

- **App.tsx** - 글로벌 상태(정류소, 검색 결과, 지도 상태 등)를 관리하는 메인 애플리케이션 컴포넌트
- **TashuMap.tsx** - 정류소, 사용자 위치, 목적지 마커가 있는 Leaflet 지도 표시
- **NearbySearch.tsx** - 주변 정류소 검색을 트리거하는 UI
- **DestinationSearch.tsx** - 목적지 기반 검색을 위한 검색 양식 및 결과 표시
- **StationCard.tsx** - 액션 버튼이 있는 개별 정류소 정보 표시
- **icons.tsx** - SVG 아이콘 컴포넌트

### 타입 시스템

모든 핵심 타입은 `types.ts`에 정의되어 있습니다:

- **Station** - 타슈 API의 핵심 정류소 데이터 (id, name, x_pos/y_pos 좌표, address, parking_count)
- **StationWithDistance** - 계산된 거리가 추가된 확장된 Station
- **Coordinates** - 위도/경도 객체
- **LocationSearchResult** - 장소 검색 결과 구조
- **KakaoKeywordSearchResponse** - 카카오 API 응답 타입

**주의**: 타슈 API는 혼동의 여지가 있는 네이밍을 사용하는데, `x_pos` = 위도, `y_pos` = 경도입니다. 이는 types.ts에 문서화되어 있지만 여전히 직관적이지 않습니다.

## 중요한 구현 세부 사항

### 개발 환경에서의 API 프록시

`vite.config.ts`는 개발용 프록시 설정을 포함합니다:

- `/api/*` 경로는 타슈 API(`https://bikeapp.tashu.or.kr:50041/v1/openapi/station`)로 라우팅
- `/naver/*` 경로는 네이버 지오코딩 API로 라우팅
- `/kakao/*` 경로는 카카오 검색 API로 라우팅

이러한 프록시는 개발 전용이며 프로덕션에서는 작동하지 않습니다. 프로덕션에서는 API 호출이 API 키를 보호하기 위해 백엔드 서버를 통해 이루어져야 합니다 (kakoApiService.ts의 주석 참고).

### 거리 계산

`tashuService.ts`에 구현된 하버사인 공식을 사용하여 좌표 간 거리를 킬로미터 단위로 계산합니다. 이는 사용자 또는 목적지 위치에 가장 가까운 정류소를 찾는 데 사용됩니다.

### 상태 관리

모든 애플리케이션 상태는 React 훅(useState, useCallback, useEffect)을 사용하여 `App.tsx`에서 관리됩니다. 앱은 다음을 유지합니다:

- 정류소 데이터 (초기화 시 한 번만 로드)
- 검색 결과 (목적지 및 주변)
- 지도 상태 (중심, 확대 수준, 선택된 정류소)
- 사용자 위치
- UI 상태 (로딩, 오류, 활성 탭)
- 환경에서의 API 키

### 스타일링

프로젝트는 스타일링에 **Tailwind CSS**를 사용합니다 (컴포넌트 파일의 참고 자료 참고). CSS 모듈이나 styled-components는 사용하지 않습니다.

## 일반적인 개발 작업

### 새로운 장소 검색 공급자 추가

1. `services/` 디렉토리에 새로운 서비스 파일 생성 (예: `googleMapsService.ts`)
2. `LocationSearchResult[]`를 반환하는 검색 함수 구현
3. `App.tsx`의 `handleDestinationSearch` 함수에서 불러오고 호출
4. 필요한 환경 변수를 `.env`에 추가

### 지도 표시 문제 해결

지도 관련 로직은 `TashuMap.tsx`에 있습니다. 일반적인 문제:
- Leaflet CSS가 `index.html`에 임포트되었는지 확인
- 좌표가 [위도, 경도] 형식인지 확인 (타슈 API의 x_pos/y_pos 혼동 주의)
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

현재 테스트 프레임워크가 구성되지 않았습니다. 테스트를 추가하는 경우:
- Vitest 사용 고려 (Vite 네이티브 테스트 러너)
- 모의 지오로케이션을 사용한 위치 서비스 테스트
- tashuService 및 검색 서비스용 API 응답 모의
- 알려진 좌표 쌍을 사용한 거리 계산 테스트

## 빌드 결과물

- 프로덕션 빌드는 `dist/` 디렉토리로 출력됩니다
- 기본 경로는 vite.config.ts에서 `/TASHU-OPTIMAL-ROUTE-FINDER/`로 설정됩니다 (GitHub Pages 배포용)
- 빌드는 사용하지 않는 코드를 제거하고 번들 크기를 최적화합니다
