# ⚡ 빠른 시작 (Quick Start)

## 🎯 지금 바로 테스트하기

### 1️⃣ 개발 서버 상태 확인
```bash
# 서버가 이미 실행 중입니다 ✅
# 다음 URL로 접속하세요:

http://localhost:8888
```

### 2️⃣ Chrome 브라우저 열기
```
주소창에 입력: http://localhost:8888
```

### 3️⃣ 기본 기능 확인
```
✅ 지도에 정류소 마커 표시 (8개 이상)
✅ 하단 탭 네비게이션 표시
✅ "목적지" 탭에서 "대전역" 검색
✅ 검색 결과 표시 확인
```

---

## 📊 API 상태 확인

### 터미널에서 빠른 테스트
```bash
# TASHU 정류소 데이터
curl http://localhost:8888/.netlify/functions/tashu-stations | jq '.station | length'
# 응답: 1378 ✅

# 카카오 검색
curl "http://localhost:8888/.netlify/functions/kakao-search?query=대전역" | jq '.documents[0].place_name'
# 응답: 검색된 장소 이름 ✅
```

---

## 🧪 테스트 시나리오 (5분)

### 시나리오 A: 정류소 확인
```
1. http://localhost:8888 접속
2. 지도 로드 대기 (3초)
3. 파란색 자전거 마커 확인 ✅
```

### 시나리오 B: 검색
```
1. "목적지" 탭 클릭
2. "대전역" 검색
3. 결과 표시 확인 ✅
```

### 시나리오 C: 즐겨찾기
```
1. 정류소 선택
2. 별 아이콘 클릭
3. "즐겨찾기" 탭 확인 ✅
```

---

## 🔧 개발자 도구 (F12)

### Network 탭
```
1. F12 → Network
2. http://localhost:8888 새로고침
3. API 요청 확인:
   - tashu-stations → 200 OK ✅
   - kakao-search → 200 OK (검색 시) ✅
```

### Console 탭
```
1. F12 → Console
2. 빨간 오류 없는지 확인 ✅
3. "Service Worker registered" 메시지 확인
```

---

## 🔄 코드 수정 시

```bash
# 파일 수정 후:
# 1. 자동으로 브라우저 새로고침됨
# 2. 변경사항 바로 반영
# 3. 지속적인 개발 가능
```

---

## 📚 자세한 가이드

| 문서 | 용도 |
|------|------|
| [LOCAL_TEST_GUIDE.md](./LOCAL_TEST_GUIDE.md) | 7가지 테스트 시나리오 |
| [SETUP_COMPLETE.md](./SETUP_COMPLETE.md) | 현재 상태 및 설정 |
| [DEPLOYMENT_STATUS.md](./DEPLOYMENT_STATUS.md) | 배포 준비 체크리스트 |

---

## ✨ 주요 URL

| 용도 | URL |
|------|-----|
| 웹앱 | http://localhost:8888 |
| TASHU API | http://localhost:8888/.netlify/functions/tashu-stations |
| 카카오 검색 | http://localhost:8888/.netlify/functions/kakao-search |

---

## 💡 팁

### Hot Module Replacement
```
파일 저장 → 자동 새로고침 → 상태 유지
```

### 모바일 테스트
```
F12 → Ctrl+Shift+M → 모바일 보기
또는
같은 네트워크: http://192.168.0.203:8888
```

### 캐시 비우기
```
F12 → Settings → Network → "Disable cache" 체크
```

---

## 🎊 준비 완료!

모든 준비가 완료되었습니다.
**지금 바로 http://localhost:8888 에서 시작하세요!**

---

마지막 업데이트: 2026-01-15
