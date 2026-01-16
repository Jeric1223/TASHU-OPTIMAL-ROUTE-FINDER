
# 타슈 최적 경로 찾기 (Tashu Optimal Route Finder)

대전시 공공자전거 '타슈'를 더 편리하게 이용할 수 있도록 돕는 웹 애플리케이션입니다. 현재 위치나 목적지 주변에서 이용 가능한 가장 가까운 타슈 대여소를 찾아주고, 지도를 통해 시각적으로 정보를 제공합니다.

이 프로젝트는 클라이언트-서버 아키텍처를 따르며, 프론트엔드는 React로, 백엔드 API 로직은 Netlify 서버리스 함수로 구현되어 있습니다.

## ✨ 주요 기능

- **내 주변 타슈 찾기**: 사용자의 현재 위치를 기반으로, 자전거를 대여할 수 있는 가장 가까운 타슈 정류소를 찾아줍니다.
- **목적지로 타슈 찾기**: 사용자가 검색한 목적지에서 가장 가까운 타슈 정류소를 찾아줍니다.
- **인터랙티브 지도**: [Leaflet](https://leafletjs.com/)을 사용하여 모든 타슈 정류장, 사용자 위치, 목적지, 추천 정류소 등을 지도 위에 표시합니다.
- **실시간 대여 정보**: 각 정류소별로 대여 가능한 자전거 대수를 실시간으로 보여줍니다.
- **편리한 길찾기 연동**: 검색된 정류소에 대해 카카오맵, 네이버지도, 구글맵으로 바로 길찾기를 할 수 있는 링크를 제공합니다.
- **보안 강화**: 외부 API 키를 Netlify 서버리스 함수 내에서 안전하게 관리하여 클라이언트 노출을 방지합니다.
- **반응형 디자인**: 모바일과 데스크톱 환경 모두에 최적화된 UI/UX를 제공합니다.

## 🛠️ 기술 스택

- **프레임워크**: React, TypeScript
- **백엔드**: Netlify Functions (Node.js)
- **지도**: Leaflet, React-Leaflet
- **스타일링**: Tailwind CSS
- **위치 서비스**: Browser Geolocation API
- **장소 검색**: Kakao Maps Keyword Search API (서버리스 함수 통해 호출)
- **데이터**: **대전시 공공자전거 '타슈' 실시간 API** (서버리스 함수 통해 호출)

## 📁 프로젝트 구조

```
.
├── README.md               # 프로젝트 설명 파일
├── index.html              # 메인 HTML 파일
├── index.tsx               # React 앱 진입점
├── metadata.json           # 프로젝트 메타데이터
├── netlify.toml            # Netlify 배포 및 개발 설정
├── types.ts                # TypeScript 타입 정의
├── netlify/
│   └── functions/          # 서버리스 함수
│       ├── search.js       # Kakao 장소 검색 API 프록시
│       └── stations.js     # 타슈 정류소 데이터 API
├── components/             # React 컴포넌트
│   ├── ...
└── services/               # 비즈니스 로직 및 API 호출 서비스
    ├── locationService.ts
    ├── naverApiService.ts
    └── tashuService.ts
```


https://github.com/user-attachments/assets/487fe9cd-79d9-48dd-b36a-1436a89a9a1b

