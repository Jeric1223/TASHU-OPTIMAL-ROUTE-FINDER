import React, { useState, useEffect } from 'react';
import type { Coordinates, FavoriteStation } from '../types/index';
import { getFavorites, removeFavorite, updateFavoriteNickname } from '../services/favoriteService';
import { haversineDistance } from '../services/tashuService';
import { useCountUp } from '../hooks/useCountUp';
import UiIcon from './UiIcon';

interface FavoritesListProps {
    onBack: () => void;
    onStationSelect?: (station: FavoriteStation) => void;
    /** 저장 목록이 바뀔 때마다 (지도에 저장한 정류소만 그리기 위해) */
    onIdsChange?: (ids: string[]) => void;
    /** 거리 표시 기준점. 없으면 거리를 숨긴다. */
    userLocation?: Coordinates | null;
}

const WALK_M_PER_MIN = 70;
const NICKNAME_MAX = 20;

const FavoritesList: React.FC<FavoritesListProps> = ({ onBack, onStationSelect, onIdsChange, userLocation }) => {
    const [favorites, setFavorites] = useState<FavoriteStation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [draft, setDraft] = useState('');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const count = useCountUp(favorites.length);

    const idsKey = favorites.map(f => f.id).join(',');
    useEffect(() => {
        if (!isLoading) onIdsChange?.(favorites.map(f => f.id));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idsKey, isLoading]);

    useEffect(() => {
        setIsLoading(true);
        try { setFavorites(getFavorites()); }
        catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    }, []);

    const handleRemove = (stationId: string) => {
        if (removeFavorite(stationId)) {
            setFavorites(prev => prev.filter(f => f.id !== stationId));
            if (editingId === stationId) setEditingId(null);
        }
    };

    const startEdit = (fav: FavoriteStation) => {
        setEditingId(editingId === fav.id ? null : fav.id);
        setDraft(fav.nickname ?? '');
    };

    const submitEdit = (e: React.FormEvent, stationId: string) => {
        e.preventDefault();
        const nickname = draft.trim();
        if (updateFavoriteNickname(stationId, nickname)) {
            setFavorites(prev => prev.map(f => f.id === stationId ? { ...f, nickname: nickname || undefined } : f));
        }
        setEditingId(null);
    };

    const getKakaoUrl = (station: FavoriteStation) =>
        `https://map.kakao.com/link/to/${encodeURIComponent(station.name)},${station.x_pos},${station.y_pos}`;

    return (
        // 시안 D: 위쪽은 실제 지도가 그대로 보이고, 아래에 목록 시트가 올라온다.
        // 시트는 탭바(z-nav)보다 아래에 깔려 탭바 알약이 그 위에 떠 있다.
        <div className="fixed inset-0 z-[var(--z-sheet)] pointer-events-none animate-fade-in">
            <button
                onClick={onBack}
                className="press nav-pill pointer-events-auto absolute top-0 inset-x-3 mt-3 min-h-[52px] flex items-center gap-2.5 px-[18px] rounded-[26px] text-base text-on-surface-variant text-left min-[900px]:right-auto min-[900px]:w-[380px] min-[900px]:left-4 min-[900px]:top-4 min-[900px]:mt-0"
                style={{ top: 'var(--safe-area-inset-top)' }}
            >
                <UiIcon name="search" className="w-[22px] h-[22px]" />
                정류소 더 찾아보기
            </button>
            <section
                aria-label="저장한 정류소"
                className="pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col rounded-t-[28px] bg-surface shadow-[0_-8px_32px_rgba(20,23,28,0.12),0_0_0_1px_rgba(20,23,28,0.05)] min-[900px]:inset-x-auto min-[900px]:left-4 min-[900px]:w-[400px] min-[900px]:bottom-4 min-[900px]:rounded-3xl"
                style={{ top: 'calc(46% - 24px)' }}
            >
            <div className="flex-1 overflow-y-auto overscroll-contain pt-[22px] px-4 no-scrollbar" style={{ paddingBottom: 'calc(var(--nav-h) + 40px)' }}>
                {/* 결론 문장 먼저 */}
                <p className="text-sm text-on-surface-variant">저장한 정류소</p>
                <h1 className="mt-1.5 font-headline font-bold text-[26px] leading-[1.4] text-on-surface" style={{ textWrap: 'balance' }}>
                    {favorites.length > 0
                        ? <><span className="tabular-nums">{count}</span>곳을 저장했어요</>
                        : isLoading ? ' ' : '아직 저장한 곳이 없어요'}
                </h1>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : favorites.length === 0 ? (
                    <div className="mt-6 rounded-[20px] bg-white border border-outline-variant px-5 py-8 text-center">
                        <p className="font-headline font-bold text-on-surface text-lg">저장된 장소가 없어요</p>
                        <p className="text-on-surface-variant text-sm mt-1.5 leading-relaxed">경로 화면에서 ‘경로 저장’을 누르거나 정류소 카드의 별을 켜면 여기에 쌓여요.</p>
                        <button onClick={onBack} className="press mt-4 min-h-[44px] px-5 rounded-[14px] bg-gray-100 text-on-surface text-sm font-bold">
                            정류소 찾아보기
                        </button>
                    </div>
                ) : (
                    <ul className="mt-5 space-y-2">
                        {favorites.map((fav, i) => {
                            // 거리는 저장하지 않는다. 저장 시점 위치는 지금 위치와 다르므로
                            // 항상 현재 위치 기준으로 계산해야 맞는 값이 나온다.
                            const dist = userLocation
                                ? haversineDistance(userLocation, { latitude: fav.x_pos, longitude: fav.y_pos })
                                : undefined;
                            const meters = dist !== undefined ? Math.round(dist * 1000) : null;
                            const distText = dist === undefined ? null : dist < 1 ? `${meters}m` : `${dist.toFixed(1)}km`;
                            const walkMin = meters !== null ? Math.max(1, Math.round(meters / WALK_M_PER_MIN)) : null;
                            const title = fav.nickname || fav.name;
                            const isSel = selectedId === fav.id;

                            return (
                                <li
                                    key={fav.id}
                                    className="bg-white rounded-[18px] animate-slide-up transition-shadow"
                                    style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'backwards', boxShadow: isSel ? '0 0 0 2px #006A3C' : '0 0 0 1px #E4E6E3' }}
                                >
                                    <div className="flex items-center">
                                        <button
                                            className="press flex-1 min-w-0 text-left pl-4 pr-1 py-3.5 rounded-[18px]"
                                            aria-pressed={isSel}
                                            onClick={() => {
                                                setSelectedId(fav.id);
                                                onStationSelect?.(fav);
                                            }}
                                        >
                                            <span className="block font-headline font-bold text-base leading-snug text-on-surface break-words">{title}</span>
                                            <span className="block text-[13px] leading-snug text-on-surface-variant break-words">{fav.nickname ? fav.name : fav.address}</span>
                                            {distText && (
                                                <span className="block mt-1 text-sm font-semibold text-on-surface">
                                                    {distText}{walkMin !== null && ` · 도보 약 ${walkMin}분`}
                                                </span>
                                            )}
                                        </button>

                                        <div className="flex items-center pr-1.5 shrink-0">
                                            <a
                                                href={getKakaoUrl(fav)} target="_blank" rel="noopener noreferrer"
                                                aria-label={`${title} 카카오맵 길찾기`}
                                                className="press w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant [@media(hover:hover)]:hover:bg-gray-100 [@media(hover:hover)]:hover:text-on-surface"
                                            >
                                                <span className="material-symbols-outlined">near_me</span>
                                            </a>
                                            <button
                                                onClick={() => startEdit(fav)}
                                                aria-label={`${title} 별명 바꾸기`}
                                                className="press w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant [@media(hover:hover)]:hover:bg-gray-100 [@media(hover:hover)]:hover:text-on-surface"
                                            >
                                                <UiIcon name="edit" />
                                            </button>
                                            <button
                                                onClick={() => handleRemove(fav.id)}
                                                aria-label={`${title} 삭제`}
                                                className="press w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant [@media(hover:hover)]:hover:bg-error/10 [@media(hover:hover)]:hover:text-error"
                                            >
                                                <UiIcon name="trash" />
                                            </button>
                                        </div>
                                    </div>

                                    {editingId === fav.id && (
                                        <form onSubmit={e => submitEdit(e, fav.id)} className="flex gap-2 px-3 pb-3">
                                            <input
                                                autoFocus
                                                value={draft}
                                                onChange={e => setDraft(e.target.value)}
                                                onKeyDown={e => { if (e.key === 'Escape') setEditingId(null); }}
                                                maxLength={NICKNAME_MAX}
                                                placeholder={fav.name}
                                                aria-label="별명"
                                                className="flex-1 min-w-0 h-11 px-3.5 rounded-xl bg-gray-100 text-base text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                            />
                                            <button type="submit" className="press w-16 h-11 rounded-xl bg-gray-100 text-sm font-bold text-on-surface">저장</button>
                                        </form>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                )}

                {/* 안내 CTA */}
                {!isLoading && favorites.length > 0 && (
                    <div className="mt-5 rounded-[18px] bg-primary-container p-4">
                        <p className="font-headline font-bold text-on-surface text-[15px]">장소를 더 추가하세요</p>
                        <p className="text-[13px] text-on-surface-variant mt-1 leading-relaxed">자주 가는 곳을 저장하면 빠르게 접근할 수 있어요.</p>
                        <button onClick={onBack} className="press mt-3 w-full min-h-[44px] rounded-[14px] bg-white text-on-surface text-sm font-bold">
                            정류소 찾아보기
                        </button>
                    </div>
                )}
            </div>
            </section>
        </div>
    );
};

export default FavoritesList;
