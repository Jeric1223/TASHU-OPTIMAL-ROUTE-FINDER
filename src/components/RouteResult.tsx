import React from 'react';
import type { OptimalRoute } from '../types/index';
import { BicycleIcon, MapPinIcon, WalkIcon } from './icons';

interface RouteResultProps {
    route: OptimalRoute;
    onClose?: () => void;
}

const RouteResult: React.FC<RouteResultProps> = ({ route, onClose }) => {
    const formatDuration = (minutes: number): string => {
        if (minutes < 60) {
            return `${minutes}분`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}시간 ${mins}분`;
    };

    // 길찾기 URL 생성 함수들
    const getKakaoMapUrl = (startLat: number, startLng: number, endLat: number, endLng: number, startName: string, endName: string) => {
        // 카카오맵 길찾기 URL
        return `https://map.kakao.com/?sName=${encodeURIComponent(startName)}&eName=${encodeURIComponent(endName)}&sp=${startLat},${startLng}&ep=${endLat},${endLng}`;
    };

    const getNaverMapUrl = (startLat: number, startLng: number, endLat: number, endLng: number, startName: string, endName: string) => {
        // 네이버지도 길찾기 URL
        return `https://map.naver.com/p/directions/${startLng},${startLat},${encodeURIComponent(startName)}/${endLng},${endLat},${encodeURIComponent(endName)}/-/transit?c=15.00,0,0,0,dh`;
    };

    const getGoogleMapUrl = (startLat: number, startLng: number, endLat: number, endLng: number) => {
        // 구글맵 길찾기 URL
        return `https://www.google.com/maps/dir/?api=1&origin=${startLat},${startLng}&destination=${endLat},${endLng}&travelmode=bicycling`;
    };

    // 출발/도착 정류소 좌표
    const startLat = route.startStation.x_pos;
    const startLng = route.startStation.y_pos;
    const endLat = route.endStation.x_pos;
    const endLng = route.endStation.y_pos;
    const startName = route.startStation.name;
    const endName = route.endStation.name;

    return (
        <div className="neomorph-card p-5 space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">경로 안내</h3>
                {onClose && (
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        ✕
                    </button>
                )}
            </div>

            {/* Summary */}
            <div className="neomorph-inset p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-700">총 소요 시간</span>
                    <span className="text-2xl font-bold text-blue-600">{formatDuration(route.totalDuration)}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">총 거리</span>
                    <span className="text-lg font-semibold text-gray-700">{route.totalDistance.toFixed(2)} km</span>
                </div>
            </div>

            {/* Segments */}
            <div className="space-y-3">
                {route.segments.map((segment, idx) => {
                    const isWalk = segment.type === 'walk';
                    const Icon = isWalk ? WalkIcon : BicycleIcon;
                    const segmentName = isWalk ? '도보' : '자전거';
                    const startName =
                        'type' in segment.startPoint && segment.startPoint.type
                            ? segment.startPoint.name
                            : segment.startPoint.name;
                    const endName =
                        'type' in segment.endPoint && segment.endPoint.type
                            ? segment.endPoint.name
                            : segment.endPoint.name;

                    return (
                        <div key={idx} className="neomorph-card p-4 space-y-2">
                            {/* Header */}
                            <div className="flex items-center gap-2">
                                <div
                                    className={`p-2 rounded-lg ${
                                        isWalk ? 'bg-gray-100' : 'bg-blue-100'
                                    }`}
                                >
                                    <Icon className={`w-5 h-5 ${isWalk ? 'text-gray-600' : 'text-blue-600'}`} />
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold text-gray-800">{segmentName}</div>
                                    <div className="text-xs text-gray-600">
                                        {segment.distance.toFixed(2)} km · {segment.duration}분
                                    </div>
                                </div>
                            </div>

                            {/* Route details */}
                            <div className="ml-9 space-y-1 text-sm">
                                <div className="flex items-start gap-2 text-gray-700">
                                    <MapPinIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-blue-600" />
                                    <span>{startName}</span>
                                </div>
                                <div className="flex justify-center py-1">
                                    <div className="border-l-2 border-dashed border-gray-300 h-4" />
                                </div>
                                <div className="flex items-start gap-2 text-gray-700">
                                    <MapPinIcon className="w-4 h-4 mt-0.5 flex-shrink-0 text-green-600" />
                                    <span>{endName}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Station Info */}
            <div className="space-y-3">
                {/* Start Station */}
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-sm font-semibold text-green-900 mb-2">🚴 출발 정류소</div>
                    <div className="space-y-1 text-sm">
                        <div className="font-bold text-gray-800">{route.startStation.name}</div>
                        <div className="text-gray-600">거리: {route.startStation.distance?.toFixed(2)}km</div>
                        <div className="text-green-700 font-semibold">현재 자전거 가용: {route.startStation.parking_count}대</div>
                    </div>
                </div>

                {/* End Station */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-sm font-semibold text-blue-900 mb-2">🎯 도착 정류소</div>
                    <div className="space-y-1 text-sm">
                        <div className="font-bold text-gray-800">{route.endStation.name}</div>
                        <div className="text-gray-600">거리: {route.endStation.distance?.toFixed(2)}km</div>
                        <div className="text-blue-700 font-semibold">반납 가능 자리: {route.endStation.parking_count}대</div>
                    </div>
                </div>
            </div>

            {/* 외부 지도 길찾기 바로가기 */}
            <div className="space-y-2">
                <div className="text-sm font-semibold text-gray-700">🗺️ 외부 지도에서 길찾기</div>
                <div className="flex flex-wrap gap-2">
                    <a
                        href={getKakaoMapUrl(startLat, startLng, endLat, endLng, startName, endName)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-[100px] bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-semibold py-2.5 px-4 rounded-lg text-center text-sm transition-colors shadow-sm"
                    >
                        카카오맵
                    </a>
                    <a
                        href={getNaverMapUrl(startLat, startLng, endLat, endLng, startName, endName)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-[100px] bg-green-500 hover:bg-green-600 text-white font-semibold py-2.5 px-4 rounded-lg text-center text-sm transition-colors shadow-sm"
                    >
                        네이버지도
                    </a>
                    <a
                        href={getGoogleMapUrl(startLat, startLng, endLat, endLng)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 min-w-[100px] bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2.5 px-4 rounded-lg text-center text-sm transition-colors shadow-sm"
                    >
                        구글맵
                    </a>
                </div>
            </div>
        </div>
    );
};

export default RouteResult;
