import React, { useState, useCallback, useEffect, useMemo } from "react";
import type { Station, StationWithDistance, Coordinates, LocationSearchResult, OptimalRoute, FavoriteStation } from "./types/index";
import { getCurrentLocation } from "./services/locationService";
import { findNearestAvailableStation, fetchTashuStations, haversineDistance } from "./services/tashuService";
import { getFavorites } from "./services/favoriteService";
import UiIcon from "./components/UiIcon";
import FavoritesList from "./components/FavoritesList";
import RouteSearch from "./components/RouteSearch";
import RouteResult from "./components/RouteResult";
import TashuMap from "./components/TashuMap";
import StationDeck from "./components/StationDeck";
import SegToggle from "./components/SegToggle";
import { useCountUp } from "./hooks/useCountUp";
import { useRoadRoute } from "./hooks/useRoadRoute";
import { formatDistance, walkMinutes } from "./components/StationDeck";
import "./styles/index.css";

export enum Tab {
    Nearby = "NEARBY",
    Route = "ROUTE",
    Favorites = "FAVORITES",
    More = "MORE",
}

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<Tab>(Tab.Nearby);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [selIdx, setSelIdx] = useState(0);
    const [nearbyFilter, setNearbyFilter] = useState<'all' | 'avail'>('all');

    const [stations, setStations] = useState<Station[]>([]);
    const [isDataLoading, setIsDataLoading] = useState<boolean>(true);
    const [dataError, setDataError] = useState<string | null>(null);

    const [isSearching, setIsSearching] = useState<boolean>(false);
    const [searchError, setSearchError] = useState<string | null>(null);

    const [nearbyResult, setNearbyResult] = useState<StationWithDistance | null>(null);
    const [selectedStationOnMap, setSelectedStationOnMap] = useState<StationWithDistance | null>(null);

    const [mapCenter, setMapCenter] = useState<[number, number]>([36.351, 127.385]);
    const [mapZoom, setMapZoom] = useState<number>(13);
    const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
    const [isCentering, setIsCentering] = useState<boolean>(false);
    const [isFindingNearest, setIsFindingNearest] = useState<boolean>(false);
    const [currentRoute, setCurrentRoute] = useState<OptimalRoute | null>(null);
    const roadRoute = useRoadRoute(currentRoute);

    const [routeStartStation, setRouteStartStation] = useState<LocationSearchResult | null>(null);
    // 값이 바뀔 때마다 경로 화면의 도착 입력에 포커스를 준다
    const [routeFocus, setRouteFocus] = useState(0);
    // 즐겨찾기 탭 지도에 그릴 정류소 id
    const [favoriteIds, setFavoriteIds] = useState<string[]>(() => getFavorites().map(f => f.id));

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

    const visibleStations = useMemo(
        () => nearbyFilter === 'avail' ? nearbyStations.filter(st => st.parking_count > 0) : nearbyStations,
        [nearbyStations, nearbyFilter]
    );

    // 카드 덱 선택: 지도 강조·중심을 함께 옮긴다
    const selectIdx = useCallback((i: number) => {
        const st = visibleStations[i];
        if (!st) return;
        setSelIdx(i);
        setSelectedStationOnMap(st);
        setMapCenter([st.x_pos, st.y_pos]);
        setMapZoom(16);
    }, [visibleStations]);

    const selected = visibleStations[selIdx];
    const heroCount = useCountUp(selected?.parking_count ?? 0);

    // 목록이 새로 채워지거나 필터가 바뀌면 첫 카드를 선택한다
    const visibleKey = visibleStations.map(st => st.id).join(',');
    useEffect(() => {
        if (activeTab !== Tab.Nearby || visibleStations.length === 0) return;
        selectIdx(0);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visibleKey]);

    const handleStationSelect = useCallback((station: FavoriteStation) => {
        const stationWithDistance: StationWithDistance = {
            ...station,
            distance: station.distance || 0,
        };
        setSelectedStationOnMap(stationWithDistance);
        setMapCenter([station.x_pos, station.y_pos]);
        setMapZoom(16);
    }, []);

    const handleSetRouteStart = useCallback((station: StationWithDistance) => {
        const routeStart: LocationSearchResult = {
            name: station.name,
            address: station.address,
            roadAddress: station.address,
            coords: { latitude: station.x_pos, longitude: station.y_pos },
        };
        setRouteStartStation(routeStart);
        setRouteFocus(n => n + 1);
        setActiveTab(Tab.Route);
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

    // 사용자가 이동했을 수 있으므로 위치는 매번 새로 받는다.
    const handleGoToNearestStation = useCallback(async () => {
        setIsFindingNearest(true);
        try {
            const userCoords = await getCurrentLocation();
            setUserLocation(userCoords);
            const nearest = findNearestAvailableStation(userCoords, stations);
            if (!nearest) return;
            setActiveTab(Tab.Nearby);
            setNearbyResult(nearest);
            setSelectedStationOnMap(nearest);
            setMapCenter([nearest.x_pos, nearest.y_pos]);
            setMapZoom(16);
        } catch (err) {
            setSearchError(err instanceof Error ? err.message : "위치 정보 접근 권한이 거부되었습니다.");
        } finally {
            setIsFindingNearest(false);
        }
    }, [stations]);

    const handleStationClick = useCallback((station: Station) => {
        if (activeTab === Tab.Nearby) {
            const idx = visibleStations.findIndex(v => v.id === station.id);
            if (idx >= 0) { selectIdx(idx); return; }
        }
        setSelectedStationOnMap({ ...station });
        setNearbyResult(null);
        setMapCenter([station.x_pos, station.y_pos]);
        setMapZoom(16);
    }, [activeTab, visibleStations, selectIdx]);

    const openRouteSearch = useCallback(() => {
        setRouteFocus(n => n + 1);
        setActiveTab(Tab.Route);
    }, []);

    // 오류 안내는 몇 초 뒤 스스로 사라진다
    useEffect(() => {
        if (!searchError) return;
        const t = setTimeout(() => setSearchError(null), 4000);
        return () => clearTimeout(t);
    }, [searchError]);

    // 즐겨찾기 탭에 들어올 때마다 저장 목록을 다시 읽는다
    useEffect(() => {
        if (activeTab === Tab.Favorites) setFavoriteIds(getFavorites().map(f => f.id));
    }, [activeTab]);

    // 선택한 정류소까지 내 위치에서 걷는 선과 소요 시간 (주변 탭)
    const walkLine = useMemo(() => {
        if (activeTab !== Tab.Nearby || !userLocation || !selected) return null;
        return {
            from: userLocation,
            to: { latitude: selected.x_pos, longitude: selected.y_pos },
            label: `도보 ${walkMinutes(selected.distance ?? 0)}분`,
        };
    }, [activeTab, userLocation, selected]);

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
                        className="w-full bg-primary text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 press"
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
                    searchResult={nearbyResult}
                    visibleStationIds={activeTab === Tab.Favorites ? favoriteIds : null}
                    walkLine={walkLine}
                    onStationClick={handleStationClick}
                    clickedStationId={selectedStationOnMap?.id}
                    route={currentRoute}
                    hideStations={activeTab === Tab.Route && !!currentRoute}
                    coveredInsets={{
                        // 상단 검색·필터·문장 묶음과 하단 탭바+카드 덱이 지도를 덮는 높이. 마운트 전엔 기본값.
                        top: document.querySelector<HTMLElement>('header')?.offsetHeight ?? 68,
                        bottom: (document.querySelector<HTMLElement>('nav.bottom-nav')?.offsetHeight ?? 72)
                            + (activeTab === Tab.Nearby ? (document.querySelector<HTMLElement>('.station-deck')?.offsetHeight ?? 232) : 0),
                    }}
                />
            </div>

            {/* ── 상단: 검색 알약 + 필터 토글 + 한 문장 (지도 위에 떠 있는 유리) ── */}
            {activeTab === Tab.Nearby && (
                <header className="fixed top-0 inset-x-3 z-[var(--z-overlay)] pt-safe grid gap-2 justify-items-start min-[900px]:right-auto min-[900px]:w-[380px] min-[900px]:left-4 min-[900px]:top-4 min-[900px]:pt-0">
                    <button
                        onClick={openRouteSearch}
                        className="press nav-pill w-full min-h-[52px] flex items-center gap-2.5 px-[18px] rounded-[26px] text-base text-on-surface-variant text-left"
                    >
                        <UiIcon name="search" className="w-[22px] h-[22px]" />
                        어디로 갈까요?
                        {isDataLoading && <span className="ml-auto w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
                    </button>
                    <SegToggle value={nearbyFilter} onChange={setNearbyFilter} className="w-[208px] nav-pill !bg-gray-100/90" />
                    <p key={selected?.id ?? 'none'} className="nav-pill animate-slide-up px-4 py-2.5 rounded-[20px] text-[15px] font-semibold leading-snug text-on-surface">
                        {selected
                            ? selected.parking_count === 0
                                ? <><b className="text-[17px] font-bold">{formatDistance(selected.distance ?? 0)}</b> 앞 정류소는 자전거가 없어요</>
                                : <><b className="text-[17px] font-bold">{formatDistance(selected.distance ?? 0)}</b> 앞에 자전거가 <b className="text-[17px] font-bold tabular-nums">{heroCount}</b>대 있어요</>
                            : isSearching ? '주변 정류소를 찾는 중이에요' : '위치를 켜면 가까운 자전거를 알려드려요'}
                    </p>
                </header>
            )}

            {/* ── 지도 컨트롤 (우측) — 시트 상단 위에 고정 ── */}
            <div
                className={`fixed right-4 z-[var(--z-overlay)] flex-col gap-3 ${activeTab === Tab.Route || activeTab === Tab.Favorites ? 'hidden' : 'flex'}`}
                style={{ bottom: activeTab === Tab.Nearby ? 'calc(var(--nav-h) + var(--deck-h) + 8px)' : 'calc(var(--nav-h) + 16px)' }}
            >
                <button
                    onClick={loadStations}
                    disabled={isDataLoading}
                    className="w-12 h-12 liquid-glass text-on-surface-variant rounded-full flex items-center justify-center press disabled:opacity-50"
                >
                    <span className={`material-symbols-outlined ${isDataLoading ? 'animate-spin' : ''}`}>refresh</span>
                </button>
                <button
                    onClick={handleGoToNearestStation}
                    disabled={isFindingNearest}
                    aria-label="가장 가까운 대여 가능 정류소"
                    className="w-12 h-12 liquid-glass text-primary rounded-full flex items-center justify-center press disabled:opacity-50"
                >
                    <span className="material-symbols-outlined">route</span>
                </button>
                <button
                    onClick={handleGoToUserLocation}
                    disabled={isCentering}
                    className="w-12 h-12 liquid-glass text-primary rounded-full flex items-center justify-center press"
                >
                    <span className="material-symbols-outlined filled">my_location</span>
                </button>
            </div>

            {/* ── 주변 정류소 카드 덱 (가운데 카드 = 선택) ── */}
            {activeTab === Tab.Nearby && (
                <StationDeck
                    stations={visibleStations}
                    selectedIndex={selIdx}
                    onSelect={selectIdx}
                    onMakeRoute={handleSetRouteStart}
                    onShowAll={() => setNearbyFilter('all')}
                    emptyMessage={
                        nearbyStations.length > 0
                            ? { title: '대여 가능한 정류소가 없어요', sub: '잠시 후 다시 확인하거나 전체 정류소를 보세요', canShowAll: true }
                            : { title: isSearching ? '주변 정류소를 찾는 중...' : '주변 정류소가 없어요', sub: '위치 정보를 불러오면 가까운 정류소가 표시됩니다.', canShowAll: false }
                    }
                />
            )}

            {/* ── 오류 안내 ── */}
            {searchError && !isSearching && (
                <div className="fixed left-4 right-4 z-[var(--z-modal)] animate-slide-up" style={{ bottom: activeTab === Tab.Nearby ? 'calc(var(--nav-h) + var(--deck-h) + 12px)' : 'calc(var(--nav-h) + 12px)' }}>
                    <div className="liquid-glass-thick rounded-2xl px-4 py-3 text-[var(--danger)] flex items-start gap-3">
                        <span className="material-symbols-outlined text-sm mt-0.5">error</span>
                        <p className="text-sm">{searchError}</p>
                    </div>
                </div>
            )}

            {/* ── 하단 내비게이션 바 (주변/경로/즐겨찾기/더보기) ── */}
            {/* nav는 --nav-h 높이의 투명 영역(시트 위치·높이 계산이 이 높이를 잰다). 보이는 알약은 안쪽 .nav-pill.
                아래 여백 = 안전영역 + 8px, 위 여백 4px → 알약 높이 60px */}
            <nav className="fixed bottom-0 inset-x-0 z-[var(--z-nav)] px-4 pt-1 bottom-nav" style={{ height: 'var(--nav-h)', paddingBottom: 'calc(var(--safe-area-inset-bottom) + 8px)' }}>
              <div className="nav-pill h-full rounded-[30px] p-1.5 grid grid-cols-4 gap-1">
                <NavTab
                    icon={<UiIcon name="compass" />}
                    label="주변"
                    active={activeTab === Tab.Nearby}
                    onClick={() => {
                        setActiveTab(Tab.Nearby);
                        handleNearbySearch();
                    }}
                />
                <NavTab
                    icon={<UiIcon name="route" />}
                    label="경로"
                    active={activeTab === Tab.Route}
                    onClick={() => setActiveTab(Tab.Route)}
                />
                <NavTab
                    icon={<UiIcon name="heart" />}
                    label="즐겨찾기"
                    active={activeTab === Tab.Favorites}
                    onClick={() => setActiveTab(Tab.Favorites)}
                />
                <NavTab
                    icon={<UiIcon name="more" />}
                    label="더보기"
                    active={isSidebarOpen}
                    onClick={() => setIsSidebarOpen(true)}
                />
              </div>
            </nav>

            {/* ── 경로 탭 (시안 D): 지도 위 유리 입력 폼 + 아래 결과 시트. 시트는 늘 떠 있고 내용만 바뀐다 ── */}
            {activeTab === Tab.Route && (
                <div className="fixed inset-0 z-[var(--z-sheet)] pointer-events-none animate-fade-in">
                    <section
                        aria-label="경로 요약"
                        className="pointer-events-auto absolute inset-x-0 bottom-0 flex flex-col rounded-t-[28px] bg-surface shadow-[0_-8px_32px_rgba(20,23,28,0.12),0_0_0_1px_rgba(20,23,28,0.05)] min-[900px]:inset-x-auto min-[900px]:left-4 min-[900px]:w-[400px] min-[900px]:top-[148px] min-[900px]:bottom-4 min-[900px]:rounded-3xl"
                        style={{ top: 'calc(46% - 24px)' }}
                    >
                        {roadRoute ? (
                            <RouteResult route={roadRoute} />
                        ) : (
                            <div className="flex-1 overflow-y-auto px-4 pt-[22px] no-scrollbar" style={{ paddingBottom: 'calc(var(--nav-h) + 40px)' }}>
                                <h1 className="font-headline font-bold text-[26px] leading-[1.4] text-on-surface" style={{ textWrap: 'balance' }}>어디서 어디까지 가세요?</h1>
                                <p className="mt-2 text-[15px] leading-relaxed text-on-surface-variant" style={{ textWrap: 'pretty' }}>
                                    출발지와 도착지를 모두 입력하면 걸리는 시간과 단계를 보여드려요.
                                </p>
                            </div>
                        )}
                    </section>
                    <div
                        className="absolute inset-x-3 grid gap-2 min-[900px]:right-auto min-[900px]:left-4 min-[900px]:w-[380px] min-[900px]:!top-4"
                        style={{ top: 'calc(var(--safe-area-inset-top) + 12px)' }}
                    >
                        <RouteSearch
                            stations={stations}
                            onRouteFound={setCurrentRoute}
                            onRouteClear={() => setCurrentRoute(null)}
                            onError={setSearchError}
                            initialStart={routeStartStation}
                            focusDestToken={routeFocus}
                        />
                    </div>
                </div>
            )}

            {/* ── 즐겨찾기 오버레이 ── */}
            {activeTab === Tab.Favorites && (
                <FavoritesList
                    onBack={() => setActiveTab(Tab.Nearby)}
                    onStationSelect={handleStationSelect}
                    onIdsChange={setFavoriteIds}
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
                    <div className="fixed top-0 left-0 bottom-0 z-[90] w-72 liquid-glass-thick rounded-r-[28px] animate-sidebar-in flex flex-col">
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

        </div>
    );
};

interface NavTabProps {
    icon: React.ReactNode;
    label: string;
    active: boolean;
    onClick: () => void;
}

const NavTab: React.FC<NavTabProps> = ({ icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        aria-current={active ? 'page' : undefined}
        className={`press flex flex-col items-center justify-center gap-0.5 min-h-[44px] rounded-[24px] transition-colors ${
            active
                ? 'bg-gray-900/[0.08] text-on-surface'
                : 'text-on-surface-variant [@media(hover:hover)]:hover:bg-gray-900/[0.05] [@media(hover:hover)]:hover:text-on-surface'
        }`}
    >
        {icon}
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
