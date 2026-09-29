import React, { useState, useEffect, useRef } from 'react';
import type { LocationSearchResult, OptimalRoute, Station, FavoriteStation } from '../types/index';
import { searchKakaoLocation } from '../services/kakoApiService';
import { calculateOptimalRoute } from '../services/routeService';
import { getCurrentLocation } from '../services/locationService';
import { getFavorites } from '../services/favoriteService';
import UiIcon from './UiIcon';

interface RouteSearchProps {
    stations: Station[];
    onRouteFound: (route: OptimalRoute) => void;
    /** 출발·도착 중 하나라도 비거나 바뀌어 기존 경로가 무효가 됐을 때 */
    onRouteClear: () => void;
    onError: (error: string) => void;
    initialStart?: LocationSearchResult | null;
    initialDest?: LocationSearchResult | null;
    /** 값이 바뀔 때마다 도착 입력에 포커스를 준다 (0이면 무시) */
    focusDestToken?: number;
}

const listCard = 'bg-white rounded-[20px] overflow-hidden shadow-[0_6px_24px_rgba(20,23,28,0.14),0_0_0_1px_rgba(20,23,28,0.05)] pointer-events-auto';
const listRow = 'press w-full text-left flex items-start gap-3 px-5 py-3 min-h-[52px] border-b border-outline-variant/60 last:border-0 [@media(hover:hover)]:hover:bg-gray-100';

// 시안 D: 유리 카드 하나에 출발/도착 두 줄. 둘 다 정해지면 버튼 없이 바로 경로를 계산한다.
const RouteSearch: React.FC<RouteSearchProps> = ({ stations, onRouteFound, onRouteClear, onError, initialStart, initialDest, focusDestToken = 0 }) => {
    const [startInput, setStartInput] = useState('');
    const [destInput, setDestInput] = useState('');
    const [startResults, setStartResults] = useState<LocationSearchResult[]>([]);
    const [destResults, setDestResults] = useState<LocationSearchResult[]>([]);
    const [selectedStart, setSelectedStart] = useState<LocationSearchResult | null>(null);
    const [selectedDest, setSelectedDest] = useState<LocationSearchResult | null>(null);
    const [showStartResults, setShowStartResults] = useState(false);
    const [showDestResults, setShowDestResults] = useState(false);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);
    const [favorites, setFavorites] = useState<FavoriteStation[]>([]);
    const [lastFocusedField, setLastFocusedField] = useState<'start' | 'dest' | null>(null);
    const [swapTurns, setSwapTurns] = useState(0);
    const destInputRef = useRef<HTMLInputElement | null>(null);

    // 콜백은 최신 값을 ref로 읽는다 (계산 effect가 콜백 때문에 다시 돌지 않게)
    const cb = useRef({ onRouteFound, onRouteClear, onError });
    cb.current = { onRouteFound, onRouteClear, onError };

    useEffect(() => {
        try {
            setFavorites(getFavorites());
        } catch (error) {
            console.error('즐겨찾기 로드 실패:', error);
        }
    }, []);

    useEffect(() => {
        if (initialStart) {
            setSelectedStart(initialStart);
            setStartInput(initialStart.name);
        }
        if (initialDest) {
            setSelectedDest(initialDest);
            setDestInput(initialDest.name);
        }
    }, [initialStart, initialDest]);

    useEffect(() => {
        if (!focusDestToken) return;
        const t = setTimeout(() => destInputRef.current?.focus(), 120);
        return () => clearTimeout(t);
    }, [focusDestToken]);

    // 출발·도착이 모두 정해지면 경로를 계산하고, 하나라도 비면 기존 경로를 지운다
    useEffect(() => {
        if (!selectedStart || !selectedDest) {
            cb.current.onRouteClear();
            return;
        }
        const route = calculateOptimalRoute(selectedStart.coords, selectedDest.coords, stations);
        if (route) cb.current.onRouteFound(route);
        else {
            cb.current.onRouteClear();
            cb.current.onError('경로를 계산할 수 없습니다. 주변 정류소가 부족합니다.');
        }
    }, [selectedStart, selectedDest, stations]);

    const handleUseCurrentLocation = async () => {
        setIsLoadingLocation(true);
        try {
            const coords = await getCurrentLocation();
            setSelectedStart({ name: '현재 위치', address: '', roadAddress: '', coords });
            setStartInput('현재 위치');
            setStartResults([]);
            setShowStartResults(false);
        } catch (error) {
            cb.current.onError(error instanceof Error ? error.message : '현재 위치를 가져올 수 없습니다');
        } finally {
            setIsLoadingLocation(false);
        }
    };

    const handleStartSearch = async (query: string) => {
        setStartInput(query);
        setSelectedStart(null);
        if (query.length < 2) {
            setStartResults([]);
            setShowStartResults(false);
            return;
        }
        try {
            const results = await searchKakaoLocation(query);
            setStartResults(results);
            setShowStartResults(results.length > 0);
        } catch { setStartResults([]); }
    };

    const handleDestSearch = async (query: string) => {
        setDestInput(query);
        setSelectedDest(null);
        if (query.length < 2) {
            setDestResults([]);
            setShowDestResults(false);
            return;
        }
        try {
            const results = await searchKakaoLocation(query);
            setDestResults(results);
            setShowDestResults(results.length > 0);
        } catch { setDestResults([]); }
    };

    // 출발/도착 입력값·선택값·검색결과를 통째로 맞바꾼다
    const handleSwap = () => {
        setSwapTurns(n => n + 1);
        setStartInput(destInput); setDestInput(startInput);
        setSelectedStart(selectedDest); setSelectedDest(selectedStart);
        setStartResults(destResults); setDestResults(startResults);
        setShowStartResults(false); setShowDestResults(false);
    };

    const pickFavorite = (fav: FavoriteStation) => {
        const asLocation: LocationSearchResult = {
            name: fav.nickname || fav.name,
            address: fav.address,
            roadAddress: fav.address,
            coords: { latitude: fav.x_pos, longitude: fav.y_pos },
        };
        if (lastFocusedField === 'start') {
            setSelectedStart(asLocation);
            setStartInput(asLocation.name);
        } else {
            setSelectedDest(asLocation);
            setDestInput(asLocation.name);
        }
    };

    const focusedInputEmpty = lastFocusedField === 'start' ? !startInput : lastFocusedField === 'dest' ? !destInput : false;
    const showFavorites = focusedInputEmpty && favorites.length > 0 && !showStartResults && !showDestResults;

    const results = showStartResults ? startResults : showDestResults ? destResults : [];
    const pickResult = (r: LocationSearchResult) => {
        if (showStartResults) { setSelectedStart(r); setStartInput(r.name); setShowStartResults(false); }
        else { setSelectedDest(r); setDestInput(r.name); setShowDestResults(false); }
    };

    const fieldBase = 'grid grid-cols-[34px_1fr_auto] items-center min-h-[48px] focus-within:[&>label]:text-primary';
    const inputBase = 'min-w-0 h-11 text-base text-on-surface bg-transparent outline-none placeholder:text-on-surface-variant text-ellipsis';

    return (
        <>
            <div className="nav-pill pointer-events-auto relative w-full rounded-[26px] py-1 pl-[18px] pr-16">
                <div className={fieldBase}>
                    <label htmlFor="route-from" className="text-xs font-semibold text-on-surface-variant">출발</label>
                    <input
                        id="route-from"
                        type="text"
                        autoComplete="off"
                        value={startInput}
                        onChange={(e) => handleStartSearch(e.target.value)}
                        onFocus={() => setLastFocusedField('start')}
                        placeholder="출발지를 입력하세요"
                        className={inputBase}
                    />
                    {!startInput && (
                        <button
                            type="button"
                            onClick={handleUseCurrentLocation}
                            disabled={isLoadingLocation}
                            className="press ml-1 min-h-[36px] px-3 rounded-full bg-primary-container text-primary text-xs font-bold disabled:opacity-50"
                        >
                            {isLoadingLocation ? '찾는 중…' : '현재 위치'}
                        </button>
                    )}
                </div>
                <div className={`${fieldBase} border-t border-gray-900/[0.08]`}>
                    <label htmlFor="route-to" className="text-xs font-semibold text-on-surface-variant">도착</label>
                    <input
                        id="route-to"
                        ref={destInputRef}
                        type="text"
                        autoComplete="off"
                        value={destInput}
                        onChange={(e) => handleDestSearch(e.target.value)}
                        onFocus={() => setLastFocusedField('dest')}
                        placeholder="목적지를 입력하세요"
                        className={inputBase}
                    />
                </div>
                <button
                    type="button"
                    onClick={handleSwap}
                    aria-label="출발과 도착 바꾸기"
                    className="press absolute right-2.5 top-1/2 -mt-[22px] w-11 h-11 grid place-items-center rounded-full bg-gray-100 text-on-surface"
                    style={{ transform: `rotate(${swapTurns * 180}deg)`, transition: 'transform 0.4s var(--spring)' }}
                >
                    <UiIcon name="swap" className="w-5 h-5 rotate-90" />
                </button>
            </div>

            {results.length > 0 && (
                <div className={listCard}>
                    {results.slice(0, 4).map((r, i) => (
                        <button key={i} type="button" onClick={() => pickResult(r)} className={listRow}>
                            <div className="min-w-0">
                                <p className="text-[15px] font-semibold text-on-surface break-words">{r.name}</p>
                                <p className="text-[13px] text-on-surface-variant break-words">{r.roadAddress || r.address}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {showFavorites && (
                <div className={`${listCard} max-h-[240px] overflow-y-auto`}>
                    <p className="px-5 pt-3 pb-1 text-xs font-semibold text-on-surface-variant">자주 가는 곳</p>
                    {favorites.map((fav) => (
                        <button key={fav.id} type="button" onClick={() => pickFavorite(fav)} className={listRow}>
                            <div className="min-w-0">
                                <p className="text-[15px] font-semibold text-on-surface break-words">{fav.nickname || fav.name}</p>
                                <p className="text-[13px] text-on-surface-variant break-words">{fav.address}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </>
    );
};

export default RouteSearch;
