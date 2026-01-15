import React, { useState, useCallback, useEffect } from "react";
import type { Station, StationWithDistance, Coordinates, LocationSearchResult, OptimalRoute } from "./types/index";
import { getCurrentLocation } from "./services/locationService";
import { findNearestStation, findNearestAvailableStation, fetchTashuStations, haversineDistance } from "./services/tashuService";
import { searchLocation } from "./services/naverApiService";
import DestinationSearch from "./components/DestinationSearch";
import NearbySearch from "./components/NearbySearch";
import RouteSearch from "./components/RouteSearch";
import RouteResult from "./components/RouteResult";
import FavoritesList from "./components/FavoritesList";
import InstallPrompt from "./components/InstallPrompt";
import MobileTabBar from "./components/MobileTabBar";
import { BicycleIcon, CompassIcon, LoadingSpinner, RefreshIcon, XIcon, StarIcon } from "./components/icons";
import TashuMap from "./components/TashuMap";
import StationCard from "./components/StationCard";
import { searchKakaoLocation } from "./services/kakoApiService";
import "./styles/index.css";

export enum Tab {
    Destination = "DESTINATION",
    Nearby = "NEARBY",
    Route = "ROUTE",
    Favorites = "FAVORITES",
}

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>(Tab.Nearby);

    const [stations, setStations] = useState<Station[]>([]);
    const [isDataLoading, setIsDataLoading] = useState<boolean>(true);
    const [dataError, setDataError] = useState<string | null>(null);

    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    const [destinationResult, setDestinationResult] = useState<StationWithDistance | null>(null);
    const [nearbyResult, setNearbyResult] = useState<StationWithDistance | null>(null);

    const [destinationSearchResults, setDestinationSearchResults] = useState<LocationSearchResult[] | null>(null);
    const [selectedDestination, setSelectedDestination] = useState<Coordinates | null>(null);

    const [mapCenter, setMapCenter] = useState<[number, number]>([36.351, 127.385]); // Daejeon City Hall approx.
    const [mapZoom, setMapZoom] = useState<number>(13);
    const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
    const [selectedStationOnMap, setSelectedStationOnMap] = useState<StationWithDistance | null>(null);

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

    useEffect(() => {
        loadStations();
        handleNearbySearch(); // Automatically search nearby on load
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only once on initial load

    const handleDestinationSearch = useCallback(
        async (destination: string) => {
            if (!destination) {
                setSearchError("목적지를 입력해주세요.");
                return;
            }
            setIsSearching(true);
            setSearchError(null);
            setDestinationResult(null);
            setDestinationSearchResults(null);
            setSelectedDestination(null);
            setUserLocation(null);

            try {
                // Netlify Function을 통해 카카오 API 호출 (API 키 보안)
                const results = await searchKakaoLocation(destination);
                console.log(`results: ${results}`);
                if (results.length === 0) {
                    setSearchError("검색 결과가 없습니다. 다른 검색어로 시도해 보세요.");
                } else {
                    setDestinationSearchResults(results);
                    // Center map on the first result
                    setMapCenter([results[0].coords.latitude, results[0].coords.longitude]);
                    setMapZoom(15);
                }
            } catch (err) {
                setSearchError(err instanceof Error ? err.message : "장소 검색에 실패했습니다.");
            } finally {
                setIsSearching(false);
            }
        },
        []
    );

    const handleSelectSearchResult = useCallback(
        (result: LocationSearchResult) => {
            setSelectedDestination(result.coords);
            setDestinationSearchResults(null); // Hide the list
            setSelectedStationOnMap(null);

            const nearestStation = findNearestStation(result.coords, stations);
            if (nearestStation) {
                setDestinationResult(nearestStation);
                const newCenterLat = (result.coords.latitude + parseFloat(nearestStation.x_pos)) / 2;
                const newCenterLng = (result.coords.longitude + parseFloat(nearestStation.y_pos)) / 2;
                setMapCenter([newCenterLat, newCenterLng]);
                setMapZoom(15);
            } else {
                setSearchError("가까운 타슈 정류소를 찾지 못했습니다.");
                setMapCenter([result.coords.latitude, result.coords.longitude]);
                setMapZoom(16);
            }
        },
        [stations]
    );

    const handleClearDestinationSearch = useCallback(() => {
        setDestinationSearchResults(null);
        setDestinationResult(null);
        setSelectedDestination(null);
        setSearchError(null);
        setSelectedStationOnMap(null);
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

    const handleGoToUserLocation = useCallback(async () => {
        setIsCentering(true);
        if (searchError?.includes("위치")) {
            setSearchError(null);
        }
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
    }, [searchError]);

    const handleTabChange = (tabId: Tab | string) => {
        const tab = tabId as Tab;
        setActiveTab(tab);
        setSearchError(null);
        setDestinationResult(null);
        setNearbyResult(null);
        if (tab !== Tab.Nearby && tab !== Tab.Route) {
            setUserLocation(null);
        }
        setSelectedDestination(null);
        setDestinationSearchResults(null);
        setSelectedStationOnMap(null);
        if (tab !== Tab.Route) {
            setCurrentRoute(null);
        }
    };

    const handleRouteFound = (route: OptimalRoute) => {
        setCurrentRoute(route);
        setMapCenter([route.startStation.x_pos, route.startStation.y_pos]);
        setMapZoom(14);
    };

    const handleStationClick = useCallback(
        (station: Station) => {
            // Always show the clicked station card, calculating distance if a reference point is available.
            let referenceCoords: Coordinates | null = null;

            if (activeTab === Tab.Nearby && userLocation) {
                referenceCoords = userLocation;
            } else if (activeTab === Tab.Destination && selectedDestination) {
                referenceCoords = selectedDestination;
            }

            const stationWithDistance: StationWithDistance = { ...station };
            if (referenceCoords) {
                stationWithDistance.distance = haversineDistance(referenceCoords, { latitude: station.x_pos, longitude: station.y_pos });
            }

            setSelectedStationOnMap(stationWithDistance);
            setDestinationResult(null);
            setNearbyResult(null);

            setMapCenter([station.x_pos, station.y_pos]);
            setMapZoom(16);
        },
        [activeTab, userLocation, selectedDestination]
    );

    const TabButton: React.FC<{ tabId: Tab; icon: React.ReactNode; label: string }> = ({ tabId, icon, label }) => (
        <button
            onClick={() => handleTabChange(tabId)}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 text-sm font-medium transition-all duration-200 ease-in-out rounded-lg ${
                activeTab === tabId
                    ? "neomorph-pressed text-blue-600 font-semibold"
                    : "neomorph-btn text-gray-600 hover:text-gray-800"
            }`}
        >
            {icon}
            {label}
        </button>
    );

    const searchResult = activeTab === Tab.Nearby ? nearbyResult : destinationResult;

    if (isDataLoading && stations.length === 0) {
        return (
            <div className="min-h-screen bg-neumorphic-bg flex flex-col items-center justify-center text-gray-700">
                <LoadingSpinner />
                <p className="mt-4 text-lg font-semibold">타슈 정류장 정보를 불러오는 중...</p>
            </div>
        );
    }

    if (dataError) {
        return (
            <div className="min-h-screen bg-neumorphic-bg flex flex-col items-center justify-center text-red-700 p-4 text-center">
                <div className="neomorph-card p-8 max-w-md">
                    <p className="text-xl font-bold mb-4 text-red-700">데이터 로딩 오류</p>
                    <p className="text-red-600 mb-6">{dataError}</p>
                    <button
                        onClick={loadStations}
                        className="neomorph-btn-primary font-bold py-2 px-4 flex items-center gap-2 transition-colors w-full justify-center"
                        disabled={isDataLoading}
                    >
                        {isDataLoading ? <LoadingSpinner /> : <RefreshIcon />}
                        재시도
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-neumorphic-bg font-sans">
            <header className="neomorph-card p-4 sticky top-0 z-10 mb-4 md:mb-6 rounded-b-2xl">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BicycleIcon className="w-6 h-6 md:w-8 md:h-8 text-blue-600" />
                        <h1 className="text-xl md:text-2xl font-bold text-blue-600">TASHU</h1>
                        <span className="hidden sm:inline text-gray-600 font-light">| 최적 경로 찾기</span>
                    </div>
                    <button
                        onClick={loadStations}
                        disabled={isDataLoading}
                        className="neomorph-btn p-2 rounded-full text-gray-600 hover:text-blue-600 disabled:opacity-50 disabled:cursor-wait"
                        aria-label="새로고침"
                    >
                        <RefreshIcon className={isDataLoading ? "animate-spin" : ""} />
                    </button>
                </div>
            </header>

            <main className="p-4 md:p-6 max-w-4xl mx-auto space-y-4 md:space-y-6 pb-24 md:pb-6">
                <div className="neomorph-card rounded-2xl overflow-hidden">
                    <div className="hidden md:flex gap-2 p-4 border-b border-neumorphic-dark border-opacity-20 overflow-x-auto">
                        <TabButton tabId={Tab.Nearby} icon={<BicycleIcon />} label="내 주변" />
                        <TabButton tabId={Tab.Destination} icon={<CompassIcon />} label="목적지" />
                        <TabButton tabId={Tab.Route} icon={<CompassIcon />} label="경로" />
                        <TabButton tabId={Tab.Favorites} icon={<StarIcon />} label="즐겨찾기" />
                    </div>

                    <div className="p-4 md:p-6 space-y-4">
                        <TashuMap
                            stations={stations}
                            center={mapCenter}
                            zoom={mapZoom}
                            userLocation={userLocation}
                            searchResult={searchResult}
                            selectedDestination={selectedDestination}
                            onStationClick={handleStationClick}
                            clickedStationId={selectedStationOnMap?.id}
                            onGoToUserLocation={handleGoToUserLocation}
                            isCentering={isCentering}
                            route={currentRoute}
                        />

                        {activeTab === Tab.Destination && (
                            <DestinationSearch
                                onSearch={handleDestinationSearch}
                                onSelectResult={handleSelectSearchResult}
                                onClear={handleClearDestinationSearch}
                                searchResults={destinationSearchResults}
                                result={destinationResult}
                                loading={isSearching}
                                error={searchError}
                            />
                        )}

                        {activeTab === Tab.Nearby && (
                            <NearbySearch onSearch={handleNearbySearch} result={nearbyResult} loading={isSearching} error={searchError} />
                        )}

                        {activeTab === Tab.Route && (
                            <>
                                {!currentRoute ? (
                                    <RouteSearch
                                        stations={stations}
                                        onRouteFound={handleRouteFound}
                                        onError={(error) => setSearchError(error)}
                                    />
                                ) : (
                                    <RouteResult
                                        route={currentRoute}
                                        onClose={() => setCurrentRoute(null)}
                                    />
                                )}
                            </>
                        )}

                        {activeTab === Tab.Favorites && <FavoritesList />}

                        {selectedStationOnMap && !searchResult && (
                            <div className="mt-6 animate-fade-in">
                                <div className="flex justify-between items-center mb-3">
                                    <h2 className="text-lg font-semibold text-gray-700">선택한 정류소 정보</h2>
                                    <button
                                        onClick={() => setSelectedStationOnMap(null)}
                                        className="p-1.5 text-gray-400 rounded-full hover:bg-gray-200 hover:text-gray-700 transition-colors"
                                        aria-label="닫기"
                                    >
                                        <XIcon />
                                    </button>
                                </div>
                                <StationCard station={selectedStationOnMap} />
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <footer className="hidden md:block text-center p-4 mt-8 text-gray-500 text-xs">
                <p>본 서비스는 대전시 공공자전거 '타슈'의 실시간 데이터를 모의하여 사용합니다.</p>
                <p>&copy; {new Date().getFullYear()} Tashu Route Finder. All Rights Reserved.</p>
            </footer>

            <InstallPrompt />
            <MobileTabBar activeTab={activeTab} onTabChange={handleTabChange} />
        </div>
    );
};

export default App;
