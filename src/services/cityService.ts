import type { CityConfig, CityId, Coordinates, Station } from '../types/index';
import { haversineDistance } from './tashuService';

export const CITIES: Record<CityId, CityConfig> = {
    daejeon: {
        id: 'daejeon',
        name: '대전',
        serviceName: '타슈',
        center: [36.351, 127.385],
        dataUrl: 'data/stations.json',
        hasReturnSlots: false,
    },
    seoul: {
        id: 'seoul',
        name: '서울',
        serviceName: '따릉이',
        center: [37.5665, 126.978],
        dataUrl: 'data/seoul-stations.json',
        hasReturnSlots: true,
    },
};

export const CITY_LIST: CityConfig[] = [CITIES.daejeon, CITIES.seoul];
export const DEFAULT_CITY: CityId = 'daejeon';

// 내 위치가 이 거리 안이면 지도를 내 위치에 맞추고, 밖이면 도시 중심에 맞춘다
export const CITY_RADIUS_KM = 50;

const STORAGE_KEY = 'od_city';

export const isCityId = (v: unknown): v is CityId => v === 'daejeon' || v === 'seoul';

export const getSavedCity = (): CityId | null => {
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        return isCityId(v) ? v : null;
    } catch {
        return null; // 저장소 차단 시 저장값 없음으로 본다
    }
};

export const saveCity = (id: CityId): void => {
    try {
        localStorage.setItem(STORAGE_KEY, id);
    } catch {
        // 저장소 차단 시 이번 세션만 유지
    }
};

const distanceToCity = (coords: Coordinates, id: CityId): number =>
    haversineDistance(coords, { latitude: CITIES[id].center[0], longitude: CITIES[id].center[1] });

/** 내 위치에서 중심이 가장 가까운 도시 */
export const nearestCity = (coords: Coordinates): CityId =>
    CITY_LIST.reduce((best, c) => (distanceToCity(coords, c.id) < distanceToCity(coords, best.id) ? c : best)).id;

export const isNearCity = (coords: Coordinates, id: CityId): boolean =>
    distanceToCity(coords, id) <= CITY_RADIUS_KM;

/** 시작 도시: 위치 → 마지막 선택 → 대전 */
export const resolveInitialCity = (coords: Coordinates | null): CityId =>
    coords ? nearestCity(coords) : getSavedCity() ?? DEFAULT_CITY;

/** 반납 가능 자리 수. 거치대 총수를 모르는 도시(대전)나 데이터는 null */
export const getReturnSlots = (station: Station, city: CityId): number | null =>
    CITIES[city].hasReturnSlots && station.rack_count !== undefined
        ? Math.max(0, station.rack_count - station.parking_count)
        : null;

/** 정류소 이름 아래에 보여줄 보조 문구. 주소가 없으면 정류소 번호 */
export const stationSubLabel = (station: Station): string =>
    station.address || (station.station_no ? `${station.station_no}번 정류소` : '');
