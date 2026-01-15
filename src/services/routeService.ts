import type { Coordinates, OptimalRoute, RouteSegment, Station, StationWithDistance } from '../types/index';
import { haversineDistance } from './tashuService';

// Constants for speed calculations
const WALK_SPEED = 4; // km/h
const BIKE_SPEED = 15; // km/h
const AVERAGE_WALK_TIME = 5; // minutes to reach nearest station from current location

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
