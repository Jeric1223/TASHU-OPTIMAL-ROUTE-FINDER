import type { Coordinates, OptimalRoute, RouteSegment, Station, StationWithDistance } from '../types/index';
import { haversineDistance } from './tashuService';

// Constants for speed calculations
// 앱 전체의 소요 시간은 이 속도 하나로 계산한다 (경로·주변 카드·즐겨찾기 공통)
const WALK_SPEED = 4; // km/h
const BIKE_SPEED = 15; // km/h

/**
 * Calculate the time required to walk a distance
 * @param distanceKm - distance in kilometers
 * @returns time in minutes
 */
export const calculateWalkTime = (distanceKm: number): number => {
    return Math.round((distanceKm / WALK_SPEED) * 60);
};

/**
 * Calculate the time required to bike a distance
 * @param distanceKm - distance in kilometers
 * @returns time in minutes
 */
export const calculateBikeTime = (distanceKm: number): number => {
    return Math.round((distanceKm / BIKE_SPEED) * 60);
};

/**
 * Calculate optimal route from start coordinates to destination coordinates
 * Route: Walk to nearest station -> Bike between stations -> Walk to destination
 */
export const calculateOptimalRoute = (
    startCoords: Coordinates,
    destCoords: Coordinates,
    stations: Station[]
): OptimalRoute | null => {
    // Find nearest available start station
    const startStation = findNearestAvailableStation(startCoords, stations);
    if (!startStation) return null;

    // Find nearest destination station
    const endStation = findNearestStation(destCoords, stations);
    if (!endStation) return null;

    // Calculate distances
    const walkToStartDist = haversineDistance(startCoords, {
        latitude: startStation.x_pos,
        longitude: startStation.y_pos,
    });

    const bikeDistance = haversineDistance(
        { latitude: startStation.x_pos, longitude: startStation.y_pos },
        { latitude: endStation.x_pos, longitude: endStation.y_pos }
    );

    const walkFromEndDist = haversineDistance(
        { latitude: endStation.x_pos, longitude: endStation.y_pos },
        destCoords
    );

    // Create route segments
    const segments: RouteSegment[] = [
        {
            type: 'walk',
            distance: walkToStartDist,
            duration: calculateWalkTime(walkToStartDist),
            startPoint: {
                type: 'start',
                name: '출발지',
                coords: startCoords,
            },
            endPoint: startStation,
        },
        {
            type: 'bike',
            distance: bikeDistance,
            duration: calculateBikeTime(bikeDistance),
            startPoint: startStation,
            endPoint: endStation,
        },
        {
            type: 'walk',
            distance: walkFromEndDist,
            duration: calculateWalkTime(walkFromEndDist),
            startPoint: endStation,
            endPoint: {
                type: 'destination',
                name: '목적지',
                coords: destCoords,
            },
        },
    ];

    const totalDistance = walkToStartDist + bikeDistance + walkFromEndDist;
    const totalDuration = segments.reduce((sum, seg) => sum + seg.duration, 0);

    return {
        segments,
        totalDistance,
        totalDuration,
        startStation: { ...startStation, distance: walkToStartDist },
        endStation: { ...endStation, distance: walkFromEndDist },
    };
};

/**
 * 직선 거리로 만든 경로에 도로 거리를 반영한다 (roadKm[i]가 null이면 그 구간은 그대로 둔다).
 * 시간은 OSRM의 duration 대신 도로 거리 ÷ 앱 속도로 다시 계산한다.
 */
export const applyRoadDistances = (route: OptimalRoute, roadKm: (number | null)[]): OptimalRoute => {
    const segments = route.segments.map((seg, i) => {
        const km = roadKm[i];
        if (km == null) return seg;
        const duration = seg.type === 'bike' ? calculateBikeTime(km) : calculateWalkTime(km);
        return { ...seg, distance: km, duration };
    });
    return {
        ...route,
        segments,
        totalDistance: segments.reduce((sum, seg) => sum + seg.distance, 0),
        totalDuration: segments.reduce((sum, seg) => sum + seg.duration, 0),
    };
};

/**
 * Find the nearest station with available bikes
 */
export const findNearestAvailableStation = (
    coords: Coordinates,
    stations: Station[]
): StationWithDistance | null => {
    let nearest: StationWithDistance | null = null;
    let minDistance = Infinity;

    stations.forEach((station) => {
        // Only consider stations with available bikes
        if (station.parking_count > 0) {
            const distance = haversineDistance(coords, {
                latitude: station.x_pos,
                longitude: station.y_pos,
            });

            if (distance < minDistance) {
                minDistance = distance;
                nearest = { ...station, distance };
            }
        }
    });

    return nearest;
};

/**
 * Find the nearest station without availability check
 */
export const findNearestStation = (
    coords: Coordinates,
    stations: Station[]
): StationWithDistance | null => {
    let nearest: StationWithDistance | null = null;
    let minDistance = Infinity;

    stations.forEach((station) => {
        const distance = haversineDistance(coords, {
            latitude: station.x_pos,
            longitude: station.y_pos,
        });

        if (distance < minDistance) {
            minDistance = distance;
            nearest = { ...station, distance };
        }
    });

    return nearest;
};

/**
 * Get route summary as human-readable string
 */
export const getRouteSummary = (route: OptimalRoute): string => {
    const distance = route.totalDistance.toFixed(2);
    const duration = route.totalDuration;
    const bikeSegment = route.segments.find((s) => s.type === 'bike');

    const bikeDistance = bikeSegment ? bikeSegment.distance.toFixed(2) : '0';

    return `약 ${duration}분 소요 (총 ${distance}km, 자전거 ${bikeDistance}km)`;
};
