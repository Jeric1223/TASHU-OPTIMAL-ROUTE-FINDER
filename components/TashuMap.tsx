// @ts-nocheck
import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import type { Station, StationWithDistance, Coordinates } from "../types";
import { MyLocationIcon, LoadingSpinner } from "./icons";

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
}

const ChangeView: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom, { animate: true, duration: 1 });
    }, [center, zoom, map]);
    return null;
};

const createStationIcon = (count: number, isHighlighted: boolean) => {
    const primaryColor = count > 0 ? "#2563EB" : "#9CA3AF"; // blue-600 or gray-400
    const highlightColor = "#FBBF24"; // yellow-400

    const svg = `
    <svg width="40" height="48" viewBox="0 0 40 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));">
      ${isHighlighted ? `<path d="M20 48L10 28C10 15.3333 13.3333 10 20 10C26.6667 10 30 15.3333 30 28L20 48Z" fill="${highlightColor}"/>` : ""}
      <path d="M20 44L12 27.2C12 15.6 15.1333 11 20 11C24.8667 11 28 15.6 28 27.2L20 44Z" fill="${primaryColor}"/>
      <circle cx="20" cy="20" r="14" fill="white"/>
      <circle cx="20" cy="20" r="12" fill="${primaryColor}"/>
      <text x="20" y="25" font-family="sans-serif" font-size="14" font-weight="bold" fill="white" text-anchor="middle">${count}</text>
    </svg>
  `;

    return L.divIcon({
        html: svg,
        className: "leaflet-div-icon",
        iconSize: [40, 48],
        iconAnchor: [20, 48],
        popupAnchor: [0, -48],
    });
};

const userLocationIcon = L.divIcon({
    html: `<div class="relative flex items-center justify-center">
            <div class="absolute w-6 h-6 bg-blue-500 rounded-full animate-ping opacity-75"></div>
            <div class="relative w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-md"></div>
        </div>`,
    className: "leaflet-div-icon",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
});

const destinationIcon = L.divIcon({
    html: `<div class="text-red-500 drop-shadow-lg"><svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" /></svg></div>`,
    className: "leaflet-div-icon",
    iconSize: [32, 32],
    iconAnchor: [4, 32],
});

const TashuMap: React.FC<TashuMapProps> = ({
    stations,
    center,
    zoom,
    userLocation,
    searchResult,
    selectedDestination,
    clickedStationId,
    onStationClick,
    onGoToUserLocation,
    isCentering,
}) => {
    return (
        <div className="relative mb-4 rounded-xl overflow-hidden shadow-lg border border-gray-200">
            <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} className="leaflet-container">
                <ChangeView center={center} zoom={zoom} />
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />

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

                {stations.map((station) => (
                    <Marker
                        key={station.id}
                        position={[station.x_pos, station.y_pos]}
                        icon={createStationIcon(station.parking_count, station.id === searchResult?.id || station.id === clickedStationId)}
                        eventHandlers={{
                            click: () => {
                                onStationClick(station);
                            },
                        }}
                    >
                        <Popup>
                            <div className="space-y-1">
                                <div className="text-base font-bold text-gray-800">{station.name}</div>
                                <div className="text-sm text-gray-500">{station.address}</div>
                                <div className="text-sm pt-1 mt-1 border-t border-gray-200">
                                    대여 가능: <span className="font-bold text-blue-600 text-base">{station.parking_count}</span> 대
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
            <button
                onClick={onGoToUserLocation}
                disabled={isCentering}
                className="absolute bottom-5 right-5 z-[1000] bg-white p-2.5 rounded-full shadow-lg hover:bg-gray-100 transition-colors disabled:cursor-wait disabled:bg-gray-200 flex items-center justify-center w-11 h-11"
                aria-label="내 위치로 이동"
                title="내 위치로 이동"
            >
                {isCentering ? <LoadingSpinner /> : <MyLocationIcon />}
            </button>
        </div>
    );
};

export default TashuMap;
