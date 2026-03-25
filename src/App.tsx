import React, { useState, useCallback, useEffect } from "react";
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
import NearbySearch from "./components/NearbySearch";
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

    const handleStationSelect = useCallback((station: FavoriteStation) => {
        const stationWithDistance: StationWithDistance = {
            ...station,
            distance: station.distance || 0,
        };
        setSelectedStationOnMap(stationWithDistance);
        setMapCenter([station.x_pos, station.y_pos]);
        setMapZoom(16);
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
    }, [activeTab, userLocation, selectedDestination]);

    const handleRouteFound = (route: OptimalRoute) => {
        setCurrentRoute(route);
        setMapCenter([route.startStation.x_pos, route.startStation.y_pos]);
        setMapZoom(14);
    };

    // 플로팅 카드: nearbyResult = compact, selectedStationOnMap = 풀 시트
    const showNearbyCard = activeTab === Tab.Nearby && nearbyResult && !selectedStationOnMap;
    const showStationSheet = activeTab === Tab.Nearby && selectedStationOnMap;
    const showFloatingCard = showNearbyCard || showStationSheet;

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
                <div className="glass-panel bg-white/90 rounded-xl p-8 max-w-sm w-full text-center breathe-shadow">
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
            {/* 전체화면 지도 - z-0으로 스태킹 컨텍스트 생성 (Leaflet 내부 z-index 봉쇄) */}
            <div className="absolute inset-0 z-0">
                <TashuMap
                    stations={stations}
                    center={mapCenter}
                    zoom={mapZoom}
                    userLocation={userLocation}
                    searchResult={nearbyResult || destinationResult}
                    selectedDestination={selectedDestination}
                    onStationClick={handleStationClick}
                    clickedStationId={selectedStationOnMap?.id}
                    onGoToUserLocation={handleGoToUserLocation}
                    isCentering={isCentering}
                    route={currentRoute}
                />
            </div>

            {/* ── Pill 상단 헤더 ── */}
            <header className="fixed top-4 left-4 right-4 z-[60] flex items-center h-14 px-3 pill-header rounded-full">
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors text-primary active:scale-95"
                >
                    <span className="material-symbols-outlined">menu</span>
                </button>
                <div className="flex-1 flex items-center px-2 gap-2">
                    <span className="text-xl font-headline font-extrabold text-primary tracking-tight">타슈</span>
                    <div className="h-5 w-px bg-outline-variant/40 mx-1" />
                    <button
                        className="flex-1 flex items-center gap-2 px-2 py-1 rounded-full hover:bg-surface-container-low transition-colors text-left"
                        onClick={() => setActiveTab(Tab.Destination)}
                    >
                        <span className="material-symbols-outlined text-outline text-lg">search</span>
                        <span className="text-outline text-sm font-medium">어디로 갈까요?</span>
                    </button>
                </div>
                {isDataLoading && (
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2" />
                )}
            </header>

            {/* ── 지도 컨트롤 (우측) ── */}
            <div className="fixed right-5 z-40 flex flex-col gap-3" style={{ bottom: showStationSheet ? '540px' : showNearbyCard ? '220px' : '100px' }}>
                <button
                    onClick={loadStations}
                    disabled={isDataLoading}
                    className="w-12 h-12 glass-panel bg-white/90 text-on-surface-variant rounded-full shadow-float flex items-center justify-center border border-white/20 active:scale-90 transition-all disabled:opacity-50"
                >
                    <span className={`material-symbols-outlined ${isDataLoading ? 'animate-spin' : ''}`}>refresh</span>
                </button>
                <button
                    onClick={handleGoToUserLocation}
                    disabled={isCentering}
                    className="w-14 h-14 glass-panel bg-white/90 text-primary rounded-full shadow-float flex items-center justify-center border border-white/20 active:scale-90 transition-all"
                >
                    <span className="material-symbols-outlined filled">my_location</span>
                </button>
            </div>

            {/* ── compact 카드: 내 주변 자동 탐색 결과 ── */}
            {showNearbyCard && (
                <div className="fixed left-4 right-4 z-40 animate-slide-up" style={{ bottom: '88px' }}>
                    <StationCard station={nearbyResult!} compact />
                </div>
            )}

            {/* ── 스테이션 시트 배경 오버레이 (바깥 클릭으로 닫기) ── */}
            {showStationSheet && (
                <div
                    className="fixed inset-0 z-30"
                    style={{ bottom: '72px' }}
                    onClick={() => setSelectedStationOnMap(null)}
                />
            )}

            {/* ── 풀 시트: 지도에서 직접 선택한 정류소 ── */}
            {showStationSheet && (
                <div className="fixed left-0 right-0 z-40 animate-sheet-up" style={{ bottom: '72px' }}>
                    <div className="mx-3 relative">
                        <button
                            onClick={() => setSelectedStationOnMap(null)}
                            className="absolute -top-3 right-3 z-10 w-8 h-8 bg-surface-container-lowest rounded-full shadow-float flex items-center justify-center border border-outline-variant/20"
                        >
                            <span className="material-symbols-outlined text-sm text-on-surface-variant">close</span>
                        </button>
                        <StationCard station={selectedStationOnMap!} />
                    </div>
                </div>
            )}

            {/* ── 내 주변 탭 에러 안내 ── */}
            {activeTab === Tab.Nearby && searchError && !isSearching && !showFloatingCard && (
                <div className="fixed left-4 right-4 z-40 animate-slide-up" style={{ bottom: '88px' }}>
                    <div className="glass-panel bg-white/90 p-4 rounded-xl breathe-shadow flex items-start gap-3">
                        <span className="material-symbols-outlined text-error text-sm mt-0.5">error</span>
                        <p className="text-sm text-on-surface-variant">{searchError}</p>
                    </div>
                </div>
            )}

            {/* ── 하단 내비게이션 바 ── */}
            <nav className="fixed bottom-0 w-full z-50 flex justify-around items-center px-4 pb-safe pt-3 bottom-nav rounded-t-[2rem]">
                {/* 내 주변 */}
                <NavTab
                    icon="explore"
                    label="내 주변"
                    active={activeTab === Tab.Nearby}
                    onClick={() => {
                        setActiveTab(Tab.Nearby);
                        handleNearbySearch();
                    }}
                />
                {/* 경로 찾기 */}
                <NavTab
                    icon="near_me"
                    label="경로 찾기"
                    active={activeTab === Tab.Route}
                    onClick={() => setActiveTab(Tab.Route)}
                />
                {/* 즐겨찾기 */}
                <NavTab
                    icon="favorite"
                    label="즐겨찾기"
                    active={activeTab === Tab.Favorites}
                    onClick={() => setActiveTab(Tab.Favorites)}
                />
                {/* 더보기 */}
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
                />
            )}

            {/* ── 경로 탭 오버레이 ── */}
            {activeTab === Tab.Route && (
                <div className="fixed inset-0 bottom-[88px] z-[70] flex flex-col animate-fade-in pt-safe">
                    <div className="absolute inset-0 bg-surface/80 backdrop-blur-sm" />
                    <div className="relative z-10 flex flex-col h-full">
                        <header className="flex items-center px-4 h-14 mt-2 sm:mt-4 mx-4 bg-white/85 backdrop-blur-xl rounded-full shadow-breathe">
                            <button
                                onClick={() => setActiveTab(Tab.Nearby)}
                                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors text-primary active:scale-95"
                            >
                                <span className="material-symbols-outlined">arrow_back</span>
                            </button>
                            <div className="flex-1 flex justify-center">
                                <h1 className="font-headline font-extrabold text-xl text-primary">경로 찾기</h1>
                            </div>
                            <div className="w-10" />
                        </header>
                        <div className="flex-1 overflow-y-auto pt-4 px-4 pb-24 sm:pt-6 sm:px-5 sm:pb-safe sm:pb-32 no-scrollbar">
                            {!currentRoute
                                ? <RouteSearch stations={stations} onRouteFound={handleRouteFound} onError={(e) => setSearchError(e)} />
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
                />
            )}

            {/* ── 사이드바 드로어 ── */}
            {isSidebarOpen && (
                <>
                    <div
                        className="fixed inset-0 z-[80] bg-black/30 backdrop-blur-sm"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                    <div className="fixed top-0 left-0 bottom-0 z-[90] w-72 bg-surface-container-lowest shadow-2xl animate-sidebar-in flex flex-col">
                        {/* 사이드바 헤더 */}
                        <div className="flex items-center justify-between px-5 pt-14 pb-6 border-b border-outline-variant/20">
                            <div>
                                <h2 className="font-headline font-extrabold text-2xl text-primary">타슈</h2>
                                <p className="text-xs text-on-surface-variant mt-0.5">대전 공공자전거</p>
                            </div>
                            <button
                                onClick={() => setIsSidebarOpen(false)}
                                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors text-on-surface-variant"
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
                        <div className="px-5 py-6 border-t border-outline-variant/20">
                            <p className="text-xs text-on-surface-variant">
                                자전거 대수는 약 5분마다 업데이트됩니다. 현장과 다를 수 있어요.
                            </p>
                        </div>
                    </div>
                </>
            )}

            {/* ── NearbySearch (숨김 상태로 로직 유지) ── */}
            <div className="hidden">
                <NearbySearch onSearch={handleNearbySearch} result={nearbyResult} loading={isSearching} error={searchError} />
            </div>

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
        className={`flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-2xl transition-all active:scale-90 ${
            active
                ? 'bg-primary/10 text-primary'
                : 'text-on-surface-variant hover:text-on-surface'
        }`}
    >
        <span className={`material-symbols-outlined ${active ? 'filled' : ''}`}>{icon}</span>
        <span className="text-[10px] font-bold uppercase tracking-wider font-label">{label}</span>
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
        className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-surface-container-low transition-colors text-on-surface"
    >
        <span className="material-symbols-outlined text-on-surface-variant">{icon}</span>
        <span className="font-medium text-sm">{label}</span>
    </button>
);

export default App;
