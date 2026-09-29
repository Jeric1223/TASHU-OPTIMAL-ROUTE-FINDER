// 실제 도로를 따라가는 경로 좌표를 받아온다 (OSM 커뮤니티 OSRM, 키 불필요·CORS 허용).
// 무료 공용 서버라 SLA가 없다. 실패·지연 시 null을 돌려주고, 호출부가 직선으로 폴백한다.
const BASE = 'https://routing.openstreetmap.de';
const TIMEOUT_MS = 6000;

export type RoadProfile = 'bike' | 'foot';
export type LonLat = [number, number];

// 같은 구간을 다시 요청하지 않는다 (탭 전환·재계산 대비). 좌표는 ~1m 단위로 맞춘다.
const cache = new Map<string, LonLat[]>();
const key = (p: RoadProfile, a: LonLat, b: LonLat) =>
    `${p}:${a[0].toFixed(5)},${a[1].toFixed(5)};${b[0].toFixed(5)},${b[1].toFixed(5)}`;

export const fetchRoadPath = async (
    profile: RoadProfile,
    from: LonLat,
    to: LonLat,
    signal?: AbortSignal
): Promise<LonLat[] | null> => {
    const k = key(profile, from, to);
    const hit = cache.get(k);
    if (hit) return hit;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    const onAbort = () => ctrl.abort();
    signal?.addEventListener('abort', onAbort);
    try {
        // 경로 프로파일은 URL 앞부분(routed-bike/routed-foot)으로 정하고, 뒤의 'driving'은 고정 표기다
        const url = `${BASE}/routed-${profile}/route/v1/driving/${from[0]},${from[1]};${to[0]},${to[1]}?overview=full&geometries=geojson`;
        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) return null;
        const data = await res.json();
        const coords: LonLat[] | undefined = data?.routes?.[0]?.geometry?.coordinates;
        if (data?.code !== 'Ok' || !coords || coords.length < 2) return null;
        cache.set(k, coords);
        return coords;
    } catch {
        return null;
    } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
    }
};
