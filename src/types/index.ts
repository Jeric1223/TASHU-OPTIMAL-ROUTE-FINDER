export interface Station {
    id: string;
    name: string;
    // According to user spec: x_pos is latitude, y_pos is longitude
    x_pos: number; // latitude (위도)
    y_pos: number; // longitude (경도)
    address: string;
    parking_count: number;
}

export interface Coordinates {
    latitude: number;
    longitude: number;
}

export interface StationWithDistance extends Station {
    distance?: number; // distance in kilometers
}

export interface LocationSearchResult {
    name: string;
    address: string;
    roadAddress: string;
    coords: Coordinates;
}

// Types for Kakao Keyword Search API Response
export interface KakaoDocument {
    place_name: string;
    address_name: string;
    road_address_name: string;
    x: string; // longitude
    y: string; // latitude
}

export interface KakaoKeywordSearchResponse {
    documents: KakaoDocument[];
}

export interface KakaoSearchResult {
    name: string;
    address: string;
    roadAddress: string;
    coords: Coordinates;
}

export interface NaverSearchResult {
    name: string;
    address: string;
    roadAddress: string;
    coords: Coordinates;
}

// Types for Naver Geocoding API Response
export interface GeocodingAddress {
    roadAddress: string;
    jibunAddress: string;
    englishAddress: string;
    x: string; // longitude
    y: string; // latitude
    distance: number;
}

export interface GeocodingResponse {
    status: string;
    addresses: GeocodingAddress[];
    errorMessage?: string;
}

// Route guidance types
export interface RouteLocation {
    type: 'start' | 'destination';
    name: string;
    coords: Coordinates;
}

export interface RouteSegment {
    type: 'walk' | 'bike';
    distance: number; // km
    duration: number; // minutes
    polyline?: [number, number][]; // coordinates for map visualization
    startPoint: Station | RouteLocation;
    endPoint: Station | RouteLocation;
}

export interface OptimalRoute {
    segments: RouteSegment[];
    totalDistance: number; // km
    totalDuration: number; // minutes
    startStation: StationWithDistance;
    endStation: StationWithDistance;
}

// Favorites types
export interface FavoriteStation extends Station {
    savedAt: string;
    nickname?: string;
    // localStorage에는 저장되지 않는다. 호출자가 현재 위치 기준으로 채워줄 때만 존재.
    distance?: number; // distance in kilometers
}
