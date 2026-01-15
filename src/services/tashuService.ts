import type { Station, Coordinates, StationWithDistance } from "../types/index";

/**
 * Fetches TASHU stations via Vite proxy (dev) or Netlify function (prod)
 */
export const fetchTashuStations = async (): Promise<Station[]> => {
    try {
        // @ts-ignore - Vite 환경변수
        const apiKey = import.meta.env?.VITE_TASHU_API_KEY as string;
        // @ts-ignore - Vite 환경변수
        const isDev = import.meta.env?.DEV;

        let response: Response;

        if (isDev) {
            // 개발 환경: Vite 프록시 사용
            response = await fetch("/api/tashu/station", {
                method: "GET",
                headers: {
                    "api-token": apiKey || "l1zts202dh534137"
                }
            });
        } else {
            // 프로덕션: Netlify 함수 사용
            response = await fetch("/.netlify/functions/tashu-stations", {
                method: "GET"
            });
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(
                `API 요청 실패 (HTTP ${response.status}). 원인: ${errorText}.`
            );
        }

        const data = await response.json();

        // 응답 형식 처리: results (타슈 API) 또는 station (Netlify 함수)
        let rawStations: any[];
        if (data.results && Array.isArray(data.results)) {
            rawStations = data.results;
        } else if (data.station && Array.isArray(data.station)) {
            rawStations = data.station;
        } else {
            throw new Error('API 응답 형식이 올바르지 않습니다.');
        }

        // 좌표를 숫자로 변환
        const stations: Station[] = rawStations.map((item: any) => ({
            id: item.id,
            name: item.name,
            x_pos: parseFloat(item.x_pos),
            y_pos: parseFloat(item.y_pos),
            address: item.address,
            parking_count: item.parking_count
        }));

        return stations;
    } catch (error) {
        console.error("Error fetching Tashu stations:", error);
        if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
            throw new Error("네트워크 오류가 발생했습니다. 인터넷 연결을 확인하거나 잠시 후 다시 시도해주세요.");
        }
        throw error;
    }
};

/* export const fetchTashuStations = async (): Promise<Station[]> => {
    // Use fetch to load the JSON file, as direct import of JSON modules
    // is not universally supported and can cause resolution errors.
    const response = await fetch("../tashuMockData.json");
    if (!response.ok) {
        throw new Error("타슈 정류장 데이터를 불러오는 데 실패했습니다.");
    }
    const RAW_STATIONS = await response.json();

    // The raw data has inconsistent types that need to be cleaned up.
    const stations: Station[] = (RAW_STATIONS as any[])
        .map((raw: any) => ({
            id: String(raw.id),
            name: raw.name,
            x_pos: parseFloat(raw.x_pos),
            y_pos: parseFloat(raw.y_pos),
            address: raw.address,
            parking_count: Number(raw.parking_count),
        }))
        .filter((station) => station.name && station.address && !isNaN(station.x_pos) && !isNaN(station.y_pos) && !isNaN(station.parking_count)); // Filter out any invalid or incomplete entries

    return stations;
}; */

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
