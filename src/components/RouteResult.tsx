import React, { useCallback, useEffect, useState } from 'react';
import type { OptimalRoute } from '../types/index';
import { loadKakaoSdk } from '../services/kakaoSdkLoader';
import { useCountUp } from '../hooks/useCountUp';
import { addFavorite, isFavorite } from '../services/favoriteService';

interface RouteResultProps {
    route: OptimalRoute;
}

// WGS84 → WCONGNAMUL 변환 (카카오맵 URL rt 파라미터용)
// JS SDK의 Geocoder를 사용한다. 변환 실패 시 null을 반환하면
// 호출부가 기본 카카오맵 링크로 그대로 폴백한다.
const toWcong = async (lng: number, lat: number): Promise<{ x: number; y: number } | null> => {
    try {
        const kakao = await loadKakaoSdk();
        return await new Promise((resolve) => {
            const geocoder = new kakao.maps.services.Geocoder();
            geocoder.transCoord(
                lng,
                lat,
                (result, status) => {
                    if (status !== kakao.maps.services.Status.OK || !result[0]) {
                        resolve(null);
                        return;
                    }
                    resolve({ x: Math.round(result[0].x), y: Math.round(result[0].y) });
                },
                {
                    input_coord: kakao.maps.services.Coords.WGS84,
                    output_coord: kakao.maps.services.Coords.WCONGNAMUL,
                }
            );
        });
    } catch {
        return null;
    }
};

const RouteResult: React.FC<RouteResultProps> = ({ route }) => {
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

    // 모바일이면 카카오맵 앱을 자전거 모드로 띄우고, 앱이 없으면 웹으로 폴백한다.
    // 앱 전환에 성공하면 blur가 발생하므로 폴백 타이머를 취소한다.
    const handleKakaoStart = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        if (!isMobile) return; // 데스크톱은 href의 웹 URL을 그대로 사용
        e.preventDefault();
        const appUrl = `kakaomap://route?sp=${startLat},${startLng}&ep=${endLat},${endLng}&by=BICYCLE`;
        const timeout = setTimeout(() => window.open(kakaoWebUrl, '_blank'), 1500);
        window.addEventListener('blur', () => clearTimeout(timeout), { once: true });
        window.location.href = appUrl;
    }, [startLat, startLng, endLat, endLng, kakaoWebUrl]);

    // 네이버지도 자전거 경로 URL
    const naverUrl =`https://map.naver.com/p/directions/${startLng},${startLat},${encodeURIComponent(startName)}/${endLng},${endLat},${encodeURIComponent(endName)}/-/bike?c=15.00,0,0,0,dh`;

    const minutes = useCountUp(route.totalDuration);

    // 시안의 '경로 저장': 출발 정류소를 즐겨찾기에 쌓는다
    const [saved, setSaved] = useState(() => isFavorite(route.startStation.id));
    useEffect(() => { setSaved(isFavorite(route.startStation.id)); }, [route.startStation.id]);
    const handleSave = () => {
        if (saved) return;
        if (addFavorite(route.startStation)) setSaved(true);
    };
    const noBikes = route.startStation.parking_count === 0;

    return (
        // 위는 스크롤되는 요약, 아래는 시트 바닥에 고정되는 CTA 바
        <div className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-[22px] pb-6 no-scrollbar animate-fade-in">
                {/* 결론 문장 먼저 */}
                <p className="text-sm text-on-surface-variant">
                    {route.startStation.name} → {route.endStation.name}
                </p>
                <h2 className="mt-1.5 font-headline font-bold text-[26px] leading-[1.4] text-on-surface min-[900px]:text-[28px]" style={{ textWrap: 'balance' }}>
                    약 <span className="tabular-nums">{minutes}</span>분 걸려요
                </h2>
                <p className="mt-1.5 text-[15px] text-on-surface-variant">
                    총 {route.totalDistance.toFixed(1)}km · 출발 정류소 대여 {route.startStation.parking_count}대
                </p>
                {noBikes && (
                    <p role="status" className="mt-3.5 rounded-2xl bg-[#FBF3DC] px-4 py-3.5 text-sm leading-relaxed text-[#5C4A12]">
                        <b className="block mb-0.5">이 정류소에는 지금 빌릴 자전거가 없어요</b>
                        다른 출발지로 다시 찾아 보세요.
                    </p>
                )}

                {/* 구간: 도보는 점선, 자전거는 초록 실선 */}
                <ol className="mt-5">
                    {route.segments.map((segment, idx) => {
                        const isWalk = segment.type === 'walk';
                        const isLast = idx === route.segments.length - 1;
                        return (
                            <li key={idx} className="relative flex gap-4 animate-slide-up" style={{ animationDelay: `${idx * 60 + 120}ms`, animationFillMode: 'backwards' }}>
                                <div className="flex flex-col items-center flex-shrink-0">
                                    <div className={`mt-1 w-[14px] h-[14px] rounded-full border-[3px] z-10 ${isWalk ? 'bg-surface border-gray-300' : 'bg-primary border-primary'}`} />
                                    {!isLast && (
                                        <div className={`flex-1 my-1 w-0 border-l-2 ${isWalk ? 'border-dashed border-gray-300' : 'border-solid border-primary'}`} />
                                    )}
                                </div>
                                <div className={`flex-1 min-w-0 ${isLast ? '' : 'pb-[18px]'}`}>
                                    <h3 className="font-bold text-on-surface text-base leading-normal break-words">
                                        {segment.startPoint.name}에서 {segment.endPoint.name}까지 {isWalk ? '걸어가요' : '자전거로 달려요'}
                                    </h3>
                                    <p className="text-sm text-on-surface-variant leading-normal">
                                        {formatDuration(segment.duration)} · {segment.distance.toFixed(2)}km
                                    </p>
                                </div>
                            </li>
                        );
                    })}
                </ol>

                <p className="mt-1 text-sm text-on-surface-variant">
                    도착 정류소 반납 가능 {route.endStation.parking_count}자리
                </p>

                <div className="mt-5 grid grid-cols-2 gap-2">
                    <a href={naverUrl} target="_blank" rel="noopener noreferrer"
                        className="press flex items-center justify-center min-h-[48px] rounded-[14px] bg-gray-100 text-on-surface text-sm font-bold">
                        네이버지도
                    </a>
                    <button onClick={handleSave} disabled={saved}
                        className="press flex items-center justify-center min-h-[48px] rounded-[14px] bg-gray-100 text-on-surface text-sm font-bold disabled:text-primary">
                        {saved ? '저장됨' : '경로 저장'}
                    </button>
                </div>
                <p className="mt-4 text-xs text-on-surface-variant">대여 가능 대수는 매시 정각에 갱신되며 최대 1시간 전 값입니다.</p>
            </div>

            <div className="flex-none px-4 pt-2.5 pb-[calc(var(--nav-h)+28px)] min-[900px]:pb-4 bg-surface shadow-[0_-1px_0_#E4E6E3]">
                <a href={kakaoWebUrl} target="_blank" rel="noopener noreferrer" onClick={handleKakaoStart}
                    aria-disabled={noBikes}
                    className={`press flex items-center justify-center min-h-[52px] rounded-[16px] font-headline font-bold ${noBikes ? 'bg-gray-100 text-on-surface-variant' : 'bg-primary text-white'}`}>
                    카카오맵으로 길찾기 시작
                </a>
            </div>
        </div>
    );
};

export default RouteResult;
