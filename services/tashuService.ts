import type { Station, Coordinates, StationWithDistance } from "./types";

const TASHU_API_URL = "https://bikeapp.tashu.or.kr:50041/v1/openapi/station";
const TASHU_API_URL2 = "/api";
const TASHU_API_KEY = import.meta.env.VITE_TASHU_API_KEY;

interface TashuApiResponse {
    results: Station[];
}

export const fetchTashuStations = async (): Promise<Station[]> => {
    try {
        const response = await fetch(TASHU_API_URL2, {
            method: "GET",
            headers: {
                "api-token": TASHU_API_KEY,
            },
        });

        if (!response.ok) {
            // API 서버 자체에서 보낸 에러 메시지를 포함하여 더 명확한 오류를 제공합니다.
            const errorText = await response.text();
            throw new Error(
                `API 요청 실패 (HTTP ${response.status}). 원인: ${errorText}. CORS 프록시 서버 또는 타슈 API 서버에 일시적인 문제가 있을 수 있습니다.`
            );
        }

        const data: TashuApiResponse = await response.json();

        if (!data.results || !Array.isArray(data.results)) {
            throw new Error('API 응답 형식이 올바르지 않습니다. "results" 배열이 없습니다.');
        }

        return data.results;
    } catch (error) {
        console.error("Error fetching Tashu stations:", error);
        if (error instanceof TypeError && error.message.includes("Failed to fetch")) {
            throw new Error("네트워크 오류가 발생했습니다. 인터넷 연결을 확인하거나, 현재 사용 중인 CORS 프록시 서버가 응답하지 않는 것 같습니다.");
        }
        // 이미 생성된 커스텀 오류 메시지를 그대로 다시 던집니다.
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
