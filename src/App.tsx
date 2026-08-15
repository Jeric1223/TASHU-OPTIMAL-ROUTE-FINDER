import React, { useState, useCallback, useEffect, useMemo } from "react";
import type { Station, StationWithDistance, Coordinates, LocationSearchResult, OptimalRoute, FavoriteStation } from "./types/index";
import { getCurrentLocation } from "./services/locationService";
import { findNearestStation, findNearestAvailableStation, fetchTashuStations, haversineDistance } from "./services/tashuService";
import DestinationSearch from "./components/DestinationSearch";
import FavoritesList from "./components/FavoritesList";
import RouteSearch from "./components/RouteSearch";
import RouteResult from "./components/RouteResult";
import InstallPrompt from "./components/InstallPrompt";
import TashuMap from "./components/TashuMap";
import StationCard from "./components/StationCard";
import Sheet, { SheetSnap } from "./components/Sheet";
import { searchKakaoLocation } from "./services/kakoApiService";
import "./styles/index.css";

export enum Tab {
    Nearby = "NEARBY",
    Destination = "DESTINATION",
    Route = "ROUTE",
    Favorites = "FAVORITES",
    More = "MORE",
}

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>(Tab.Nearby);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [sheetSnap, setSheetSnap] = useState<SheetSnap>('peek');

    const [stations, setStations] = useState<Station[]>([]);
    const [isDataLoading, setIsDataLoading] = useState<boolean>(true);
    const [dataError, setDataError] = useState<string | null>(null);

    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    const [destinationResult, setDestinationResult] = useState<StationWithDistance | null>(null);
    const [nearbyResult, setNearbyResult] = useState<StationWithDistance | null>(null);
    const [destinationSearchResults, setDestinationSearchResults] = useState<LocationSearchResult[] | null>(null);
    const [selectedDestination, setSelectedDestination] = useState<Coordinates | null>(null);
    const [selectedStationOnMap, setSelectedStationOnMap] = useState<StationWithDistance | null>(null);

    const [mapCenter, setMapCenter] = useState<[number, number]>([36.351, 127.385]);
    const [mapZoom, setMapZoom] = useState<number>(13);
    const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
    const [isCentering, setIsCentering] = useState<boolean>(false);
    const [currentRoute, setCurrentRoute] = useState<OptimalRoute | null>(null);

    const [routeStartStation, setRouteStartStation] = useState<LocationSearchResult | null>(null);
    const [routeEndStation, setRouteEndStation] = useState<LocationSearchResult | null>(null);

    const loadStations = useCallback(async () => {
        setIsDataLoading(true);
        setDataError(null);
        try {
            const fetchedStations = await fetchTashuStations();
            setStations(fetchedStations);
        } catch (err) {
            setDataError(err instanceof Error ? err.message : "정류장 데이터를 불러오는 데 실패했습니다.");
        } finally {
            setIsDataLoading(false);
        }
    }, []);

    const handleNearbySearch = useCallback(async () => {
        setIsSearching(true);
        setSearchError(null);
        setNearbyResult(null);
        setUserLocation(null);
        setSelectedDestination(null);
        setDestinationSearchResults(null);
        setDestinationResult(null);
        setSelectedStationOnMap(null);
        try {
            const userCoords = await getCurrentLocation();
            setUserLocation(userCoords);
            const nearestAvailableStation = findNearestAvailableStation(userCoords, stations);
            if (nearestAvailableStation) {
                setNearbyResult(nearestAvailableStation);
                setMapCenter([userCoords.latitude, userCoords.longitude]);
                setMapZoom(16);
            } else {
                setMapCenter([userCoords.latitude, userCoords.longitude]);
                setMapZoom(16);
                setSearchError("현재 위치 근처에 대여 가능한 타슈가 있는 정류소가 없습니다.");
                setTimeout(() => setSearchError(null), 3000);
            }
        } catch (err) {
            setSearchError(err instanceof Error ? err.message : "위치 정보 접근 권한이 거부되었습니다.");
        } finally {
            setIsSearching(false);
        }
    }, [stations]);

    useEffect(() => {
        loadStations();
        handleNearbySearch();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // 거리순 주변 정류소 목록 (화면 1: 주변 정류소) — tashuService.haversineDistance만 소비, 서비스 로직은 불변.
    const nearbyStations = useMemo<StationWithDistance[]>(() => {
        if (!userLocation) return [];
        return stations
            .map((s) => ({
                ...s,
                distance: haversineDistance(userLocation, { latitude: s.x_pos, longitude: s.y_pos }),
            }))
            .sort((a, b) => a.distance - b.distance)
            .slice(0, 20);
    }, [stations, userLocation]);

    const handleStationSelect = useCallback((station: FavoriteStation) => {
        const stationWithDistance: StationWithDistance = {
            ...station,
            distance: station.distance || 0,
        };
        setSelectedStationOnMap(stationWithDistance);
        setMapCenter([station.x_pos, station.y_pos]);
        setMapZoom(16);
        setSheetSnap('full');
    }, []);

    const handleSetRouteStart = useCallback((station: StationWithDistance) => {
        const routeStart: LocationSearchResult = {
            name: station.name,
            address: station.address,
            roadAddress: station.address,
            coords: { latitude: station.x_pos, longitude: station.y_pos },
        };
        setRouteStartStation(routeStart);
        setActiveTab(Tab.Route);
    }, []);

    const handleSetRouteEnd = useCallback((station: StationWithDistance) => {
        const routeEnd: LocationSearchResult = {
            name: station.name,
            address: station.address,
            roadAddress: station.address,
            coords: { latitude: station.x_pos, longitude: station.y_pos },
        };
        setRouteEndStation(routeEnd);
        setActiveTab(Tab.Route);
    }, []);

    const handleDestinationSearch = useCallback(async (destination: string) => {
        if (!destination) { setSearchError("목적지를 입력해주세요."); return; }
        setIsSearching(true);
        setSearchError(null);
        setDestinationResult(null);
        setDestinationSearchResults(null);
        setSelectedDestination(null);
        setUserLocation(null);
        try {
            const results = await searchKakaoLocation(destination);
            if (results.length === 0) {
                setSearchError("검색 결과가 없습니다. 다른 검색어로 시도해 보세요.");
            } else {
                setDestinationSearchResults(results);
                setMapCenter([results[0].coords.latitude, results[0].coords.longitude]);
                setMapZoom(15);
            }
        } catch (err) {
            setSearchError(err instanceof Error ? err.message : "장소 검색에 실패했습니다.");
        } finally {
            setIsSearching(false);
        }
    }, []);

    const handleSelectSearchResult = useCallback((result: LocationSearchResult) => {
        setSelectedDestination(result.coords);
        setDestinationSearchResults(null);
        setSelectedStationOnMap(null);
        const nearestStation = findNearestStation(result.coords, stations);
        if (nearestStation) {
            setDestinationResult(nearestStation);
            const newCenterLat = (result.coords.latitude + nearestStation.x_pos) / 2;
            const newCenterLng = (result.coords.longitude + nearestStation.y_pos) / 2;
            setMapCenter([newCenterLat, newCenterLng]);
            setMapZoom(15);
        } else {
            setSearchError("가까운 타슈 정류소를 찾지 못했습니다.");
            setMapCenter([result.coords.latitude, result.coords.longitude]);
            setMapZoom(16);
        }
    }, [stations]);

    const handleClearDestinationSearch = useCallback(() => {
        setDestinationSearchResults(null);
        setDestinationResult(null);
        setSelectedDestination(null);
        setSearchError(null);
        setSelectedStationOnMap(null);
    }, []);

    const handleGoToUserLocation = useCallback(async () => {
        setIsCentering(true);
        try {
            const userCoords = await getCurrentLocation();
            setUserLocation(userCoords);
            setMapCenter([userCoords.latitude, userCoords.longitude]);
            setMapZoom(16);
        } catch (err) {
            setSearchError(err instanceof Error ? err.message : "위치 정보 접근 권한이 거부되었습니다.");
        } finally {
            setIsCentering(false);
        }
    }, []);

    const handleStationClick = useCallback((station: Station) => {
        let referenceCoords: Coordinates | null = null;
        if (activeTab === Tab.Nearby && userLocation) referenceCoords = userLocation;
        else if (activeTab === Tab.Destination && selectedDestination) referenceCoords = selectedDestination;

        const stationWithDistance: StationWithDistance = { ...station };
        if (referenceCoords) {
            stationWithDistance.distance = haversineDistance(referenceCoords, { latitude: station.x_pos, longitude: station.y_pos });
        }
        setSelectedStationOnMap(stationWithDistance);
        setDestinationResult(null);
        setNearbyResult(null);
        setMapCenter([station.x_pos, station.y_pos]);
        setMapZoom(16);
        if (activeTab === Tab.Nearby) setSheetSnap('full');
    }, [activeTab, userLocation, selectedDestination]);

    const handleRouteFound = (route: OptimalRoute) => {
        setCurrentRoute(route);
        setMapCenter([route.startStation.x_pos, route.startStation.y_pos]);
        setMapZoom(14);
    };

    const handleCloseStationDetail = useCallback(() => {
        setSelectedStationOnMap(null);
        setSheetSnap('half');
    }, []);

    // 데이터 로딩 화면
    if (isDataLoading && stations.length === 0) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-surface">
                <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin mb-4" style={{ borderWidth: '3px' }} />
                <p className="font-body font-medium text-on-surface-variant">타슈 정류장 정보를 불러오는 중...</p>
            </div>
        );
    }

    if (dataError && stations.length === 0) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-surface p-6">
                <div className="bg-white border border-outline-variant rounded-xl p-8 max-w-sm w-full text-center">
                    <span className="material-symbols-outlined text-4xl text-error mb-3 block">error</span>
                    <p className="font-headline font-bold text-on-surface text-lg mb-2">데이터 로딩 오류</p>
                    <p className="text-sm text-on-surface-variant mb-5">{dataError}</p>
                    <button
                        onClick={loadStations}
                        disabled={isDataLoading}
                        className="w-full bg-primary text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                    >
                        <span className="material-symbols-outlined text-sm">refresh</span>
                        재시도
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen w-screen overflow-hidden relative bg-surface">
            {/* 전체화면 지도 (z-map) */}
            <div className="absolute inset-0 z-[var(--z-map)]">
                <TashuMap
                    stations={stations}
                    center={mapCenter}
                    zoom={mapZoom}
                    userLocation={userLocation}
                    searchResult={nearbyResult || destinationResult}
                    selectedDestination={selectedDestination}
                    onStationClick={handleStationClick}
                    clickedStationId={selectedStationOnMap?.id}
                    route={currentRoute}
                />
            </div>

            {/* ── 상단 검색 트리거 (필-헤더 아님: 플랫, 그림자 없음) ── */}
            <header className="fixed top-0 inset-x-0 z-[var(--z-overlay)] pt-safe px-4">
                <div className="flex items-center h-14 mt-3 px-2 gap-1 bg-white rounded-xl border border-outline-variant">
                    <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-container-low transition-colors text-on-surface active:scale-95"
                        aria-label="메뉴"
                    >
                        <span className="material-symbols-outlined">menu</span>
                    </button>
                    <button
                        className="flex-1 flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-surface-container-low transition-colors text-left"
                        onClick={() => setActiveTab(Tab.Destination)}
                    >
                        <span className="material-symbols-outlined text-outline text-lg">search</span>
                        <span className="text-outline text-sm font-medium">어디로 갈까요?</span>
                    </button>
                    {isDataLoading && (
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                    )}
                </div>
            </header>

            {/* ── 지도 컨트롤 (우측) — 시트 상단 위에 고정 ── */}
            <div
                className="fixed right-4 z-[var(--z-overlay)] flex flex-col gap-3"
                style={{ bottom: activeTab === Tab.Nearby ? 'calc(var(--nav-h) + var(--sheet-h) + 16px)' : 'calc(var(--nav-h) + 16px)' }}
            >
                <button
                    onClick={loadStations}
                    disabled={isDataLoading}
                    className="w-11 h-11 bg-white text-on-surface-variant rounded-full flex items-center justify-center border border-outline-variant active:scale-90 transition-all disabled:opacity-50"
                >
                    <span className={`material-symbols-outlined text-[20px] ${isDataLoading ? 'animate-spin' : ''}`}>refresh</span>
                </button>
                <button
                    onClick={handleGoToUserLocation}
                    disabled={isCentering}
                    className="w-12 h-12 bg-white text-primary rounded-full flex items-center justify-center border border-outline-variant active:scale-90 transition-all"
                >
                    <span className="material-symbols-outlined filled">my_location</span>
                </button>
            </div>

            {/* ── 화면 1·2: 주변 정류소 목록 + 상세 (단일 Sheet) ── */}
            {activeTab === Tab.Nearby && (
                <Sheet
                    snap={sheetSnap}
                    onSnapChange={setSheetSnap}
                    peekContent={
                        selectedStationOnMap ? null : (
                            // 리스트 항목과 같은 동작: 눌러서 해당 정류소 상세를 편다.
                            <button
                                type="button"
                                onClick={() => {
                                    if (nearbyResult) setSelectedStationOnMap(nearbyResult);
                                    setSheetSnap('full');
                                }}
                                className="w-full text-left flex items-center justify-between border-b border-outline-variant pb-3 active:opacity-70 transition-opacity"
                            >
                                <div className="min-w-0">
                                    <p className="text-[13px] font-semibold text-on-surface-variant">
                                        {/* findNearestAvailableStation은 parking_count > 0만 남긴다.
                                            "가장 가까운 정류소"가 아니라 "빌릴 수 있는" 정류소다. */}
                                        {nearbyResult ? '가장 가까운 대여 가능 정류소' : '내 주변 정류소'}
                                    </p>
                                    <p className="text-base font-headline font-bold text-on-surface truncate">
                                        {nearbyResult ? nearbyResult.name : `${nearbyStations.length}곳 검색됨`}
                                    </p>
                                </div>
                                {nearbyResult && (
                                    <span className="text-2xl font-headline font-black text-primary flex-shrink-0 ml-3">
                                        {nearbyResult.parking_count}<span className="text-xs font-bold ml-0.5">대</span>
                                    </span>
                                )}
                            </button>
                        )
                    }
                >
                    {selectedStationOnMap ? (
                        <div className="relative pt-1">
                            <button
                                onClick={handleCloseStationDetail}
                                className="absolute -top-1 right-0 z-10 w-8 h-8 bg-white rounded-full flex items-center justify-center border border-outline-variant"
                                aria-label="닫기"
                            >
                                <span className="material-symbols-outlined text-sm text-on-surface-variant">close</span>
                            </button>
                            <StationCard
                                station={selectedStationOnMap}
                                onSetAsStart={handleSetRouteStart}
                                onSetAsEnd={handleSetRouteEnd}
                            />
                        </div>
                    ) : (
                        <div>
                            {nearbyStations.length === 0 && (
                                <p className="text-sm text-on-surface-variant py-8 text-center">
                                    {isSearching ? '주변 정류소를 찾는 중...' : '위치 정보를 불러오면 주변 정류소가 표시됩니다.'}
                                </p>
                            )}
                            {nearbyStations.map((s) => (
                                <button
                                    key={s.id}
                                    onClick={() => { setSelectedStationOnMap(s); setSheetSnap('full'); }}
                                    className="w-full flex items-center justify-between gap-3 py-3 border-b border-outline-variant last:border-0 text-left"
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold text-on-surface truncate">{s.name}</p>
                                        <p className="text-xs text-on-surface-variant truncate">{s.address}</p>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0">
                                        <span className="text-xs text-on-surface-variant">
                                            {s.distance! < 1 ? `${Math.round(s.distance! * 1000)}m` : `${s.distance!.toFixed(1)}km`}
                                        </span>
                                        <span className={`text-sm font-bold ${s.parking_count > 0 ? 'text-primary' : 'text-gray-400'}`}>
                                            {s.parking_count}대
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </Sheet>
            )}

            {/* ── 내 주변 탭 에러 안내 ── */}
            {activeTab === Tab.Nearby && searchError && !isSearching && sheetSnap === 'peek' && (
                <div className="fixed left-4 right-4 z-[var(--z-overlay)] animate-slide-up" style={{ bottom: 'calc(var(--nav-h) + var(--sheet-h) + 12px)' }}>
                    <div className="error-box flex items-start gap-3">
                        <span className="material-symbols-outlined text-sm mt-0.5">error</span>
                        <p className="text-sm">{searchError}</p>
                    </div>
                </div>
            )}

            {/* ── 하단 내비게이션 바 (주변/경로/즐겨찾기/더보기) ── */}
            <nav className="fixed bottom-0 w-full z-[var(--z-nav)] flex justify-around items-center px-4 pb-safe pt-3 bottom-nav" style={{ height: 'var(--nav-h)' }}>
                <NavTab
                    icon="explore"
                    label="주변"
                    active={activeTab === Tab.Nearby}
                    onClick={() => {
                        setActiveTab(Tab.Nearby);
                        setSheetSnap('peek');
                        handleNearbySearch();
                    }}
                />
                <NavTab
                    icon="near_me"
                    label="경로"
                    active={activeTab === Tab.Route}
                    onClick={() => setActiveTab(Tab.Route)}
                />
                <NavTab
                    icon="favorite"
                    label="즐겨찾기"
                    active={activeTab === Tab.Favorites}
                    onClick={() => setActiveTab(Tab.Favorites)}
                />
                <NavTab
                    icon="more_horiz"
                    label="더보기"
                    active={isSidebarOpen}
                    onClick={() => setIsSidebarOpen(true)}
                />
            </nav>

            {/* ── 목적지 검색 오버레이 ── */}
            {activeTab === Tab.Destination && (
                <DestinationSearch
                    onSearch={handleDestinationSearch}
                    onSelectResult={handleSelectSearchResult}
                    onClear={handleClearDestinationSearch}
                    onBack={() => setActiveTab(Tab.Nearby)}
                    searchResults={destinationSearchResults}
                    result={destinationResult}
                    loading={isSearching}
                    error={searchError}
                    onSetAsStart={handleSetRouteStart}
                    onSetAsEnd={handleSetRouteEnd}
                />
            )}

            {/* ── 경로 탭 오버레이 ── */}
            {activeTab === Tab.Route && (
                <div className="fixed inset-0 z-[70] flex flex-col animate-fade-in pt-safe" style={{ bottom: 'var(--nav-h)' }}>
                    <div className="absolute inset-0 bg-white" />
                    <div className="relative z-10 flex flex-col h-full">
                        <header className="flex items-center px-2 h-14 mt-3 mx-4 border-b border-outline-variant">
                            <button
                                onClick={() => setActiveTab(Tab.Nearby)}
                                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-container-low transition-colors text-on-surface active:scale-95"
                            >
                                <span className="material-symbols-outlined">arrow_back</span>
                            </button>
                            <div className="flex-1 flex justify-center">
                                <h1 className="font-headline font-bold text-lg text-on-surface">경로 찾기</h1>
                            </div>
                            <div className="w-10" />
                        </header>
                        <div className="flex-1 overflow-y-auto pt-4 px-4 pb-8 no-scrollbar">
                            {!currentRoute
                                ? <RouteSearch
                                    stations={stations}
                                    onRouteFound={handleRouteFound}
                                    onError={(e) => setSearchError(e)}
                                    initialStart={routeStartStation}
                                    initialDest={routeEndStation}
                                  />
                                : <RouteResult route={currentRoute} onClose={() => setCurrentRoute(null)} />
                            }
                        </div>
                    </div>
                </div>
            )}

            {/* ── 즐겨찾기 오버레이 ── */}
            {activeTab === Tab.Favorites && (
                <FavoritesList
                    onBack={() => setActiveTab(Tab.Nearby)}
                    onNavigateToMap={() => setActiveTab(Tab.Nearby)}
                    onNavigateToRoute={() => setActiveTab(Tab.Route)}
                    onStationSelect={handleStationSelect}
                    userLocation={userLocation}
                />
            )}

            {/* ── 사이드바 드로어 ── */}
            {isSidebarOpen && (
                <>
                    <div
                        className="fixed inset-0 z-[80] bg-gray-900/30"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                    <div className="fixed top-0 left-0 bottom-0 z-[90] w-72 bg-surface-container-lowest border-r border-outline-variant animate-sidebar-in flex flex-col">
                        {/* 사이드바 헤더 */}
                        <div className="flex items-center justify-between px-5 pt-14 pb-6 border-b border-outline-variant">
                            <div>
                                <h2 className="font-headline font-extrabold text-2xl text-primary">타슈</h2>
                                <p className="text-xs text-on-surface-variant mt-0.5">대전 공공자전거</p>
                            </div>
                            <button
                                onClick={() => setIsSidebarOpen(false)}
                                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-container-low transition-colors text-on-surface-variant"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* 메뉴 항목 */}
                        <nav className="flex-1 px-3 py-4 space-y-1">
                            <SidebarItem icon="info" label="앱 정보" />
                            <SidebarItem icon="help" label="자주 묻는 질문" />
                            <SidebarItem icon="feedback" label="의견 보내기" onClick={() => window.open('https://github.com', '_blank')} />
                            <SidebarItem icon="refresh" label="데이터 새로고침" onClick={() => { loadStations(); setIsSidebarOpen(false); }} />
                        </nav>

                        {/* 푸터 */}
                        <div className="px-5 py-6 border-t border-outline-variant">
                            <p className="text-xs text-on-surface-variant">
                                자전거 대수는 약 5분마다 업데이트됩니다. 현장과 다를 수 있어요.
                            </p>
                        </div>
                    </div>
                </>
            )}

            <InstallPrompt />
        </div>
    );
};

interface NavTabProps {
    icon: string;
    label: string;
    active: boolean;
    onClick: () => void;
}

const NavTab: React.FC<NavTabProps> = ({ icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-xl transition-all active:scale-90 ${
            active
                ? 'bg-primary-container text-primary'
                : 'text-on-surface-variant hover:text-on-surface'
        }`}
    >
        <span className={`material-symbols-outlined ${active ? 'filled' : ''}`}>{icon}</span>
        <span className="text-[11px] font-semibold font-label">{label}</span>
    </button>
);

interface SidebarItemProps {
    icon: string;
    label: string;
    onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ icon, label, onClick }) => (
    <button
        onClick={onClick}
        className="w-full flex items-center gap-4 px-4 py-3 rounded-lg hover:bg-surface-container-low transition-colors text-on-surface"
    >
        <span className="material-symbols-outlined text-on-surface-variant">{icon}</span>
        <span className="font-medium text-sm">{label}</span>
    </button>
);

export default App;
