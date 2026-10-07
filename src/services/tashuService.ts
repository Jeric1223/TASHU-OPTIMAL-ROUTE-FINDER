import type { Station, StationData, Coordinates, StationWithDistance } from "../types/index";

// 가장 가까운 정류소가 이보다 멀면 서비스 지역 밖으로 본다.
export const SERVICE_RADIUS_KM = 20;

/**
 * 정류소 데이터 파일을 파싱한다. 객체 `{ updatedAt, stations }`와 이전 형식(배열)을 모두 받는다.
 * 서비스 워커에 이전 형식의 파일이 캐시되어 있을 수 있기 때문이다.
 */
export const parseStationData = (raw: unknown): StationData => {
    const isObject = !!raw && typeof raw === 'object' && !Array.isArray(raw);
    const rawStations: any[] | undefined = Array.isArray(raw) ? raw : isObject ? (raw as any).stations : undefined;
    if (!Array.isArray(rawStations)) {
        throw new Error("정류소 데이터 형식이 올바르지 않습니다.");
    }

    const stations: Station[] = rawStations.map((item: any) => ({
        id: item.id,
        name: item.name,
        x_pos: parseFloat(item.x_pos),
        y_pos: parseFloat(item.y_pos),
        address: item.address,
        parking_count: item.parking_count,
        // 서울 데이터에만 있는 선택 필드. 없으면 키 자체를 만들지 않는다.
        ...(typeof item.rack_count === 'number' && { rack_count: item.rack_count }),
        ...(item.station_no && { station_no: String(item.station_no) }),
    }));

    const updatedAt = isObject && typeof (raw as any).updatedAt === 'string' && !Number.isNaN(Date.parse((raw as any).updatedAt))
        ? (raw as any).updatedAt
        : null;

    return { stations, updatedAt };
};

/**
 * Fetches stations (default: TASHU) from a pre-cached static JSON file.
 * Data is regenerated hourly via GitHub Actions.
 */
export const fetchStations = async (dataUrl: string = 'data/stations.json'): Promise<StationData> => {
    try {
        const response = await fetch(`${import.meta.env.BASE_URL}${dataUrl}`);

        if (!response.ok) {
            throw new Error(`정류소 데이터를 불러올 수 없습니다. (HTTP ${response.status})`);
        }

        return parseStationData(await response.json());
    } catch (error) {
        console.error("Error fetching stations:", error);
        if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
            throw new Error("네트워크 오류가 발생했습니다. 인터넷 연결을 확인하거나 잠시 후 다시 시도해주세요.");
        }
        throw error;
    }
};

/**
 * updatedAt으로부터 경과한 분. 시계가 어긋나 미래 시각이 오면 0으로 본다.
 */
export const minutesSince = (updatedAt: string, now: number = Date.now()): number =>
    Math.max(0, Math.floor((now - Date.parse(updatedAt)) / 60000));

/**
 * Calculates the Haversine distance between two points on the Earth.
 * @param coords1 - The first coordinates {latitude, longitude}.
 * @param coords2 - The second coordinates {latitude, longitude}.
 * @returns The distance in kilometers.
 */
export function haversineDistance(coords1: Coordinates, coords2: Coordinates): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (coords2.latitude - coords1.latitude) * (Math.PI / 180);
    const dLon = (coords2.longitude - coords1.longitude) * (Math.PI / 180);
    const lat1 = coords1.latitude * (Math.PI / 180);
    const lat2 = coords2.latitude * (Math.PI / 180);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * Finds the nearest station to a given target coordinate.
 * @param targetCoords - The coordinates to find the nearest station to.
 * @param stations - An array of all available stations.
 * @returns The nearest station with its distance, or null if no stations are provided.
 */
export const findNearestStation = (targetCoords: Coordinates, stations: Station[]): StationWithDistance | null => {
    if (!stations.length) {
        return null;
    }

    let closestStation: StationWithDistance | null = null;
    let minDistance = Infinity;

    for (const station of stations) {
        const stationCoords: Coordinates = { latitude: station.x_pos, longitude: station.y_pos };
        const distance = haversineDistance(targetCoords, stationCoords);

        if (distance < minDistance) {
            minDistance = distance;
            closestStation = { ...station, distance };
        }
    }

    return closestStation;
};

/**
 * Finds the nearest station with available bikes.
 * @param targetCoords - The user's current coordinates.
 * @param stations - An array of all available stations.
 * @returns The nearest available station with its distance, or null if none are found.
 */
export const findNearestAvailableStation = (targetCoords: Coordinates, stations: Station[]): StationWithDistance | null => {
    const availableStations = stations.filter((s) => s.parking_count > 0);
    return findNearestStation(targetCoords, availableStations);
};
