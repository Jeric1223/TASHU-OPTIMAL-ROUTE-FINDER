
import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import type { Station, StationWithDistance, Coordinates, OptimalRoute } from '../types';
import { MyLocationIcon, LoadingSpinner } from './icons';

interface TashuMapProps {
  stations: Station[];
  center: [number, number];
  zoom: number;
  userLocation?: Coordinates | null;
  searchResult?: StationWithDistance | null;
  selectedDestination?: Coordinates | null;
  clickedStationId?: string | null;
  onStationClick: (station: Station) => void;
  onGoToUserLocation: () => Promise<void>;
  isCentering: boolean;
  route?: OptimalRoute | null;
}

const ChangeView: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true, duration: 1 });
  }, [center, zoom, map]);
  return null;
};

interface StationsClusterProps {
  stations: Station[];
  searchResult?: StationWithDistance | null;
  clickedStationId?: string | null;
  onStationClick: (station: Station) => void;
}

const StationsCluster: React.FC<StationsClusterProps> = ({ stations, searchResult, clickedStationId, onStationClick }) => {
  const map = useMap();
  const clusterGroupRef = React.useRef<any>(null);
  const markersRef = React.useRef<Map<string, any>>(new Map());

  // 클러스터 아이콘 생성 함수
  const createClusterIcon = (cluster: any) => {
    const childCount = cluster.getChildCount();
    let clusterColor = '#006a3c'; // 타슈 초록색
    let opacity = 1;

    // 개수에 따라 색상 농도 조정
    if (childCount < 10) {
      opacity = 0.4 + (childCount / 10) * 0.6;
    } else if (childCount < 50) {
      opacity = 0.7 + ((childCount - 10) / 40) * 0.3;
    } else {
      opacity = 1;
    }

    const html = `
      <div style="
        background-color: rgba(0, 106, 60, ${opacity});
        color: white;
        border-radius: 50%;
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 14px;
        border: 2px solid white;
        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      ">${childCount}</div>
    `;

    return L.divIcon({
      html,
      className: 'leaflet-cluster-icon',
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });
  };

  useEffect(() => {
    if (!clusterGroupRef.current) {
      clusterGroupRef.current = L.markerClusterGroup({
        iconCreateFunction: createClusterIcon,
        maxClusterRadius: 80,
      });
      map.addLayer(clusterGroupRef.current);
    }

    // 변경된 마커만 업데이트
    const newMarkerIds = new Set(stations.map(s => s.id));

    // 제거된 마커 삭제
    markersRef.current.forEach((marker, id) => {
      if (!newMarkerIds.has(id)) {
        clusterGroupRef.current.removeLayer(marker);
        markersRef.current.delete(id);
      }
    });

    // 새 마커 추가 또는 기존 마커 업데이트
    stations.forEach(station => {
      const isHighlighted = station.id === searchResult?.id || station.id === clickedStationId;
      const icon = createStationIcon(station.parking_count, isHighlighted);

      if (markersRef.current.has(station.id)) {
        // 이미 존재하는 마커 업데이트
        const existingMarker = markersRef.current.get(station.id);
        existingMarker.setIcon(icon);
      } else {
        // 새 마커 생성
        const marker = L.marker([station.x_pos, station.y_pos], { icon });
        marker.bindPopup(`
          <div class="space-y-1">
            <div class="text-base font-bold text-gray-800">${station.name}</div>
            <div class="text-sm text-gray-500">${station.address}</div>
            <div class="text-sm pt-1 mt-1 border-t border-gray-200">
              대여 가능: <span class="font-bold text-blue-600 text-base">${station.parking_count}</span> 대
            </div>
          </div>
        `);
        marker.on('click', () => onStationClick(station));
        clusterGroupRef.current.addLayer(marker);
        markersRef.current.set(station.id, marker);
      }
    });
  }, [stations, searchResult, clickedStationId, map, onStationClick]);

  return null;
};

const createStationIcon = (count: number, isHighlighted: boolean) => {
  const primaryColor = count > 0 ? '#0A5C36' : '#abadb0'; // Tashu green or gray

  const svg = `
    <svg width="80" height="80" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 8px rgba(0,0,0,0.12));">
      <!-- 녹색 원형 배경 -->
      <circle cx="45" cy="65" r="35" fill="${primaryColor}"/>

      <!-- 자전거 아이콘 (흰색) -->
      <g transform="translate(27, 47) scale(1.5)" fill="white">
        <path d="M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm5.8-10l2.4-2.4.8.8c1.3 1.3 3 2.1 5.1 2.1V9c-1.5 0-2.7-.6-3.6-1.5l-1.9-1.9c-.5-.4-1-.6-1.6-.6s-1.1.2-1.4.6L7.8 8.4c-.4.4-.6.9-.6 1.4 0 .6.2 1.1.6 1.4L11 14v5h2v-6.2l-2.2-2.3zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z"/>
      </g>

      <!-- 숫자 배경 (흰색 라운드 박스) -->
      <rect x="58" y="20" width="40" height="28" rx="14" fill="white" stroke="${primaryColor}" stroke-width="2"/>

      <!-- 숫자 표시 -->
      <text x="78" y="34" fill="${primaryColor}" font-family="Arial, sans-serif" font-weight="900" font-size="16" text-anchor="middle" dominant-baseline="central">${count}</text>
    </svg>
  `;

  return L.divIcon({
    html: svg,
    className: 'leaflet-div-icon',
    iconSize: [80, 80],
    iconAnchor: [40, 65],
    popupAnchor: [0, -65],
  });
};

const userLocationIcon = L.divIcon({
    html: `<div class="relative flex items-center justify-center">
            <div class="absolute w-6 h-6 bg-blue-500 rounded-full animate-ping opacity-75"></div>
            <div class="relative w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-md"></div>
        </div>`,
    className: 'leaflet-div-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

const destinationIcon = L.divIcon({
    html: `<div class="text-red-500 drop-shadow-lg"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" /></svg></div>`,
    className: 'leaflet-div-icon',
    iconSize: [32, 32],
    iconAnchor: [4, 32],
});


const TashuMap: React.FC<TashuMapProps> = ({ stations, center, zoom, userLocation, searchResult, selectedDestination, clickedStationId, onStationClick, onGoToUserLocation, isCentering, route }) => {
  return (
    <div className="relative w-full h-full">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} zoomControl={false} className="leaflet-container">
        <ChangeView center={center} zoom={zoom} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {/* Route visualization */}
        {route && route.segments.map((segment, idx) => {
          const startCoords = 'x_pos' in segment.startPoint ?
            [segment.startPoint.x_pos, segment.startPoint.y_pos] as [number, number] :
            [segment.startPoint.coords.latitude, segment.startPoint.coords.longitude] as [number, number];

          const endCoords = 'x_pos' in segment.endPoint ?
            [segment.endPoint.x_pos, segment.endPoint.y_pos] as [number, number] :
            [segment.endPoint.coords.latitude, segment.endPoint.coords.longitude] as [number, number];

          const isWalk = segment.type === 'walk';
          const color = isWalk ? '#6B7280' : '#2563EB';
          const weight = isWalk ? 3 : 5;
          const dashArray = isWalk ? '5, 10' : undefined;

          return (
            <Polyline
              key={`route-segment-${idx}`}
              positions={[startCoords, endCoords]}
              color={color}
              weight={weight}
              dashArray={dashArray}
              opacity={0.8}
            />
          );
        })}
        
        {userLocation && (
            <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userLocationIcon}>
                <Popup>현재 내 위치</Popup>
            </Marker>
        )}

        {selectedDestination && (
             <Marker position={[selectedDestination.latitude, selectedDestination.longitude]} icon={destinationIcon}>
                <Popup>선택한 목적지</Popup>
            </Marker>
        )}

        <StationsCluster
          stations={stations}
          searchResult={searchResult}
          clickedStationId={clickedStationId}
          onStationClick={onStationClick}
        />
      </MapContainer>
    </div>
  );
};

export default TashuMap;
