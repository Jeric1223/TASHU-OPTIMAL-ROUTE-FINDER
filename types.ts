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
