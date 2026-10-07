// 순수 로직 단위 테스트 — `npm test`로 실행한다.
//
// 이 저장소는 테스트 러너를 두지 않는다. vite가 이미 의존하는 esbuild로 번들해
// node로 돌리는 방식이라 추가 의존성이 없다 (package.json의 test 스크립트 참고).
//
// 모든 좌표·정류소는 합성 데이터이며 운영 데이터를 쓰지 않는다.

import { haversineDistance, parseStationData, minutesSince, SERVICE_RADIUS_KM } from '../src/services/tashuService';
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
import { nearestCity, resolveInitialCity, getSavedCity, saveCity, isNearCity, getReturnSlots, stationSubLabel } from '../src/services/cityService';
import { splitStationName, mapSeoulRow, parsePage } from '../scripts/seoul-stations.mjs';
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
// 정류소 데이터 파싱 / 신선도 / 서비스 반경
const sampleStation = { station_id: 'S1', name: '테스트', x_pos: 36.35, y_pos: 127.38, parking_count: 3 };

check('parseStationData: 배열(이전 형식) → updatedAt null',
    (() => { const d = parseStationData([sampleStation]); return d.stations.length === 1 && d.updatedAt === null; })());
check('parseStationData: 서울 필드(rack_count, station_no) 유지, 없으면 키 생성 안 함',
    (() => {
        const d = parseStationData({ stations: [{ ...sampleStation, rack_count: 15, station_no: '102' }, sampleStation] });
        return d.stations[0].rack_count === 15 && d.stations[0].station_no === '102' && !('rack_count' in d.stations[1]) && !('station_no' in d.stations[1]);
    })());
check('parseStationData: 객체 형식 → updatedAt 유지',
    (() => { const d = parseStationData({ city: 'daejeon', updatedAt: '2026-10-07T01:00:00.000Z', stations: [sampleStation] }); return d.stations.length === 1 && d.updatedAt === '2026-10-07T01:00:00.000Z'; })());
check('parseStationData: updatedAt 누락 → null',
    parseStationData({ stations: [sampleStation] }).updatedAt === null);
check('parseStationData: 파싱 불가 updatedAt → null',
    parseStationData({ stations: [], updatedAt: '어제' }).updatedAt === null);
check('parseStationData: 잘못된 형식은 throw',
    (() => { try { parseStationData({ foo: 1 }); return false; } catch { return true; } })());
check('parseStationData: null은 throw',
    (() => { try { parseStationData(null); return false; } catch { return true; } })());

const t0 = Date.parse('2026-10-07T01:00:00.000Z');
check('minutesSince: 12분 경과', minutesSince('2026-10-07T01:00:00.000Z', t0 + 12 * 60000 + 30000) === 12);
check('minutesSince: 미래 시각은 0으로 보정', minutesSince('2026-10-07T01:00:00.000Z', t0 - 5 * 60000) === 0);

// 서울 시청 → 대전 정류소 거리는 서비스 반경을 크게 넘는다
const seoulCity = { latitude: 37.5665, longitude: 126.978 };
check('서비스 반경: 서울 위치는 대전 정류소 기준 반경 밖',
    haversineDistance(seoulCity, { latitude: 36.35, longitude: 127.38 }) > SERVICE_RADIUS_KM);
check('서비스 반경: 대전 시내는 반경 안',
    haversineDistance({ latitude: 36.351, longitude: 127.385 }, { latitude: 36.35, longitude: 127.38 }) < SERVICE_RADIUS_KM);

// ---------------------------------------------------------------
// 따릉이 수집 매핑 (scripts/seoul-stations.mjs)
const sn = splitStationName('102. 망원역 1번출구 앞');
check('따릉이 이름 분리: 번호/이름', sn.no === '102' && sn.name === '망원역 1번출구 앞');
check('따릉이 이름 분리: 번호 없는 이름은 그대로', (() => { const r = splitStationName('임시 대여소'); return r.no === undefined && r.name === '임시 대여소'; })());

const seoulRow = { stationId: 'ST-4', stationName: '102. 망원역 1번출구 앞', stationLatitude: '37.555649', stationLongitude: '126.910629', parkingBikeTotCnt: '5', rackTotCnt: '20' };
const mapped = mapSeoulRow(seoulRow);
check('따릉이 매핑: 필드 변환', !!mapped && mapped.id === 'ST-4' && mapped.name === '망원역 1번출구 앞' && mapped.station_no === '102' && mapped.address === '');
check('따릉이 매핑: x_pos=위도, y_pos=경도 (숫자)', !!mapped && mapped.x_pos === 37.555649 && mapped.y_pos === 126.910629);
check('따릉이 매핑: 대수/거치대', !!mapped && mapped.parking_count === 5 && mapped.rack_count === 20);
check('따릉이 매핑: 좌표 없으면 null', mapSeoulRow({ ...seoulRow, stationLatitude: '' }) === null && mapSeoulRow({ ...seoulRow, stationLatitude: '0', stationLongitude: '0' }) === null);
check('따릉이 매핑: rackTotCnt 0이면 rack_count 생략', mapSeoulRow({ ...seoulRow, rackTotCnt: '0' })?.rack_count === undefined);
check('따릉이 응답 파싱: total/rows', (() => { const p = parsePage({ rentBikeStatus: { list_total_count: 2, row: [seoulRow, seoulRow] } }); return p.total === 2 && p.rows.length === 2; })());
check('따릉이 응답 파싱: 오류 응답은 throw', (() => { try { parsePage({ RESULT: { CODE: 'INFO-200' } }); return false; } catch { return true; } })());

// ---------------------------------------------------------------
// 도시 선택 / 즐겨찾기 도시 구분
const daejeonLoc = { latitude: 36.35, longitude: 127.38 };
const seoulLoc = { latitude: 37.55, longitude: 126.99 };
const busanLoc = { latitude: 35.18, longitude: 129.07 };
store.clear();
check('도시 선택: 대전 위치 → daejeon', nearestCity(daejeonLoc) === 'daejeon');
check('도시 선택: 서울 위치 → seoul', nearestCity(seoulLoc) === 'seoul');
check('도시 선택: 부산 위치는 더 가까운 대전', nearestCity(busanLoc) === 'daejeon');
check('시작 도시: 위치가 있으면 위치 우선', (() => { saveCity('daejeon'); return resolveInitialCity(seoulLoc) === 'seoul'; })());
check('시작 도시: 위치 없으면 저장값', (() => { saveCity('seoul'); return resolveInitialCity(null) === 'seoul'; })());
check('시작 도시: 저장값도 없으면 대전', (() => { store.clear(); return resolveInitialCity(null) === 'daejeon'; })());
check('저장값이 손상되면 무시', (() => { store.set('od_city', 'busan'); return getSavedCity() === null; })());
check('도시 반경: 서울 위치는 서울 안, 대전 밖', isNearCity(seoulLoc, 'seoul') && !isNearCity(seoulLoc, 'daejeon'));
store.clear();

const seoulFav = mkStation('ST-4', 37.5556, 126.9106, 5);
addFavorite(seoulFav, undefined, 'seoul');
store.set('tashu_favorites', JSON.stringify([
    ...JSON.parse(store.get('tashu_favorites')!),
    { ...mkStation('OLD', 36.3, 127.4, 1), savedAt: '2026-01-01T00:00:00.000Z' }, // city 없는 이전 항목
]));
check('즐겨찾기: 서울 항목은 서울에만', getFavorites('seoul').map((f) => f.id).join() === 'ST-4');
check('즐겨찾기: city 없는 항목은 대전으로', getFavorites('daejeon').map((f) => f.id).join() === 'OLD');
check('즐겨찾기: 도시 미지정이면 전체', getFavorites().length === 2);
check('즐겨찾기: 대전 기본값 저장', (() => { clearAllFavorites(); addFavorite(favStation); return getFavorites()[0].city === 'daejeon'; })());
clearAllFavorites();

// ---------------------------------------------------------------
// 서울 전용 표시: 반납 가능 자리, 정류소 번호 보조 문구
const rackStation = { ...mkStation('ST-9', 37.55, 126.91, 8), rack_count: 20, station_no: '102' };
check('반납 자리: 서울은 거치대 - 대여 가능', getReturnSlots(rackStation, 'seoul') === 12);
check('반납 자리: 대수가 거치대보다 많아도 0 미만 없음', getReturnSlots({ ...rackStation, parking_count: 25 }, 'seoul') === 0);
check('반납 자리: 대전은 표시 안 함(null)', getReturnSlots(rackStation, 'daejeon') === null);
check('반납 자리: rack_count 없으면 null', getReturnSlots(mkStation('S', 37, 127, 3), 'seoul') === null);
check('보조 문구: 주소가 있으면 주소', stationSubLabel({ ...rackStation, address: '서울 마포구' }) === '서울 마포구');
check('보조 문구: 주소 없으면 정류소 번호', stationSubLabel({ ...rackStation, address: '' }) === '102번 정류소');
check('보조 문구: 둘 다 없으면 빈 문자열', stationSubLabel({ ...rackStation, address: '', station_no: undefined }) === '');

// ---------------------------------------------------------------
console.log(`\n================ 결과: ${pass} 통과 / ${fail} 실패 ================`);
if (fail > 0) {
    console.log('실패 목록:');
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
}
console.log('전부 통과\n');
