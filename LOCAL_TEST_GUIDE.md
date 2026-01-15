# 로컬 개발 서버 테스트 가이드

## ⚡ 빠른 시작

### 1. 개발 서버 시작 (이미 실행 중)
```bash
# 터미널에서:
cd /Users/kimjaehyeon/Desktop/타슈/TASHU-OPTIMAL-ROUTE-FINDER
netlify dev

# 출력 예시:
# ✅ Local dev server ready: http://localhost:8888
```

### 2. Chrome 브라우저에서 열기
```
http://localhost:8888
```

---

## 🧪 테스트 시나리오

### 시나리오 1: 정류소 데이터 로드 확인

**단계:**
1. http://localhost:8888 접속
2. 페이지 완전히 로드될 때까지 대기 (3-5초)
3. 지도에 8개의 파란색 자전거 마커가 표시되는지 확인

**예상 결과:**
- 지도 중앙: 대전시 (약 36.3°N, 127.4°E)
- 마커: 8개 정류소
  - 대전역 1번 출구
  - 충남대학교
  - 대전시청
  - 대전과학관
  - 카이스트
  - 대전시민공원
  - 홈플러스 신안점
  - 대전선 월평역

**개발자 도구 확인:**
```
F12 → Network 탭:
  /.netlify/functions/tashu-stations → 200 OK
  응답: { "station": [...8개 객체...] }
```

---

### 시나리오 2: 카카오 장소 검색 테스트

**단계:**
1. "목적지" 탭 클릭 (하단 탭 네비게이션)
2. 검색창에 "대전역" 입력
3. 검색 결과가 목록으로 표시되는지 확인

**예상 결과:**
- 검색 결과 표시
- 각 결과에 이름, 주소, 거리 표시
- 클릭하면 지도에 마커 표시

**개발자 도구 확인:**
```
F12 → Network 탭:
  /.netlify/functions/kakao-search?query=... → 200 OK
  응답: { "documents": [...검색 결과...] }

F12 → Console:
  오류 메시지 없어야 함
```

---

### 시나리오 3: 현재 위치 기반 검색

**단계:**
1. "주변" 탭 클릭
2. "현재 위치에서 검색" 또는 위치 권한 요청이 표시되면 "허용"
3. 가장 가까운 정류소가 하이라이트되는지 확인

**예상 결과:**
- 현재 위치 마커 (파란색 점)
- 가장 가까운 정류소 정보 표시
- 거리 정보 표시

**개발자 도구 확인:**
```
F12 → Console:
  "위치 권한 허용됨" 또는 유사 메시지

F12 → Security:
  🔒 권한 → Geolocation 확인
```

---

### 시나리오 4: 경로 안내 테스트

**단계:**
1. "경로" 탭 클릭
2. 출발지 입력 (예: "대전역")
3. 목적지 입력 (예: "충남대학교")
4. "경로 찾기" 버튼 클릭
5. 계산된 경로 확인

**예상 결과:**
- 총 시간 표시 (예: "42분")
- 총 거리 표시 (예: "3.5km")
- 경로 세그먼트 표시:
  - 도보 구간 (회색 점선)
  - 자전거 구간 (파란 실선)
  - 도보 구간 (회색 점선)
- 각 구간별 시간과 거리

**개발자 도구 확인:**
```
F12 → Console:
  경로 계산 로그 메시지

F12 → Network:
  카카오 검색 요청 2개 (출발지, 목적지)
```

---

### 시나리오 5: 즐겨찾기 기능 테스트

**단계:**
1. 임의의 정류소 카드 클릭 (지도의 마커 또는 검색 결과)
2. 별 아이콘 클릭하여 즐겨찾기 추가
3. "즐겨찾기" 탭으로 이동
4. 저장된 정류소 목록 확인

**예상 결과:**
- 별 아이콘이 노란색으로 변함 (채워짐)
- 즐겨찾기 탭에서 저장된 정류소 표시
- 새로고침 후에도 데이터 유지 (LocalStorage)
- 별 아이콘 다시 클릭으로 제거 가능

**개발자 도구 확인:**
```
F12 → Application → Local Storage:
  http://localhost:8888
    tashu_favorites: [{"id": "...", "name": "...", ...}]
```

---

### 시나리오 6: PWA 설치 테스트 (Chrome)

**단계:**
1. 주소창 확인 (오른쪽 끝)
2. 설치 버튼 표시 여부 확인
3. "설치" 또는 "앱 설치" 버튼 클릭
4. 설치 대화상자 완료

**예상 결과:**
- 주소창에 설치 버튼 표시 (↓ 아이콘 또는 "앱 설치")
- 설치 후 홈화면에 아이콘 추가
- 독립 실행형 창으로 열기 가능
- 윈도우 제목: "타슈 최적 경로 찾기"

**개발자 도구 확인:**
```
F12 → Application → Manifest:
  ✅ manifest.json 로드 확인
  name: "타슈 최적 경로 찾기"
  short_name: "TASHU"
  display: "standalone"

F12 → Application → Service Workers:
  ✅ Service Worker 활성화 상태
  상태: "activated and running"
```

---

### 시나리오 7: 모바일 반응형 테스트

**단계 A: DevTools 에뮬레이션 사용**
1. F12 → DevTools 열기
2. Ctrl+Shift+M (또는 설정 아이콘 → "Device emulation")
3. 기기 선택 (예: "iPhone 14")
4. 하단 탭 네비게이션 표시 확인

**단계 B: 실제 모바일 기기 테스트**
1. 같은 네트워크의 모바일에서 열기:
   ```
   http://192.168.0.203:8888
   ```

**예상 결과 (모바일):**
- 하단에 4개의 탭: 주변, 목적지, 경로, 즐겨찾기
- 각 탭의 아이콘과 텍스트 표시
- 탭 클릭으로 화면 전환
- Safe Area 적용 (iPhone notch 아래)

**예상 결과 (데스크톱):**
- 상단 탭 네비게이션 표시
- 하단 탭 네비게이션 숨겨짐

**개발자 도구 확인:**
```
F12 → Rendering:
  Paint flashing: 활성화하여 리페인트 성능 확인

F12 → Lighthouse:
  Mobile 모드에서 Performance 90+ 확인
```

---

## 🔍 자세한 개발자 도구 검사

### Network 탭 (API 호출 확인)

1. F12 → Network 탭 열기
2. 페이지 새로고침 (Ctrl+R)
3. 요청 필터링:

**정류소 API:**
```
이름: tashu-stations
메서드: GET
상태: 200
URL: http://localhost:8888/.netlify/functions/tashu-stations
응답 헤더:
  Content-Type: application/json
  Access-Control-Allow-Origin: *
  Cache-Control: public, max-age=60
응답 본문:
  {
    "station": [
      {
        "id": "TASHU001",
        "name": "대전역 1번 출구",
        ...
      },
      ...
    ]
  }
```

**카카오 검색 (검색 시):**
```
이름: kakao-search?query=...
메서드: GET
상태: 200
URL: http://localhost:8888/.netlify/functions/kakao-search?query=...
응답 헤더:
  Content-Type: application/json
  Cache-Control: public, max-age=300
응답 본문:
  {
    "documents": [...],
    "meta": {...}
  }
```

### Console 탭 (오류 확인)

**확인할 사항:**
- ❌ 빨간 오류 메시지 없음
- ⚠️ 노란 경고는 대부분 무해
- ✅ TASHU, Kakao 관련 성공 로그 확인

**예상 로그:**
```
[vite] new dependencies optimized: ...
workbox v6.x precached ... files
Service Worker registered successfully
TASHU stations loaded: 8 stations
```

### Application 탭 (저장소 확인)

1. F12 → Application 탭
2. Local Storage → http://localhost:8888
3. 저장된 데이터 확인:

```
Key: tashu_favorites
Value: [
  {
    "id": "TASHU001",
    "name": "대전역 1번 출구",
    "savedAt": "2026-01-15T...",
    ...
  }
]
```

4. Service Workers 확인:
   - 상태: "activated and running"
   - 업데이트: "Check for updates" 버튼

---

## 📊 성능 측정 (Lighthouse)

1. F12 → Lighthouse 탭 (최신 Chrome)
2. "Generate report" 클릭 (모바일 모드 권장)
3. 결과 확인:

**목표 지표:**
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 90+
- PWA: ✅ 통과

---

## ✅ 최종 체크리스트

- [ ] 정류소 마커 8개 표시
- [ ] 카카오 장소 검색 동작
- [ ] 현재 위치 권한 요청
- [ ] 경로 계산 동작
- [ ] 즐겨찾기 추가/제거
- [ ] 모바일 탭 네비게이션
- [ ] PWA 설치 버튼 표시
- [ ] Service Worker 활성화
- [ ] Console 오류 없음
- [ ] Network 요청 모두 200 상태
- [ ] Lighthouse Performance 90+

---

## 🆘 문제 해결

### 문제: 정류소 마커가 표시되지 않음

**확인:**
1. 콘솔에 오류 메시지가 있는지 확인
2. Network 탭에서 tashu-stations 요청 확인:
   ```bash
   curl http://localhost:8888/.netlify/functions/tashu-stations
   ```
3. Leaflet CSS 로드 확인:
   ```
   F12 → Sources → 좌측 패널에서 leaflet.css 검색
   ```

**해결:**
- 페이지 새로고침 (Ctrl+Shift+R)
- 브라우저 캐시 비우기 (DevTools → Settings → Network → "Disable cache")
- `netlify dev` 재시작

---

### 문제: 카카오 검색이 0개 결과 반환

**확인:**
1. `.env.local` 파일에 KAKAO_API_KEY 있는지 확인
2. 콘솔 오류 메시지 확인
3. 직접 API 테스트:
   ```bash
   curl "http://localhost:8888/.netlify/functions/kakao-search?query=대전"
   ```

**해결:**
- `.env.local` 파일에 유효한 API 키 확인
- `netlify dev` 재시작

---

### 문제: 위치 권한이 요청되지 않음

**확인:**
1. 브라우저 주소창 옆 권한 아이콘 확인
2. 콘솔 오류 메시지 확인

**해결:**
- 권한 초기화:
  ```
  F12 → Settings → Cookies and site data
  "http://localhost:8888" 삭제
  ```
- 페이지 새로고침
- HTTPS 필요 (로컬호스트는 예외)

---

### 문제: Service Worker가 활성화되지 않음

**확인:**
```
F12 → Application → Service Workers
상태를 확인하고 오류 메시지 읽기
```

**해결:**
- HTTPS 필요 (로컬호스트는 가능)
- manifest.json 유효성 확인:
  ```
  F12 → Application → Manifest
  ```
- 브라우저 캐시 비우기
- `netlify dev` 재시작

---

## 📱 모바일 에뮬레이션 기기 추천

- iPhone 14 (기본)
- iPhone 14 Pro (노치 테스트)
- Galaxy S21 (Android)
- Pixel 6 (Android)

---

**마지막 업데이트**: 2026-01-15
**Netlify Dev Server**: http://localhost:8888 ✅
