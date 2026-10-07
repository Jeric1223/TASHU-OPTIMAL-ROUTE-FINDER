export interface Station {
    id: string;
    name: string;
    // According to user spec: x_pos is latitude, y_pos is longitude
    x_pos: number; // latitude (위도)
    y_pos: number; // longitude (경도)
    address: string;
    parking_count: number;
    rack_count?: number; // 거치대 총수 (따릉이만 제공)
    station_no?: string; // 정류소 번호 (따릉이만 제공)
}

export type CityId = 'daejeon' | 'seoul';

export interface CityConfig {
    id: CityId;
    name: string; // 칩에 표시하는 도시 이름
    serviceName: string; // 공공자전거 서비스 이름 (타슈, 따릉이)
    center: [number, number]; // [위도, 경도]
    dataUrl: string; // BASE_URL 기준 정류소 데이터 경로
    hasReturnSlots: boolean; // 거치대 총수(rack_count)를 제공해 반납 가능 자리를 계산할 수 있는지
}

// 정류소 데이터 파일(public/data/*.json)을 파싱한 결과. updatedAt은 이전 형식(배열) 파일에는 없다.
export interface StationData {
    stations: Station[];
    updatedAt: string | null; // ISO 8601
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

export interface KakaoSearchResult {
    name: string;
    address: string;
    roadAddress: string;
    coords: Coordinates;
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
    city?: CityId; // 없으면 daejeon (도시 구분 도입 전에 저장된 항목)
    // localStorage에는 저장되지 않는다. 호출자가 현재 위치 기준으로 채워줄 때만 존재.
    distance?: number; // distance in kilometers
}
