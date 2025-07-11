// @ts-ignore
import type { Station, Coordinates, StationWithDistance } from "./types";

const TASHU_API_ENDPOINT = "/.netlify/functions/stations";

/**
 * --- SERVERLESS MODE ---
 * Fetches station data from our Netlify serverless function.
 * This simulates a real-world scenario of fetching data from a dedicated API endpoint.
 * @returns A promise that resolves to an array of stations.
 */
export const fetchTashuStations = async (): Promise<Station[]> => {
    const response = await fetch(TASHU_API_ENDPOINT);
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
