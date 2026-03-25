import React, { useCallback, useEffect, useState } from 'react';
import type { OptimalRoute } from '../types/index';

interface RouteResultProps {
    route: OptimalRoute;
    onClose?: () => void;
}

// WGS84 → WCONGNAMUL 변환 (카카오맵 URL rt 파라미터용)
const toWcong = async (lng: number, lat: number): Promise<{ x: number; y: number } | null> => {
    const key = import.meta.env?.VITE_KAKAO_API_KEY as string;
    try {
        const res = await fetch(
            `https://dapi.kakao.com/v2/local/geo/transcoord.json?x=${lng}&y=${lat}&input_coord=WGS84&output_coord=WCONGNAMUL`,
            { headers: { Authorization: `KakaoAK ${key}` } }
        );
        const data = await res.json();
        const doc = data?.documents?.[0];
        if (!doc) return null;
        return { x: Math.round(doc.x), y: Math.round(doc.y) };
    } catch {
        return null;
    }
};

const RouteResult: React.FC<RouteResultProps> = ({ route, onClose }) => {
    const formatDuration = (minutes: number) =>
        minutes < 60 ? `${minutes}분` : `${Math.floor(minutes / 60)}시간 ${minutes % 60}분`;

    const startLat = route.startStation.x_pos;
    const startLng = route.startStation.y_pos;
    const endLat = route.endStation.x_pos;
    const endLng = route.endStation.y_pos;
    const startName = route.startStation.name;
    const endName = route.endStation.name;

    const [kakaoWebUrl, setKakaoWebUrl] = useState<string>(
        `https://map.kakao.com/link/to/${encodeURIComponent(endName)},${endLat},${endLng}`
    );

    // 출발/도착 모두 WCONGNAMUL 변환 → 카카오맵 웹 경로 URL 생성
    useEffect(() => {
        let cancelled = false;
        (async () => {
            const [start, end] = await Promise.all([
                toWcong(startLng, startLat),
                toWcong(endLng, endLat),
            ]);
            if (cancelled) return;
            if (start && end) {
                setKakaoWebUrl(
                    `https://map.kakao.com/?map_type=TYPE_MAP&target=walk` +
                    `&rt=${start.x},${start.y},${end.x},${end.y}` +
                    `&rt1=${encodeURIComponent(startName)}&rt2=${encodeURIComponent(endName)}` +
                    `&rtIds=%2C&rtTypes=%2C`
                );
            }
        })();
        return () => { cancelled = true; };
    }, [startLat, startLng, endLat, endLng, startName, endName]);

    // 카카오맵 앱 딥링크 → 앱 없으면 웹 URL로 폴백 (주행 시작 버튼)
    const handleKakaoStart = useCallback(() => {
        const appUrl = `kakaomap://route?sp=${startLat},${startLng}&ep=${endLat},${endLng}&by=BICYCLE`;
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (!isMobile) { window.open(kakaoWebUrl, '_blank'); return; }
        const timeout = setTimeout(() => window.open(kakaoWebUrl, '_blank'), 1500);
        window.location.href = appUrl;
        window.addEventListener('blur', () => clearTimeout(timeout), { once: true });
    }, [startLat, startLng, endLat, endLng, kakaoWebUrl]);

    // 네이버지도 자전거 경로 URL
    const naverUrl = `https://map.naver.com/p/directions/${startLng},${startLat},${encodeURIComponent(startName)}/${endLng},${endLat},${encodeURIComponent(endName)}/-/bike?c=15.00,0,0,0,dh`;

    return (
        <div className="space-y-4 animate-fade-in">
            {/* 경로 요약 카드 */}
            <div className="bg-surface-container-lowest rounded-lg p-5 breathe-shadow flex items-center justify-between">
                <div>
                    <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-headline text-4xl font-extrabold tracking-tighter text-primary">
                            {formatDuration(route.totalDuration)}
                        </span>
                        <span className="text-on-surface-variant font-medium text-sm">
                            {route.totalDistance.toFixed(1)}km
                        </span>
                    </div>
                    <span className="bg-primary/10 text-primary px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase">
                        최적 경로
                    </span>
                </div>
                <div className="w-14 h-14 bg-primary rounded-lg flex items-center justify-center rotate-3 shadow-lg">
                    <span className="material-symbols-outlined text-white text-2xl filled">directions_bike</span>
                </div>
            </div>

            {/* 상세 경로 */}
            <div className="bg-surface-container-lowest rounded-lg p-5 breathe-shadow">
                <h2 className="font-headline text-base font-bold mb-5 flex items-center gap-2 text-on-surface">
                    <span className="material-symbols-outlined text-primary text-lg">route</span>
                    상세 경로
                </h2>

                <div className="flex flex-col">
                    {route.segments.map((segment, idx) => {
                        const isWalk = segment.type === 'walk';
                        const isLast = idx === route.segments.length - 1;
                        const icon = isWalk ? 'directions_walk' : 'directions_bike';
                        const label = isWalk ? '도보 이동' : '자전거 주행';
                        const startPtName = segment.startPoint.name;
                        const endPtName = segment.endPoint.name;

                        return (
                            <div key={idx} className={`flex gap-4 ${isLast ? '' : 'pb-6'} relative`}>
                                {/* 타임라인 아이콘 */}
                                <div className="flex flex-col items-center flex-shrink-0">
                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center z-10 ${
                                        isWalk ? 'bg-surface-container' : 'bg-primary shadow-md'
                                    }`}>
                                        <span className={`material-symbols-outlined text-sm ${isWalk ? 'text-on-surface-variant' : 'text-white'}`}>
                                            {icon}
                                        </span>
                                    </div>
                                    {!isLast && (
                                        <div className={`absolute top-9 w-0.5 h-[calc(100%-12px)] ${isWalk ? 'bg-surface-container' : 'bg-primary/30'}`} />
                                    )}
                                </div>

                                {/* 내용 */}
                                <div className="flex-1 pt-1 pb-1">
                                    <p className="font-bold text-on-surface text-sm">
                                        {startPtName}에서 {endPtName}까지 {label}
                                    </p>
                                    <p className="text-on-surface-variant text-xs font-medium mt-0.5">
                                        {segment.duration}분 · {segment.distance.toFixed(2)}km
                                    </p>

                                    {/* 자전거 구간 - 정류소 정보 */}
                                    {!isWalk && (
                                        <div className="mt-2 bg-surface-container-low rounded-lg p-3 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                                                <span className="material-symbols-outlined text-primary text-sm">directions_bike</span>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">대여 가능 자전거</p>
                                                <p className="text-sm font-extrabold text-primary">{route.startStation.parking_count}대</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* 출발/도착 정류소 요약 */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-primary/5 rounded-lg p-4 border border-primary/10">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-1">출발 정류소</p>
                    <p className="font-headline font-bold text-on-surface text-sm leading-tight">{route.startStation.name}</p>
                    <p className="text-primary font-bold text-sm mt-1">{route.startStation.parking_count}대 대여 가능</p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-4">
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">도착 정류소</p>
                    <p className="font-headline font-bold text-on-surface text-sm leading-tight">{route.endStation.name}</p>
                    <p className="text-on-surface-variant font-medium text-xs mt-1">반납 {route.endStation.parking_count}자리</p>
                </div>
            </div>

            {/* 외부 지도 길찾기 */}
            <div className="bg-surface-container-lowest rounded-lg p-5 breathe-shadow">
                <p className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-4">
                    외부 지도에서 길찾기
                </p>
                <div className="grid grid-cols-2 gap-3">
                    <a href={kakaoWebUrl} target="_blank" rel="noopener noreferrer"
                        className="flex flex-col items-center gap-2.5 py-4 rounded-lg bg-[#FAE300] hover:opacity-90 transition-opacity active:scale-95">
                        <span className="text-base">🗺️</span>
                        <span className="text-[11px] font-bold text-[#3C1E1E]">카카오맵</span>
                    </a>
                    <a href={naverUrl} target="_blank" rel="noopener noreferrer"
                        className="flex flex-col items-center gap-2.5 py-4 rounded-lg bg-[#03C75A] hover:opacity-90 transition-opacity active:scale-95">
                        <span className="text-base">🗺️</span>
                        <span className="text-[11px] font-bold text-white">네이버지도</span>
                    </a>
                </div>
            </div>

            {/* 다시 검색 */}
            {onClose && (
                <button onClick={onClose}
                    className="w-full py-3 rounded-lg border border-outline-variant/30 text-on-surface-variant text-sm font-semibold hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined text-sm">arrow_back</span>
                    다른 경로 검색
                </button>
            )}
        </div>
    );
};

export default RouteResult;
