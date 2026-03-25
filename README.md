# 🚴 TASHU - 타슈 최적 경로 찾기

> 대전시 공공자전거 '타슈'의 가장 가까운 정류소를 찾고, 최적의 경로를 안내하는 PWA 웹 앱

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Built with React](https://img.shields.io/badge/Built%20with-React%2018-61dafb)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6)](https://www.typescriptlang.org)

## ✨ 주요 기능

### 📍 내 주변 정류소 찾기
- **현재 위치 기반** 자동 감지로 가장 가까운 타슈 정류소 검색
- 자전거 **대여 가능 수량** 실시간 표시
- 거리 표시로 빠른 판단 가능

### 🗺️ 대전 지도 통합
- **Leaflet** 기반 고성능 맵 엔진
- 모든 타슈 정류소 시각화
- 마커 클릭으로 정류소 상세 정보 확인

### 🛣️ 최적 경로 찾기
- 출발지/목적지 입력으로 **최단 경로 계산**
- 자전거 주행 구간과 도보 구간 구분 표시
- **카카오맵/네이버지도** 연동으로 실제 네비게이션

### ❤️ 즐겨찾기 관리
- 자주 가는 정류소 저장
- 빠른 접근으로 편한 사용성

### 📱 PWA (Progressive Web App)
- **앱처럼 설치 가능** (iOS, Android, PC)
- 오프라인 지원으로 네트워크 없이도 기본 기능 사용
- 빠른 로딩과 부드러운 애니메이션

---

## 🚀 빠른 시작

### 온라인 데모
```
https://kimjaehyeon.github.io/TASHU-OPTIMAL-ROUTE-FINDER/
```

### 앱으로 설치하기

**📱 모바일 (iOS)**
1. Safari에서 위 링크 방문
2. 공유 버튼 → "홈 화면에 추가"

**📱 모바일 (Android)**
1. Chrome/Edge에서 위 링크 방문
2. 우측 상단 메뉴 → "설치" 또는 자동 설치 배너 클릭

**💻 PC (Windows/Mac)**
1. Chrome/Edge에서 위 링크 방문
2. 주소창 우측 "앱 설치" 아이콘 클릭

---

## 🛠️ 로컬 개발 환경 구축

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

### 개발 서버 실행

```bash
npm run dev
```

### 프로덕션 빌드

```bash
npm run build
npm run preview
npm run deploy
```

---

## 📋 사용 방법

### 1️⃣ 내 주변 정류소 찾기
1. 앱 실행 시 위치 허용 요청
2. 자동으로 가장 가까운 정류소 표시
3. 정류소 카드에서 **카카오맵** 또는 **네이버지도** 클릭으로 길찾기

### 2️⃣ 경로 찾기
1. 하단 네비게이션 **경로 찾기** 탭 클릭
2. 출발지/목적지 입력
3. **"경로 찾기"** 버튼으로 최적 경로 계산
4. **"카카오맵으로 주행 시작"** 클릭으로 네비게이션

### 3️⃣ 즐겨찾기 관리
1. 하단 네비게이션 **즐겨찾기** 탭
2. 정류소에서 하트 아이콘으로 저장
3. 저장한 정류소 목록 관리

---

## 🏗️ 기술 스택

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

## 🎨 디자인 시스템

**Stitch 디자인 시스템** 기반의 Material Design 3

- **Primary Color**: `#006a3c` (타슈 녹색)
- **Typography**: Plus Jakarta Sans + Manrope
- **Radius**: 현대적이고 친근한 설계

---

## 📄 라이선스

MIT License - 자유롭게 사용, 수정, 배포 가능

---

## 🤝 기여 방법

1. Fork 이 저장소
2. Feature 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 커밋 (`git commit -m 'Add amazing feature'`)
4. 브랜치 Push (`git push origin feature/amazing-feature`)
5. Pull Request 열기

---

## 🚀 향후 계획

- [ ] 자전거 반납 지점 찾기
- [ ] 경로 히스토리 저장
- [ ] 추천 경로 알고리즘 개선
- [ ] 실시간 정류소 상태 업데이트
- [ ] 다국어 지원

---

## 📞 문의 & 피드백

- **Issues**: [GitHub Issues](https://github.com/kimjaehyeon/TASHU-OPTIMAL-ROUTE-FINDER/issues)
- **Email**: kim.jaehyeon@example.com

---

<div align="center">

**⭐ 이 프로젝트가 도움이 되었다면 별을 눌러주세요!**

Made with ❤️ by [Kim Jaehyeon](https://github.com/kimjaehyeon)

</div>
