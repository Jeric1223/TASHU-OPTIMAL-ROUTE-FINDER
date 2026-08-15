import React, { useState, useEffect } from 'react';
import type { Coordinates, FavoriteStation } from '../types/index';
import { getFavorites, removeFavorite } from '../services/favoriteService';
import { haversineDistance } from '../services/tashuService';

interface FavoritesListProps {
    onBack: () => void;
    onNavigateToMap?: () => void;
    onNavigateToRoute?: () => void;
    onStationSelect?: (station: FavoriteStation) => void;
    /** 거리 표시 기준점. 없으면 거리를 숨긴다. */
    userLocation?: Coordinates | null;
}

const FavoritesList: React.FC<FavoritesListProps> = ({ onBack, onNavigateToMap, onNavigateToRoute, onStationSelect, userLocation }) => {
    const [favorites, setFavorites] = useState<FavoriteStation[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        try { setFavorites(getFavorites()); }
        catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    }, []);

    const handleRemove = (stationId: string) => {
        if (removeFavorite(stationId)) {
            setFavorites(prev => prev.filter(f => f.id !== stationId));
        }
    };

    const getKakaoUrl = (station: FavoriteStation) =>
        `https://map.kakao.com/link/to/${encodeURIComponent(station.name)},${station.x_pos},${station.y_pos}`;

    const getInitial = (name: string) => name.charAt(0).toUpperCase();

    return (
        <div className="fixed inset-0 z-[70] flex flex-col bg-white animate-fade-in pt-safe">
            {/* 헤더 — 플랫, 그림자 없음 */}
            <header className="flex items-center justify-between px-2 h-14 mt-3 mx-4 border-b border-outline-variant">
                <button
                    onClick={onBack}
                    className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-container-low transition-colors text-on-surface active:scale-95"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="font-headline font-bold text-lg text-on-surface">즐겨찾기</h1>
                <div className="w-10" />
            </header>

            {/* 스크롤 영역 */}
            <div className="flex-1 overflow-y-auto pt-4 px-4 pb-24 sm:pt-6 sm:px-5 sm:pb-safe sm:pb-32 no-scrollbar">
                <section className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-headline font-bold text-on-surface">저장한 정류소</h3>
                        <span className="text-[13px] font-semibold text-on-surface-variant">
                            {favorites.length}곳
                        </span>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : favorites.length === 0 ? (
                        <div className="flex flex-col items-center py-12 gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-primary-container flex items-center justify-center">
                                <span className="material-symbols-outlined text-3xl text-primary">favorite</span>
                            </div>
                            <div className="text-center">
                                <p className="font-headline font-bold text-on-surface text-base">저장된 장소가 없어요</p>
                                <p className="text-on-surface-variant text-xs mt-1">정류소를 클릭해서 추가하세요</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3 mb-8">
                            {favorites.map((fav) => {
                                // 거리는 저장하지 않는다. 저장 시점 위치는 지금 위치와 다르므로
                                // 항상 현재 위치 기준으로 계산해야 맞는 값이 나온다.
                                const dist = userLocation
                                    ? haversineDistance(userLocation, { latitude: fav.x_pos, longitude: fav.y_pos })
                                    : undefined;
                                const distText = dist !== undefined
                                    ? dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)}km`
                                    : null;

                                return (
                                    <div
                                        key={fav.id}
                                        className="bg-white rounded-lg p-4 flex items-center gap-3 border border-outline-variant cursor-pointer hover:bg-surface-container-low transition-colors"
                                        onClick={() => {
                                            onStationSelect?.(fav);
                                            onNavigateToMap?.();
                                        }}
                                    >
                                        {/* 아바타 — 단일 브랜드 색 */}
                                        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-headline font-bold text-base bg-primary-container text-primary">
                                            {getInitial(fav.name)}
                                        </div>

                                        {/* 정보 */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-headline font-bold text-on-surface text-sm leading-tight truncate">{fav.name}</h4>
                                            <p className="text-xs text-on-surface-variant truncate">{fav.address}</p>
                                            {distText && (
                                                <p className="text-[11px] text-primary font-medium mt-0.5">{distText}</p>
                                            )}
                                        </div>

                                        {/* 액션 버튼 */}
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <a href={getKakaoUrl(fav)} target="_blank" rel="noopener noreferrer"
                                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-container-low transition-colors text-on-surface-variant hover:text-primary active:scale-90">
                                                <span className="material-symbols-outlined text-sm">edit</span>
                                            </a>
                                            <button onClick={() => handleRemove(fav.id)}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-error/10 transition-colors text-on-surface-variant hover:text-error active:scale-90">
                                                <span className="material-symbols-outlined text-sm">delete</span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* 안내 CTA */}
                    <div className="bg-primary-container rounded-lg p-6 text-center border border-primary/10 mt-6">
                        <span className="material-symbols-outlined text-4xl text-primary block mb-3">add_location_alt</span>
                        <p className="font-headline font-bold text-on-surface text-sm mb-1">장소를 더 추가하세요</p>
                        <p className="text-xs text-on-surface-variant mb-4">자주 가는 곳을 저장하면 빠르게 접근할 수 있어요</p>
                        <button onClick={onBack}
                            className="w-full bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-bold active:scale-95 transition-transform">
                            정류소 찾아보기
                        </button>
                    </div>
                </section>
            </div>

            {/* 하단 네비게이션 — 플랫, 그림자 없음 */}
            <nav className="fixed bottom-0 w-full z-50 flex justify-around items-center px-4 pb-safe pt-3 bottom-nav" style={{ height: 'var(--nav-h)' }}>
                <button onClick={onNavigateToMap} className="flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-xl transition-all active:scale-90 text-on-surface-variant hover:text-on-surface">
                    <span className="material-symbols-outlined">explore</span>
                    <span className="text-[11px] font-semibold font-label">주변</span>
                </button>
                <button onClick={onNavigateToRoute} className="flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-xl transition-all active:scale-90 text-on-surface-variant hover:text-on-surface">
                    <span className="material-symbols-outlined">near_me</span>
                    <span className="text-[11px] font-semibold font-label">경로</span>
                </button>
                <button className="flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-xl transition-all active:scale-90 bg-primary-container text-primary">
                    <span className="material-symbols-outlined filled">favorite</span>
                    <span className="text-[11px] font-semibold font-label">즐겨찾기</span>
                </button>
                <button onClick={onBack} className="flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-xl transition-all active:scale-90 text-on-surface-variant hover:text-on-surface">
                    <span className="material-symbols-outlined">more_horiz</span>
                    <span className="text-[11px] font-semibold font-label">더보기</span>
                </button>
            </nav>
        </div>
    );
};

export default FavoritesList;
