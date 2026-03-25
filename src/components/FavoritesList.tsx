import React, { useState, useEffect } from 'react';
import type { FavoriteStation } from '../types/index';
import { getFavorites, removeFavorite } from '../services/favoriteService';

interface FavoritesListProps {
    onBack: () => void;
    onNavigateToMap?: () => void;
    onNavigateToRoute?: () => void;
    onStationSelect?: (station: FavoriteStation) => void;
}

const FavoritesList: React.FC<FavoritesListProps> = ({ onBack, onNavigateToMap, onNavigateToRoute }) => {
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

    // 아바타 색상 패레트
    const colors = [
        { bg: '#E8F5E9', text: '#2E7D32' },   // Green (Home)
        { bg: '#FCE4EC', text: '#C2185B' },   // Pink (Office)
        { bg: '#F3E5F5', text: '#7B1FA2' },   // Purple
        { bg: '#E0F2F1', text: '#00695C' },   // Teal
        { bg: '#FFF3E0', text: '#E65100' },   // Orange
    ];

    const getAvatarColor = (index: number) => colors[index % colors.length];
    const getInitial = (name: string) => name.charAt(0).toUpperCase();

    return (
        <div className="fixed inset-0 z-[70] flex flex-col bg-surface animate-fade-in pt-safe">
            {/* 헤더 */}
            <header className="flex items-center justify-between px-4 h-14 mt-2 sm:mt-4 mx-4 bg-surface-container-lowest/85 backdrop-blur-xl rounded-full shadow-breathe">
                <button
                    onClick={onBack}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors text-primary active:scale-95"
                >
                    <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <h1 className="font-headline font-extrabold text-xl text-primary">타슈</h1>
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                    <span className="material-symbols-outlined text-white text-lg">account_circle</span>
                </div>
            </header>

            {/* 스크롤 영역 */}
            <div className="flex-1 overflow-y-auto pt-4 px-4 pb-24 sm:pt-6 sm:px-5 sm:pb-safe sm:pb-32 no-scrollbar">
                {/* "Saved Stations" 섹션 */}
                <section className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-headline font-bold text-on-surface">Saved Stations</h3>
                        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
                            {favorites.length} {favorites.length === 1 ? 'CARD' : 'CARDS'}
                        </span>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : favorites.length === 0 ? (
                        <div className="flex flex-col items-center py-12 gap-4">
                            <div className="w-16 h-16 rounded-2xl bg-primary/5 flex items-center justify-center">
                                <span className="material-symbols-outlined text-3xl text-primary/30">favorite</span>
                            </div>
                            <div className="text-center">
                                <p className="font-headline font-bold text-on-surface text-base">저장된 장소가 없어요</p>
                                <p className="text-on-surface-variant text-xs mt-1">정류소를 클릭해서 추가하세요</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3 mb-8">
                            {favorites.map((fav, idx) => {
                                const distText = fav.distance !== undefined
                                    ? fav.distance < 1 ? `${Math.round(fav.distance * 1000)}m` : `${fav.distance.toFixed(1)}km`
                                    : null;
                                const color = getAvatarColor(idx);

                                return (
                                    <div key={fav.id} className="bg-surface-container-lowest rounded-2xl p-4 flex items-center gap-3 border border-outline-variant/10">
                                        {/* 아바타 */}
                                        <div
                                            className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-headline font-bold text-base"
                                            style={{ backgroundColor: color.bg, color: color.text }}
                                        >
                                            {getInitial(fav.name)}
                                        </div>

                                        {/* 정보 */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-headline font-bold text-on-surface text-sm leading-tight truncate">{fav.name}</h4>
                                            <p className="text-xs text-on-surface-variant truncate">{fav.address}</p>
                                            {distText && (
                                                <p className="text-[10px] text-primary font-medium mt-0.5">{distText}</p>
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

                    {/* "Add more destinations" CTA */}
                    <div className="bg-primary/5 rounded-2xl p-6 text-center border border-primary/10 mt-6">
                        <span className="material-symbols-outlined text-4xl text-primary/40 block mb-3">add_location_alt</span>
                        <p className="font-headline font-bold text-on-surface text-sm mb-1">장소를 더 추가하세요</p>
                        <p className="text-xs text-on-surface-variant mb-4">자주 가는 곳을 저장하면 빠르게 접근할 수 있어요</p>
                        <button onClick={onBack}
                            className="w-full bg-primary text-white px-4 py-2.5 rounded-full text-xs font-extrabold active:scale-95 transition-transform">
                            정류소 찾아보기
                        </button>
                    </div>
                </section>
            </div>

            {/* 하단 네비게이션 */}
            <nav className="fixed bottom-0 w-full z-50 flex justify-around items-center px-4 pb-safe pt-3 bottom-nav rounded-t-[2rem]">
                <button onClick={onNavigateToMap} className="flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-2xl transition-all active:scale-90 text-on-surface-variant hover:text-on-surface">
                    <span className="material-symbols-outlined">explore</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider font-label">지도</span>
                </button>
                <button onClick={onNavigateToRoute} className="flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-2xl transition-all active:scale-90 text-on-surface-variant hover:text-on-surface">
                    <span className="material-symbols-outlined">route</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider font-label">경로</span>
                </button>
                <button className="flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-2xl transition-all active:scale-90 bg-primary/10 text-primary">
                    <span className="material-symbols-outlined filled">favorite</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider font-label">즐겨찾기</span>
                </button>
                <button onClick={onBack} className="flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-2xl transition-all active:scale-90 text-on-surface-variant hover:text-on-surface">
                    <span className="material-symbols-outlined">more_horiz</span>
                    <span className="text-[10px] font-bold uppercase tracking-wider font-label">더보기</span>
                </button>
            </nav>
        </div>
    );
};

export default FavoritesList;
