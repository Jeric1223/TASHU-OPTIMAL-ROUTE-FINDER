import React, { useState, useEffect } from 'react';
import type { Coordinates, LocationSearchResult, OptimalRoute, Station } from '../types/index';
import { searchKakaoLocation } from '../services/kakoApiService';
import { calculateOptimalRoute } from '../services/routeService';
import { getCurrentLocation } from '../services/locationService';
import { SearchIcon, CloseIcon } from './icons';

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
    const [isLoadingCurrentLocation, setIsLoadingCurrentLocation] = useState(false);

    const handleUseCurrentLocation = async () => {
        setIsLoadingCurrentLocation(true);
        try {
            const coords = await getCurrentLocation();
            // Create a location result for current location
            setSelectedStart({
                name: '현재 위치',
                address: `위도: ${coords.latitude.toFixed(4)}, 경도: ${coords.longitude.toFixed(4)}`,
                roadAddress: '',
                coords,
            });
            setStartInput('현재 위치');
            setStartResults([]);
            setShowStartResults(false);
        } catch (error) {
            onError(error instanceof Error ? error.message : '현재 위치를 가져올 수 없습니다');
        } finally {
            setIsLoadingCurrentLocation(false);
        }
    };

    const handleStartSearch = async (query: string) => {
        setStartInput(query);
        if (query.length < 2) {
            setStartResults([]);
            return;
        }

        try {
            setIsSearching(true);
            const results = await searchKakaoLocation(query);
            setStartResults(results);
            setShowStartResults(true);
        } catch (error) {
            onError(error instanceof Error ? error.message : '검색 중 오류가 발생했습니다');
            setStartResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleDestSearch = async (query: string) => {
        setDestInput(query);
        if (query.length < 2) {
            setDestResults([]);
            return;
        }

        try {
            setIsSearching(true);
            const results = await searchKakaoLocation(query);
            setDestResults(results);
            setShowDestResults(true);
        } catch (error) {
            onError(error instanceof Error ? error.message : '검색 중 오류가 발생했습니다');
            setDestResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSelectStart = (result: LocationSearchResult) => {
        setSelectedStart(result);
        setStartInput(result.name);
        setShowStartResults(false);
        setStartResults([]);
    };

    const handleSelectDest = (result: LocationSearchResult) => {
        setSelectedDest(result);
        setDestInput(result.name);
        setShowDestResults(false);
        setDestResults([]);
    };

    const handleFindRoute = () => {
        if (!selectedStart || !selectedDest) {
            onError('출발지와 목적지를 모두 선택해주세요');
            return;
        }

        try {
            const route = calculateOptimalRoute(selectedStart.coords, selectedDest.coords, stations);
            if (route) {
                onRouteFound(route);
            } else {
                onError('경로를 계산할 수 없습니다. 주변 정류소가 부족합니다.');
            }
        } catch (error) {
            onError(error instanceof Error ? error.message : '경로 계산 중 오류가 발생했습니다');
        }
    };

    const clearStart = () => {
        setStartInput('');
        setSelectedStart(null);
        setStartResults([]);
        setShowStartResults(false);
    };

    const clearDest = () => {
        setDestInput('');
        setSelectedDest(null);
        setDestResults([]);
        setShowDestResults(false);
    };

    return (
        <div className="space-y-4">
            {/* Start Location */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">출발지</label>
                <div className="relative">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={startInput}
                            onChange={(e) => handleStartSearch(e.target.value)}
                            onFocus={() => startInput.length >= 2 && setShowStartResults(true)}
                            placeholder="출발지를 입력하세요"
                            className="neomorph-input flex-1"
                        />
                        <button
                            onClick={handleUseCurrentLocation}
                            disabled={isLoadingCurrentLocation}
                            className="neomorph-btn px-3 flex items-center justify-center whitespace-nowrap text-sm font-semibold disabled:opacity-50 disabled:cursor-wait hover:bg-blue-50 transition-colors"
                            title="현재 위치 사용"
                        >
                            📍 현재위치
                        </button>
                        {startInput && (
                            <button
                                onClick={clearStart}
                                className="neomorph-btn p-2 flex items-center justify-center"
                                aria-label="출발지 초기화"
                            >
                                <CloseIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Start Results Dropdown */}
                    {showStartResults && startResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 neomorph-inset p-3 rounded-lg max-h-60 overflow-y-auto z-20">
                            {startResults.map((result, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSelectStart(result)}
                                    className="w-full text-left p-3 hover:bg-blue-50 rounded-lg transition-colors mb-1 last:mb-0"
                                >
                                    <div className="font-semibold text-gray-800">{result.name}</div>
                                    <div className="text-xs text-gray-600">{result.address}</div>
                                </button>
                            ))}
                        </div>
                    )}

                    {selectedStart && (
                        <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="font-semibold text-blue-900">{selectedStart.name}</div>
                            <div className="text-xs text-blue-700">{selectedStart.address}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Destination */}
            <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">목적지</label>
                <div className="relative">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={destInput}
                            onChange={(e) => handleDestSearch(e.target.value)}
                            onFocus={() => destInput.length >= 2 && setShowDestResults(true)}
                            placeholder="목적지를 입력하세요"
                            className="neomorph-input flex-1"
                        />
                        {destInput && (
                            <button
                                onClick={clearDest}
                                className="neomorph-btn p-2 flex items-center justify-center"
                                aria-label="목적지 초기화"
                            >
                                <CloseIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Destination Results Dropdown */}
                    {showDestResults && destResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 neomorph-inset p-3 rounded-lg max-h-60 overflow-y-auto z-20">
                            {destResults.map((result, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSelectDest(result)}
                                    className="w-full text-left p-3 hover:bg-blue-50 rounded-lg transition-colors mb-1 last:mb-0"
                                >
                                    <div className="font-semibold text-gray-800">{result.name}</div>
                                    <div className="text-xs text-gray-600">{result.address}</div>
                                </button>
                            ))}
                        </div>
                    )}

                    {selectedDest && (
                        <div className="mt-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="font-semibold text-blue-900">{selectedDest.name}</div>
                            <div className="text-xs text-blue-700">{selectedDest.address}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Search Button */}
            <button
                onClick={handleFindRoute}
                disabled={!selectedStart || !selectedDest || isSearching}
                className="neomorph-btn-primary w-full font-bold py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isSearching ? '검색 중...' : '경로 찾기'}
            </button>
        </div>
    );
};

export default RouteSearch;
