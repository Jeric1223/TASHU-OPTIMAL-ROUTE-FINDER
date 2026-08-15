// 순수 로직 단위 테스트 — `npm test`로 실행한다.
//
// 이 저장소는 테스트 러너를 두지 않는다. vite가 이미 의존하는 esbuild로 번들해
// node로 돌리는 방식이라 추가 의존성이 없다 (package.json의 test 스크립트 참고).
//
// 모든 좌표·정류소는 합성 데이터이며 운영 데이터를 쓰지 않는다.

import { haversineDistance } from '../src/services/tashuService';
import {
    calculateOptimalRoute,
    calculateWalkTime,
    calculateBikeTime,
    findNearestAvailableStation,
} from '../src/services/routeService';
import {
    getFavorites,
    addFavorite,
    removeFavorite,
    isFavorite,
    updateFavoriteNickname,
    clearAllFavorites,
} from '../src/services/favoriteService';
import type { Station } from '../src/types/index';

let pass = 0;
let fail = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail = '') {
    if (cond) {
        pass++;
        console.log(`  PASS  ${name}`);
    } else {
        fail++;
        failures.push(name);
        console.log(`  FAIL  ${name}${detail ? `  -> ${detail}` : ''}`);
    }
}

const near = (a: number, b: number, tol: number) => Math.abs(a - b) <= tol;

// localStorage 스텁 (Node에는 없다)
const store = new Map<string, string>();
(globalThis as any).localStorage = {
    getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
    setItem: (k: string, v: string) => void store.set(k, String(v)),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
};

// 합성 정류소. x_pos = 위도, y_pos = 경도 (이 저장소의 규약)
const mkStation = (id: string, lat: number, lng: number, count: number): Station => ({
    id,
    name: `정류소-${id}`,
    address: `대전 합성구 ${id}로`,
    x_pos: lat,
    y_pos: lng,
    parking_count: count,
});

console.log('\n================ TASHU 단위 테스트 ================\n');

// ---------------------------------------------------------------
console.log('[1] haversineDistance — 거리 계산');
// 대전역(36.3316, 127.4342) ↔ 유성온천역(36.3542, 127.3441) 직선거리 약 8.4km
const daejeonStn = { latitude: 36.3316, longitude: 127.4342 };
const yuseong = { latitude: 36.3542, longitude: 127.3441 };
const d = haversineDistance(daejeonStn, yuseong);
check('대전역-유성온천역 거리가 실제값 8.4km 근방', near(d, 8.4, 0.6), `${d.toFixed(3)}km`);
check('동일 좌표는 0km', haversineDistance(daejeonStn, daejeonStn) === 0);
check('거리는 대칭', near(d, haversineDistance(yuseong, daejeonStn), 1e-9));
check('유한한 양수 반환', Number.isFinite(d) && d > 0, String(d));

// ---------------------------------------------------------------
console.log('\n[2] x_pos=위도 / y_pos=경도 규약 (좌표 뒤바뀜 회귀 방지)');
// 정류소를 대전역 좌표로 두고 사용자도 대전역에 두면 거리는 0이어야 한다.
// 만약 x_pos/y_pos를 반대로 해석하면 수천 km가 나온다.
const atDaejeon = mkStation('S-DJ', 36.3316, 127.4342, 5);
const nearest = findNearestAvailableStation(daejeonStn, [atDaejeon]);
check('같은 지점의 정류소까지 거리는 0에 수렴', nearest !== null && near(nearest.distance!, 0, 0.001), `${nearest?.distance}`);
check('좌표를 뒤집으면 거리가 폭증 (규약 검증)', haversineDistance(daejeonStn, { latitude: 127.4342, longitude: 36.3316 }) > 1000);

// ---------------------------------------------------------------
console.log('\n[3] findNearestAvailableStation — 재고 필터링');
const stations: Station[] = [
    mkStation('S-EMPTY', 36.3317, 127.4343, 0), // 가장 가깝지만 자전거 0대
    mkStation('S-FAR', 36.3542, 127.3441, 3),   // 멀지만 재고 있음
];
const avail = findNearestAvailableStation(daejeonStn, stations);
check('자전거 0대 정류소는 제외', avail?.id === 'S-FAR', `선택된 id=${avail?.id}`);
check('재고 있는 정류소가 없으면 null', findNearestAvailableStation(daejeonStn, [mkStation('S-Z', 36.33, 127.43, 0)]) === null);
check('빈 배열이면 null', findNearestAvailableStation(daejeonStn, []) === null);

// ---------------------------------------------------------------
console.log('\n[4] 소요시간 계산 (도보 4km/h, 자전거 15km/h)');
check('도보 4km = 60분', calculateWalkTime(4) === 60, String(calculateWalkTime(4)));
check('자전거 15km = 60분', calculateBikeTime(15) === 60, String(calculateBikeTime(15)));
check('자전거가 같은 거리를 더 빨리', calculateBikeTime(10) < calculateWalkTime(10));
check('0km는 0분', calculateWalkTime(0) === 0 && calculateBikeTime(0) === 0);

// ---------------------------------------------------------------
console.log('\n[5] calculateOptimalRoute — 경로 조립');
const routeStations: Station[] = [
    mkStation('A', 36.3320, 127.4340, 8),
    mkStation('B', 36.3540, 127.3450, 4),
];
const route = calculateOptimalRoute(daejeonStn, yuseong, routeStations);
check('경로가 생성됨', route !== null);
if (route) {
    check('구간은 정확히 3개', route.segments.length === 3, String(route.segments.length));
    check('구간 순서가 도보-자전거-도보', route.segments.map((s) => s.type).join(',') === 'walk,bike,walk', route.segments.map((s) => s.type).join(','));
    const sumDur = route.segments.reduce((n, s) => n + s.duration, 0);
    check('총 소요시간 = 구간 합', route.totalDuration === sumDur, `${route.totalDuration} vs ${sumDur}`);
    const sumDist = route.segments.reduce((n, s) => n + s.distance, 0);
    check('총 거리 = 구간 합', near(route.totalDistance, sumDist, 1e-9));
    check('출발 정류소에 distance가 채워짐', typeof route.startStation.distance === 'number');
    check('도착 정류소에 distance가 채워짐', typeof route.endStation.distance === 'number');
    check('출발 정류소는 재고 보유', route.startStation.parking_count > 0);
    check('모든 구간 거리가 음수 아님', route.segments.every((s) => s.distance >= 0));
}
check('정류소가 없으면 null', calculateOptimalRoute(daejeonStn, yuseong, []) === null);
check('재고 0뿐이면 null', calculateOptimalRoute(daejeonStn, yuseong, [mkStation('N', 36.33, 127.43, 0)]) === null);

// ---------------------------------------------------------------
console.log('\n[6] favoriteService — 즐겨찾기 저장소');
clearAllFavorites();
const favStation = mkStation('F1', 36.3316, 127.4342, 7);
check('초기 상태는 빈 배열', getFavorites().length === 0);
check('추가 성공', addFavorite(favStation) === true);
check('추가 후 1건', getFavorites().length === 1);
check('isFavorite이 true', isFavorite('F1') === true);
check('중복 추가는 거부', addFavorite(favStation) === false);
check('중복 거부 후에도 1건', getFavorites().length === 1);
check('savedAt이 ISO 8601 형식', /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(getFavorites()[0].savedAt), getFavorites()[0].savedAt);
check('별명 수정 성공', updateFavoriteNickname('F1', '회사 앞') === true);
check('별명이 반영됨', getFavorites()[0].nickname === '회사 앞', String(getFavorites()[0].nickname));
check('없는 id 별명 수정은 false', updateFavoriteNickname('NOPE', 'x') === false);

// distance는 의도적으로 저장하지 않는다. 저장 시점 위치는 지금 위치와 다르므로
// 화면(FavoritesList)에서 현재 위치 기준으로 계산해야 맞다.
check(
    'distance는 저장하지 않는다 (화면에서 현재 위치 기준 계산)',
    getFavorites()[0].distance === undefined,
    `distance=${getFavorites()[0].distance}`
);
// 화면이 하는 계산과 동일한 방식이 성립하는지 확인
const savedFav = getFavorites()[0];
check(
    '저장된 좌표로 현재 위치 기준 거리 계산 가능',
    near(haversineDistance(daejeonStn, { latitude: savedFav.x_pos, longitude: savedFav.y_pos }), 0, 0.001)
);

check('삭제 성공', removeFavorite('F1') === true);
check('삭제 후 0건', getFavorites().length === 0);
check('없는 id 삭제는 false', removeFavorite('F1') === false);
check('전체 삭제 성공', (addFavorite(favStation), clearAllFavorites(), getFavorites().length === 0));

// 손상된 JSON 방어
store.set('tashu_favorites', '{쓰레기 데이터');
check('손상된 저장소에서도 빈 배열 반환 (크래시 없음)', Array.isArray(getFavorites()) && getFavorites().length === 0);
clearAllFavorites();

// ---------------------------------------------------------------
console.log(`\n================ 결과: ${pass} 통과 / ${fail} 실패 ================`);
if (fail > 0) {
    console.log('실패 목록:');
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
}
console.log('전부 통과\n');
