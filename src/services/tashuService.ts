import type { Station, Coordinates, StationWithDistance } from "../types/index";

/**
 * Fetches TASHU stations from pre-cached static JSON file.
 * Data is updated every 5 minutes via GitHub Actions.
 */
export const fetchTashuStations = async (): Promise<Station[]> => {
    try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/stations.json`);

        if (!response.ok) {
            throw new Error(`정류소 데이터를 불러올 수 없습니다. (HTTP ${response.status})`);
        }

        const rawStations: any[] = await response.json();

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
