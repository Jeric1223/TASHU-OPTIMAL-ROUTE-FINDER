import React, { useState } from 'react';
import type { LocationSearchResult, OptimalRoute, Station } from '../types/index';
import { searchKakaoLocation } from '../services/kakoApiService';
import { calculateOptimalRoute } from '../services/routeService';
import { getCurrentLocation } from '../services/locationService';

interface RouteSearchProps {
    stations: Station[];
    onRouteFound: (route: OptimalRoute) => void;
    onError: (error: string) => void;
}

const RouteSearch: React.FC<RouteSearchProps> = ({ stations, onRouteFound, onError }) => {
    const [startInput, setStartInput] = useState('');
    const [destInput, setDestInput] = useState('');
    const [startResults, setStartResults] = useState<LocationSearchResult[]>([]);
    const [destResults, setDestResults] = useState<LocationSearchResult[]>([]);
    const [selectedStart, setSelectedStart] = useState<LocationSearchResult | null>(null);
    const [selectedDest, setSelectedDest] = useState<LocationSearchResult | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [showStartResults, setShowStartResults] = useState(false);
    const [showDestResults, setShowDestResults] = useState(false);
    const [isLoadingLocation, setIsLoadingLocation] = useState(false);

    const handleUseCurrentLocation = async () => {
        setIsLoadingLocation(true);
        try {
            const coords = await getCurrentLocation();
            setSelectedStart({ name: '현재 위치', address: '', roadAddress: '', coords });
            setStartInput('현재 위치');
            setStartResults([]);
            setShowStartResults(false);
        } catch (error) {
            onError(error instanceof Error ? error.message : '현재 위치를 가져올 수 없습니다');
        } finally {
            setIsLoadingLocation(false);
        }
    };

    const handleStartSearch = async (query: string) => {
        setStartInput(query);
        setSelectedStart(null);
        if (query.length < 2) { setStartResults([]); setShowStartResults(false); return; }
        try {
            setIsSearching(true);
            const results = await searchKakaoLocation(query);
            setStartResults(results);
            setShowStartResults(results.length > 0);
        } catch { setStartResults([]); } finally { setIsSearching(false); }
    };

    const handleDestSearch = async (query: string) => {
        setDestInput(query);
        setSelectedDest(null);
        if (query.length < 2) { setDestResults([]); setShowDestResults(false); return; }
        try {
            setIsSearching(true);
            const results = await searchKakaoLocation(query);
            setDestResults(results);
            setShowDestResults(results.length > 0);
        } catch { setDestResults([]); } finally { setIsSearching(false); }
    };

    const handleFindRoute = () => {
        if (!selectedStart || !selectedDest) {
            onError('출발지와 목적지를 모두 선택해주세요');
            return;
        }
        const route = calculateOptimalRoute(selectedStart.coords, selectedDest.coords, stations);
        if (route) onRouteFound(route);
        else onError('경로를 계산할 수 없습니다. 주변 정류소가 부족합니다.');
    };

    return (
        <div className="space-y-5">
            {/* 출발/도착 입력 카드 */}
            <div className="bg-surface-container-lowest rounded-xl breathe-shadow">
                {/* 출발지 */}
                <div className="flex items-center px-5 py-4 gap-3 border-b border-outline-variant/10">
                    <div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-sm text-on-surface-variant">radio_button_checked</span>
                    </div>
                    <input
                        type="text"
                        value={startInput}
                        onChange={(e) => handleStartSearch(e.target.value)}
                        onFocus={() => startInput.length >= 2 && setShowStartResults(true)}
                        placeholder="출발지를 입력하세요"
                        className="flex-1 bg-transparent text-on-surface placeholder:text-outline text-sm font-medium outline-none"
                    />
                    {startInput ? (
                        <button onClick={() => { setStartInput(''); setSelectedStart(null); setStartResults([]); }} className="text-outline hover:text-on-surface">
                            <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                    ) : (
                        <button
                            onClick={handleUseCurrentLocation}
                            disabled={isLoadingLocation}
                            className="text-primary hover:opacity-70 transition-opacity flex items-center gap-1"
                        >
                            {isLoadingLocation
                                ? <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                : <span className="material-symbols-outlined text-sm filled">my_location</span>
                            }
                        </button>
                    )}
                </div>

                {/* 스왑 버튼 */}
                <div className="flex items-center px-5 py-1">
                    <div className="flex-1 h-px bg-outline-variant/10" />
                    <div className="w-6 h-6 rounded-full border border-outline-variant/30 flex items-center justify-center mx-3">
                        <span className="material-symbols-outlined text-xs text-on-surface-variant">swap_vert</span>
                    </div>
                    <div className="flex-1 h-px bg-outline-variant/10" />
                </div>

                {/* 목적지 */}
                <div className="flex items-center px-5 py-4 gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-sm text-primary filled">location_on</span>
                    </div>
                    <input
                        type="text"
                        value={destInput}
                        onChange={(e) => handleDestSearch(e.target.value)}
                        onFocus={() => destInput.length >= 2 && setShowDestResults(true)}
                        placeholder="목적지를 입력하세요"
                        className="flex-1 bg-transparent text-on-surface placeholder:text-outline text-sm font-medium outline-none"
                    />
                    {destInput && (
                        <button onClick={() => { setDestInput(''); setSelectedDest(null); setDestResults([]); }} className="text-outline hover:text-on-surface">
                            <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                    )}
                </div>
            </div>

            {/* 출발지 검색 결과 (카드 외부 - overflow 클리핑 방지) */}
            {showStartResults && startResults.length > 0 && (
                <div className="bg-surface-container-lowest rounded-xl breathe-shadow border border-outline-variant/10 overflow-hidden -mt-3">
                    {startResults.slice(0, 4).map((r, i) => (
                        <button key={i} onClick={() => { setSelectedStart(r); setStartInput(r.name); setShowStartResults(false); }}
                            className="w-full text-left flex items-start gap-3 px-5 py-3 hover:bg-surface-container-low border-b border-outline-variant/10 last:border-0">
                            <span className="material-symbols-outlined text-sm text-primary mt-0.5">location_on</span>
                            <div>
                                <p className="text-sm font-semibold text-on-surface">{r.name}</p>
                                <p className="text-xs text-on-surface-variant">{r.roadAddress || r.address}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* 목적지 검색 결과 (카드 외부 - overflow 클리핑 방지) */}
            {showDestResults && destResults.length > 0 && (
                <div className="bg-surface-container-lowest rounded-xl breathe-shadow border border-outline-variant/10 overflow-hidden -mt-3">
                    {destResults.slice(0, 4).map((r, i) => (
                        <button key={i} onClick={() => { setSelectedDest(r); setDestInput(r.name); setShowDestResults(false); }}
                            className="w-full text-left flex items-start gap-3 px-5 py-3 hover:bg-surface-container-low border-b border-outline-variant/10 last:border-0">
                            <span className="material-symbols-outlined text-sm text-primary mt-0.5">location_on</span>
                            <div>
                                <p className="text-sm font-semibold text-on-surface">{r.name}</p>
                                <p className="text-xs text-on-surface-variant">{r.roadAddress || r.address}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* 선택된 출발/도착 표시 */}
            {(selectedStart || selectedDest) && (
                <div className="grid grid-cols-2 gap-3">
                    {selectedStart && (
                        <div className="bg-primary/5 rounded-xl p-3 border border-primary/10">
                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5">출발</p>
                            <p className="text-sm font-bold text-on-surface truncate">{selectedStart.name}</p>
                        </div>
                    )}
                    {selectedDest && (
                        <div className="bg-surface-container-low rounded-xl p-3">
                            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-0.5">도착</p>
                            <p className="text-sm font-bold text-on-surface truncate">{selectedDest.name}</p>
                        </div>
                    )}
                </div>
            )}

            {/* 경로 찾기 버튼 */}
            <button
                onClick={handleFindRoute}
                disabled={!selectedStart || !selectedDest || isSearching}
                className="w-full bg-gradient-to-br from-primary to-primary-dim text-white font-headline font-bold py-4 rounded-xl flex items-center justify-center gap-3 breathe-shadow active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
                {isSearching
                    ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <span className="material-symbols-outlined">route</span>
                }
                <span>{isSearching ? '경로 계산 중...' : '경로 찾기'}</span>
            </button>
        </div>
    );
};

export default RouteSearch;
