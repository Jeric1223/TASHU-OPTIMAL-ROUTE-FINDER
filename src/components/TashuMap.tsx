import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { Protocol } from 'pmtiles';
import 'maplibre-gl/dist/maplibre-gl.css';
import { createTashuMapStyle } from '../map/tashuMapStyle';
import type { Station, StationWithDistance, Coordinates, OptimalRoute } from '../types';

interface TashuMapProps {
  stations: Station[];
  center: [number, number];
  zoom: number;
  userLocation?: Coordinates | null;
  searchResult?: StationWithDistance | null;
  selectedDestination?: Coordinates | null;
  clickedStationId?: string | null;
  onStationClick: (station: Station) => void;
  route?: OptimalRoute | null;
}

// PMTiles 프로토콜은 앱 전체에서 한 번만 등록한다 (중복 등록 시 MapLibre가 예외를 던짐)
let protocolRegistered = false;
const registerPmtilesProtocol = () => {
  if (protocolRegistered) return;
  maplibregl.addProtocol('pmtiles', new Protocol().tile);
  protocolRegistered = true;
};

const PMTILES_URL = `${import.meta.env.BASE_URL}tiles/daejeon.pmtiles`;

/**
 * 정류소 핀 SVG. 원래 Leaflet divIcon에 쓰던 아트워크를 그대로 쓰되,
 * 대여 가능 대수는 MapLibre 텍스트 레이어가 그리므로 숫자는 비워둔다.
 */
const pinSvg = (fillColor: string) => `
  <svg width="64" height="64" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
    <circle cx="45" cy="65" r="35" fill="${fillColor}"/>
    <g transform="translate(27, 47) scale(1.5)" fill="white">
      <path d="M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm5.8-10l2.4-2.4.8.8c1.3 1.3 3 2.1 5.1 2.1V9c-1.5 0-2.7-.6-3.6-1.5l-1.9-1.9c-.5-.4-1-.6-1.6-.6s-1.1.2-1.4.6L7.8 8.4c-.4.4-.6.9-.6 1.4 0 .6.2 1.1.6 1.4L11 14v5h2v-6.2l-2.2-2.3zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z"/>
    </g>
    <rect x="58" y="20" width="40" height="28" rx="14" fill="white" stroke="${fillColor}" stroke-width="2"/>
  </svg>
`;

/** SVG를 2배 해상도 비트맵으로 굽고 pixelRatio 2로 등록해 레티나에서도 선명하게 만든다. */
const addPinImage = (map: maplibregl.Map, id: string, fillColor: string) =>
  new Promise<void>((resolve) => {
    const img = new Image(128, 128);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve();
      ctx.drawImage(img, 0, 0, 128, 128);
      if (!map.hasImage(id)) {
        map.addImage(id, ctx.getImageData(0, 0, 128, 128), { pixelRatio: 2 });
      }
      resolve();
    };
    img.onerror = () => resolve();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(pinSvg(fillColor))}`;
  });

const toStationFeatures = (stations: Station[]) => ({
  type: 'FeatureCollection' as const,
  // 타슈 API 네이밍 함정: x_pos = 위도, y_pos = 경도. GeoJSON은 [경도, 위도] 순.
  features: stations.map((s) => ({
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [Number(s.y_pos), Number(s.x_pos)] },
    properties: {
      id: s.id,
      name: s.name,
      address: s.address,
      parking_count: Number(s.parking_count ?? 0),
    },
  })),
});

const toRouteFeatures = (route?: OptimalRoute | null) => ({
  type: 'FeatureCollection' as const,
  features: (route?.segments ?? []).map((segment) => {
    const start =
      'x_pos' in segment.startPoint
        ? [segment.startPoint.y_pos, segment.startPoint.x_pos]
        : [segment.startPoint.coords.longitude, segment.startPoint.coords.latitude];
    const end =
      'x_pos' in segment.endPoint
        ? [segment.endPoint.y_pos, segment.endPoint.x_pos]
        : [segment.endPoint.coords.longitude, segment.endPoint.coords.latitude];

    return {
      type: 'Feature' as const,
      geometry: { type: 'LineString' as const, coordinates: [start, end] },
      properties: { walk: segment.type === 'walk' },
    };
  }),
});

const EMPTY_FC = { type: 'FeatureCollection' as const, features: [] };

const TashuMap: React.FC<TashuMapProps> = ({
  stations,
  center,
  zoom,
  userLocation,
  searchResult,
  selectedDestination,
  clickedStationId,
  onStationClick,
  route,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const destMarkerRef = useRef<maplibregl.Marker | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  // 최신 콜백을 이벤트 핸들러에서 쓰기 위한 참조 (핸들러를 재등록하지 않는다)
  const onStationClickRef = useRef(onStationClick);
  onStationClickRef.current = onStationClick;
  // load 콜백이 최신 props를 읽을 수 있도록 보관
  const stationsRef = useRef(stations);
  stationsRef.current = stations;
  const routeRef = useRef(route);
  routeRef.current = route;

  // 지도 1회 생성
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    registerPmtilesProtocol();

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: createTashuMapStyle(PMTILES_URL),
      center: [center[1], center[0]],
      zoom,
      attributionControl: { compact: true },
    });
    mapRef.current = map;

    map.on('load', async () => {
      await Promise.all([
        addPinImage(map, 'pin-available', '#006A3C'),
        addPinImage(map, 'pin-empty', '#8B95A1'),
      ]);

      map.addSource('stations', {
        type: 'geojson',
        data: EMPTY_FC,
        cluster: true,
        clusterRadius: 80,
        clusterMaxZoom: 15,
      });
      map.addSource('route', { type: 'geojson', data: EMPTY_FC });
      map.addSource('highlight', { type: 'geojson', data: EMPTY_FC });

      // 경로: 도보(점선) → 자전거(실선) 순서로 자전거 구간이 위에 오게
      map.addLayer({
        id: 'route-walk',
        type: 'line',
        source: 'route',
        filter: ['==', ['get', 'walk'], true],
        layout: { 'line-cap': 'round' },
        paint: {
          'line-color': '#9CA3AD',
          'line-width': 3,
          'line-opacity': 0.8,
          'line-dasharray': [2, 4],
        },
      });
      map.addLayer({
        id: 'route-bike',
        type: 'line',
        source: 'route',
        filter: ['==', ['get', 'walk'], false],
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': '#006A3C', 'line-width': 5, 'line-opacity': 0.8 },
      });

      // 강조 링: 핀의 원형 배지 중심에 맞춰 이동시킨다
      map.addLayer({
        id: 'station-highlight',
        type: 'circle',
        source: 'highlight',
        paint: {
          'circle-radius': 22,
          'circle-color': 'rgba(0,106,60,0.12)',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#006A3C',
          'circle-translate': [-8, -17.3],
        },
      });

      // 클러스터: 개수에 따라 초록 농도를 올린다 (기존 divIcon 램프와 동일)
      map.addLayer({
        id: 'cluster',
        type: 'circle',
        source: 'stations',
        filter: ['has', 'point_count'],
        paint: {
          'circle-radius': 22,
          'circle-color': '#006A3C',
          'circle-opacity': [
            'interpolate',
            ['linear'],
            ['get', 'point_count'],
            1, 0.75,
            10, 0.9,
            50, 1,
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#FFFFFF',
        },
      });
      map.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'stations',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['to-string', ['get', 'point_count']],
          'text-font': ['Noto Sans Regular'],
          'text-size': 14,
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#FFFFFF' },
      });

      // 개별 정류소 핀 + 대여 가능 대수
      map.addLayer({
        id: 'station',
        type: 'symbol',
        source: 'stations',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': [
            'case',
            ['>', ['get', 'parking_count'], 0],
            'pin-available',
            'pin-empty',
          ],
          'icon-size': 1,
          'icon-anchor': 'center',
          // Leaflet iconAnchor [32,52] ↔ 이미지 중심(32,32) 차이만큼 위로 올린다
          'icon-offset': [0, -20],
          'icon-allow-overlap': true,
          'text-field': ['to-string', ['get', 'parking_count']],
          'text-font': ['Noto Sans Regular'],
          'text-size': 13,
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': ['case', ['>', ['get', 'parking_count'], 0], '#006A3C', '#333A44'],
          // 숫자 배지 중심(41.6, 18.1)까지 이동 + 아이콘 오프셋 -20 반영
          'text-translate': [9.6, -33.9],
        },
      });

      map.on('click', 'cluster', (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const source = map.getSource('stations') as maplibregl.GeoJSONSource;
        source
          .getClusterExpansionZoom(feature.properties!.cluster_id as number)
          .then((z) => {
            const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates;
            map.easeTo({ center: [lng, lat], zoom: z });
          })
          .catch(() => undefined);
      });

      map.on('click', 'station', (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const p = feature.properties as {
          id: string;
          name: string;
          address: string;
          parking_count: number;
        };
        const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates;

        popupRef.current?.remove();
        popupRef.current = new maplibregl.Popup({ offset: [0, -46], closeButton: true })
          .setLngLat([lng, lat])
          .setHTML(
            `<div class="space-y-1">
              <div class="text-base font-bold" style="color:#14171C">${p.name}</div>
              <div class="text-sm" style="color:#7A828C">${p.address}</div>
              <div class="text-sm pt-1 mt-1 border-t" style="border-color:#E2E5E9">
                대여 가능: <span class="font-bold text-base" style="color:#006A3C">${p.parking_count}</span> 대
              </div>
            </div>`
          )
          .addTo(map);

        onStationClickRef.current({
          id: p.id,
          name: p.name,
          address: p.address,
          x_pos: lat,
          y_pos: lng,
          parking_count: p.parking_count,
        });
      });

      for (const layer of ['cluster', 'station']) {
        map.on('mouseenter', layer, () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', layer, () => {
          map.getCanvas().style.cursor = '';
        });
      }

      readyRef.current = true;
      // load 이전에 도착한 props를 반영시키기 위해 리렌더를 유발하는 대신 직접 주입
      (map.getSource('stations') as maplibregl.GeoJSONSource).setData(
        toStationFeatures(stationsRef.current)
      );
      (map.getSource('route') as maplibregl.GeoJSONSource).setData(
        toRouteFeatures(routeRef.current)
      );
    });

    return () => {
      popupRef.current?.remove();
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
    };
    // 최초 1회만 생성한다 (center/zoom 후속 변경은 아래 effect가 처리)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 정류소
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    (map.getSource('stations') as maplibregl.GeoJSONSource | undefined)?.setData(
      toStationFeatures(stations)
    );
  }, [stations]);

  // 경로
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    (map.getSource('route') as maplibregl.GeoJSONSource | undefined)?.setData(
      toRouteFeatures(route)
    );
  }, [route]);

  // 강조 정류소 (검색 결과 또는 클릭한 정류소)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const targetId = searchResult?.id ?? clickedStationId;
    const target = targetId ? stations.find((s) => s.id === targetId) : undefined;
    (map.getSource('highlight') as maplibregl.GeoJSONSource | undefined)?.setData(
      target ? toStationFeatures([target]) : EMPTY_FC
    );
  }, [stations, searchResult, clickedStationId]);

  // 중심/줌 이동
  useEffect(() => {
    mapRef.current?.flyTo({ center: [center[1], center[0]], zoom, duration: 1000 });
  }, [center, zoom]);

  // 내 위치
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!userLocation) {
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      return;
    }
    if (!userMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'relative flex items-center justify-center';
      el.innerHTML = `
        <div class="absolute w-9 h-9 bg-[#E8F5EE] rounded-full"></div>
        <div class="relative w-3.5 h-3.5 bg-[#006A3C] rounded-full border-2 border-white"></div>
      `;
      userMarkerRef.current = new maplibregl.Marker({ element: el })
        .setPopup(new maplibregl.Popup({ offset: 16 }).setText('현재 내 위치'))
        .addTo(map);
    }
    userMarkerRef.current.setLngLat([userLocation.longitude, userLocation.latitude]);
  }, [userLocation]);

  // 목적지
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!selectedDestination) {
      destMarkerRef.current?.remove();
      destMarkerRef.current = null;
      return;
    }
    if (!destMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'text-gray-900';
      el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" /></svg>`;
      // Leaflet iconAnchor [4,32] ↔ 이미지 중심(16,16) 차이
      destMarkerRef.current = new maplibregl.Marker({ element: el, offset: [12, -16] })
        .setPopup(new maplibregl.Popup({ offset: 16 }).setText('선택한 목적지'))
        .addTo(map);
    }
    destMarkerRef.current.setLngLat([
      selectedDestination.longitude,
      selectedDestination.latitude,
    ]);
  }, [selectedDestination]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

export default TashuMap;
