import React, { useEffect, useRef } from 'react';
import 'ol/ol.css';
import OlMap from 'ol/Map';
import View from 'ol/View';
import Feature from 'ol/Feature';
import Overlay from 'ol/Overlay';
import Point from 'ol/geom/Point';
import LineString from 'ol/geom/LineString';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import XYZ from 'ol/source/XYZ';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import Cluster from 'ol/source/Cluster';
import { Icon, Stroke, Style } from 'ol/style';
import { fromLonLat, toLonLat } from 'ol/proj';
import { boundingExtent } from 'ol/extent';
import { defaults as defaultControls } from 'ol/control/defaults';
import { defaults as defaultInteractions } from 'ol/interaction/defaults';
import type { FeatureLike } from 'ol/Feature';
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
  /** 정류소·클러스터가 아닌 지도 빈 곳을 탭했을 때 */
  onMapClick?: () => void;
  route?: OptimalRoute | null;
  /** 지도 위를 덮는 UI(상단 검색바, 하단 시트+탭바) 높이(px). 중심 이동 시 가려지지 않는 영역 가운데로 맞춘다. */
  coveredInsets?: { top: number; bottom: number };
}

/**
 * 배경지도: VWorld WMTS 'Base' 레이어 (Google XYZ 좌표계, z6–19). 장소명·POI 아이콘이 포함된 일반지도.
 * 키는 빌드 시 주입된다 (로컬 .env / GitHub Actions secrets.VITE_VWORLD_KEY).
 * 키가 없으면 지도가 통째로 비지 않도록 OSM으로 대체한다.
 */
const VWORLD_KEY = import.meta.env.VITE_VWORLD_KEY as string | undefined;

const createBaseSource = () => {
  if (!VWORLD_KEY) {
    console.warn('[TashuMap] VITE_VWORLD_KEY가 없어 OpenStreetMap 타일로 대체합니다.');
    return new OSM();
  }
  return new XYZ({
    url: `https://api.vworld.kr/req/wmts/1.0.0/${VWORLD_KEY}/Base/{z}/{y}/{x}.png`,
    minZoom: 6,
    maxZoom: 19,
    attributions: '© VWorld · 국토교통부',
  });
};

// 클러스터는 z15까지만 묶고, 그보다 확대하면 개별 정류소를 보여준다
const CLUSTER_MAX_ZOOM = 15;
const CLUSTER_DISTANCE = 60;

/**
 * 마커는 캔버스로 직접 그린 이미지를 쓴다 (앱과 같은 Pretendard로 숫자를 그리기 위함).
 * 2배 해상도로 굽고 Icon scale 0.5로 표시해 레티나에서도 선명하게 만든다.
 */
const FONT_STACK = "'Pretendard Variable', Pretendard, 'Apple SD Gothic Neo', 'Malgun Gothic', system-ui, sans-serif";
const IMAGE_PIXEL_RATIO = 2;

// Material directions_bike (24x24)
const BIKE_PATH =
  'M15.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM5 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5zm5.8-10l2.4-2.4.8.8c1.3 1.3 3 2.1 5.1 2.1V9c-1.5 0-2.7-.6-3.6-1.5l-1.9-1.9c-.5-.4-1-.6-1.6-.6s-1.1.2-1.4.6L7.8 8.4c-.4.4-.6.9-.6 1.4 0 .6.2 1.1.6 1.4L11 14v5h2v-6.2l-2.2-2.3zM19 12c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 8.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z';

type PillState = 'available' | 'empty' | 'selected';

// 잠금 팔레트만 사용: primary / primary-dim / gray-300 / gray-500
const PILL_COLORS: Record<PillState, { bg: string; border: string; fg: string }> = {
  available: { bg: '#FFFFFF', border: '#006A3C', fg: '#006A3C' },
  empty: { bg: '#FFFFFF', border: '#C7CCD3', fg: '#7A828C' },
  selected: { bg: '#006A3C', border: '#00542F', fg: '#FFFFFF' },
};

/** 논리 px 크기의 캔버스를 만들고 2배 스케일을 적용한다. 선이 잘리지 않게 사방 1px 여백을 둔다. */
const createCanvas = (width: number, height: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = (width + 2) * IMAGE_PIXEL_RATIO;
  canvas.height = (height + 2) * IMAGE_PIXEL_RATIO;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(IMAGE_PIXEL_RATIO, IMAGE_PIXEL_RATIO);
  ctx.translate(1, 1);
  return { canvas, ctx };
};

/** 알약 라벨: [자전거 아이콘 + 대여 가능 대수] + 아래 꼬리. 꼬리 끝이 정류소 좌표에 온다. */
const PILL_H = 26;
const PILL_TAIL = 6;

const drawPill = (state: PillState, count: number) => {
  const PAD_X = 9;
  const ICON = 14;
  const GAP = 4;
  const font = `700 13px ${FONT_STACK}`;
  const label = String(count);
  const colors = PILL_COLORS[state];

  const measure = document.createElement('canvas').getContext('2d');
  if (!measure) return null;
  measure.font = font;
  const W = Math.ceil(PAD_X * 2 + ICON + GAP + measure.measureText(label).width);
  const H = PILL_H;

  const created = createCanvas(W, H + PILL_TAIL);
  if (!created) return null;
  const { canvas, ctx } = created;

  const radius = H / 2;
  const cx = W / 2;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(W - radius, 0);
  ctx.arc(W - radius, radius, radius, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(cx + 5, H);
  ctx.lineTo(cx, H + PILL_TAIL);
  ctx.lineTo(cx - 5, H);
  ctx.lineTo(radius, H);
  ctx.arc(radius, radius, radius, Math.PI / 2, Math.PI * 1.5);
  ctx.closePath();
  ctx.fillStyle = colors.bg;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = colors.border;
  ctx.stroke();

  ctx.save();
  ctx.translate(PAD_X, (H - ICON) / 2);
  ctx.scale(ICON / 24, ICON / 24);
  ctx.fillStyle = colors.fg;
  ctx.fill(new Path2D(BIKE_PATH));
  ctx.restore();

  ctx.font = font;
  ctx.fillStyle = colors.fg;
  ctx.textBaseline = 'middle';
  ctx.fillText(label, PAD_X + ICON + GAP, H / 2 + 1);

  return canvas;
};

/** 클러스터: 초록 원 + 흰 테두리 + 흰 숫자. 개수 구간에 따라 지름만 키운다. */
const drawCluster = (count: number) => {
  const D = count < 10 ? 34 : count < 100 ? 40 : 48;
  const created = createCanvas(D + 2, D + 2);
  if (!created) return null;
  const { canvas, ctx } = created;
  const c = D / 2 + 1;

  ctx.beginPath();
  ctx.arc(c, c, D / 2, 0, Math.PI * 2);
  ctx.fillStyle = '#006A3C';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#FFFFFF';
  ctx.stroke();

  ctx.font = `700 ${count < 1000 ? 14 : 13}px ${FONT_STACK}`;
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(count), c, c + 1);

  return canvas;
};

// 같은 대수·개수의 마커는 Style을 재사용한다. 웹폰트 로딩 후에는 비우고 다시 그린다.
const styleCache = new Map<string, Style>();

const getPillStyle = (state: PillState, count: number) => {
  const key = `pill-${state}-${count}`;
  let style = styleCache.get(key);
  if (!style) {
    const img = drawPill(state, count);
    style = new Style({
      image: img
        ? new Icon({
            img,
            scale: 1 / IMAGE_PIXEL_RATIO,
            // 꼬리 끝(캔버스 여백 1px 포함)이 좌표에 오도록
            anchor: [0.5, (PILL_H + PILL_TAIL + 1) * IMAGE_PIXEL_RATIO],
            anchorYUnits: 'pixels',
          })
        : undefined,
    });
    styleCache.set(key, style);
  }
  return style;
};

const getClusterStyle = (count: number) => {
  const key = `cluster-${count}`;
  let style = styleCache.get(key);
  if (!style) {
    const img = drawCluster(count);
    style = new Style({
      image: img ? new Icon({ img, scale: 1 / IMAGE_PIXEL_RATIO }) : undefined,
    });
    styleCache.set(key, style);
  }
  return style;
};

const parkingCount = (feature: FeatureLike) => Number(feature.get('parking_count') ?? 0);

const stationStyle = (feature: FeatureLike) => {
  const members = feature.get('features') as FeatureLike[];
  if (members.length > 1) return getClusterStyle(members.length);
  const count = parkingCount(members[0]);
  return getPillStyle(count > 0 ? 'available' : 'empty', count);
};

const walkStyle = new Style({
  stroke: new Stroke({
    color: 'rgba(156, 163, 173, 0.8)',
    width: 3,
    lineDash: [6, 12],
    lineCap: 'round',
  }),
});
const bikeStyle = new Style({
  stroke: new Stroke({
    color: 'rgba(0, 106, 60, 0.8)',
    width: 5,
    lineCap: 'round',
    lineJoin: 'round',
  }),
});

const toStationFeatures = (stations: Station[]) =>
  // 타슈 API 네이밍 함정: x_pos = 위도, y_pos = 경도. OpenLayers 좌표는 [경도, 위도] 순.
  stations.map(
    (s) =>
      new Feature({
        geometry: new Point(fromLonLat([Number(s.y_pos), Number(s.x_pos)])),
        id: s.id,
        name: s.name,
        address: s.address,
        parking_count: Number(s.parking_count ?? 0),
      })
  );

const toRouteFeatures = (route?: OptimalRoute | null) =>
  // 도보(점선) → 자전거(실선) 순서로 넣어 자전거 구간이 위에 그려지게
  [...(route?.segments ?? [])]
    .sort((a, b) => Number(a.type !== 'walk') - Number(b.type !== 'walk'))
    .map((segment) => {
      const start =
        'x_pos' in segment.startPoint
          ? [segment.startPoint.y_pos, segment.startPoint.x_pos]
          : [segment.startPoint.coords.longitude, segment.startPoint.coords.latitude];
      const end =
        'x_pos' in segment.endPoint
          ? [segment.endPoint.y_pos, segment.endPoint.x_pos]
          : [segment.endPoint.coords.longitude, segment.endPoint.coords.latitude];

      return new Feature({
        geometry: new LineString([fromLonLat(start), fromLonLat(end)]),
        walk: segment.type === 'walk',
      });
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
  onMapClick,
  route,
  coveredInsets,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<OlMap | null>(null);
  const stationSourceRef = useRef<VectorSource | null>(null);
  const routeSourceRef = useRef<VectorSource | null>(null);
  const highlightSourceRef = useRef<VectorSource | null>(null);
  const userMarkerRef = useRef<Overlay | null>(null);
  const destMarkerRef = useRef<Overlay | null>(null);
  // 최신 콜백을 이벤트 핸들러에서 쓰기 위한 참조 (핸들러를 재등록하지 않는다)
  const onStationClickRef = useRef(onStationClick);
  onStationClickRef.current = onStationClick;
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  // 지도 1회 생성
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const stationSource = new VectorSource();
    const clusterSource = new Cluster({ source: stationSource, distance: CLUSTER_DISTANCE });
    const routeSource = new VectorSource();
    const highlightSource = new VectorSource();

    const stationLayer = new VectorLayer({
      source: clusterSource,
      style: stationStyle,
      // 겹칠 때 대여 가능한 정류소가 위에 오게 (나중에 그린 것이 위)
      renderOrder: (a, b) => {
        const rank = (f: FeatureLike) => {
          const members = f.get('features') as FeatureLike[];
          return members.length > 1 ? 2 : parkingCount(members[0]) > 0 ? 1 : 0;
        };
        return rank(a) - rank(b);
      },
    });
    // 선택된 정류소 (검색 결과 또는 클릭): 초록 채움 알약을 같은 자리에 덮어 그린다
    const highlightLayer = new VectorLayer({
      source: highlightSource,
      style: (f) => getPillStyle('selected', parkingCount(f)),
    });
    const routeLayer = new VectorLayer({
      source: routeSource,
      style: (f) => (f.get('walk') ? walkStyle : bikeStyle),
    });

    const map = new OlMap({
      target: containerRef.current,
      layers: [new TileLayer({ source: createBaseSource() }), routeLayer, stationLayer, highlightLayer],
      view: new View({
        center: fromLonLat([center[1], center[0]]),
        zoom,
        minZoom: 6,
        maxZoom: 19,
      }),
      controls: defaultControls({
        zoom: false,
        rotate: false,
        attributionOptions: { collapsible: true, collapsed: true },
      }),
      interactions: defaultInteractions({ altShiftDragRotate: false, pinchRotate: false }),
    });
    mapRef.current = map;
    stationSourceRef.current = stationSource;
    routeSourceRef.current = routeSource;
    highlightSourceRef.current = highlightSource;

    const view = map.getView();
    const syncClusterDistance = () => {
      const z = view.getZoom() ?? 0;
      const distance = z > CLUSTER_MAX_ZOOM ? 0 : CLUSTER_DISTANCE;
      if (clusterSource.getDistance() !== distance) clusterSource.setDistance(distance);
    };
    syncClusterDistance();
    view.on('change:resolution', syncClusterDistance);

    map.on('click', (e) => {
      const clicked = map.forEachFeatureAtPixel(e.pixel, (f) => f, {
        layerFilter: (layer) => layer === stationLayer,
      });
      // 드래그(팬)는 click이 발생하지 않으므로 여기 오는 건 실제 탭뿐이다
      if (!clicked) {
        onMapClickRef.current?.();
        return;
      }
      const members = clicked.get('features') as Feature<Point>[];

      // 클러스터: 묶인 정류소가 모두 보이도록 확대
      if (members.length > 1) {
        const extent = boundingExtent(members.map((m) => m.getGeometry()!.getCoordinates()));
        view.fit(extent, { duration: 500, padding: [80, 80, 80, 80], maxZoom: CLUSTER_MAX_ZOOM + 1 });
        return;
      }

      // 정류소: 상세 정보는 하단 시트의 StationCard가 보여준다 (지도 팝업 없음)
      const station = members[0];
      const [lng, lat] = toLonLat(station.getGeometry()!.getCoordinates());
      onStationClickRef.current({
        id: station.get('id'),
        name: station.get('name'),
        address: station.get('address'),
        x_pos: lat,
        y_pos: lng,
        parking_count: parkingCount(station),
      });
    });

    map.on('pointermove', (e) => {
      if (e.dragging) return;
      const hit = map.hasFeatureAtPixel(e.pixel, { layerFilter: (layer) => layer === stationLayer });
      map.getTargetElement().style.cursor = hit ? 'pointer' : '';
    });

    // 캔버스는 웹폰트 로딩을 기다려주지 않는다. 폰트가 준비되면 캐시를 비우고 마커를 다시 그린다.
    document.fonts
      .load(`700 13px ${FONT_STACK}`, '0123456789')
      .then(() => {
        styleCache.clear();
        stationLayer.changed();
        highlightLayer.changed();
      })
      .catch(() => undefined);

    return () => {
      map.setTarget(undefined);
      mapRef.current = null;
      userMarkerRef.current = null;
      destMarkerRef.current = null;
    };
    // 최초 1회만 생성한다 (center/zoom 후속 변경은 아래 effect가 처리)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 정류소
  useEffect(() => {
    const source = stationSourceRef.current;
    if (!source) return;
    source.clear();
    source.addFeatures(toStationFeatures(stations));
  }, [stations]);

  // 경로
  useEffect(() => {
    const source = routeSourceRef.current;
    if (!source) return;
    source.clear();
    source.addFeatures(toRouteFeatures(route));
  }, [route]);

  // 강조 정류소 (검색 결과 또는 클릭한 정류소)
  useEffect(() => {
    const source = highlightSourceRef.current;
    if (!source) return;
    const targetId = searchResult?.id ?? clickedStationId;
    const target = targetId ? stations.find((s) => s.id === targetId) : undefined;
    source.clear();
    if (target) source.addFeatures(toStationFeatures([target]));
  }, [stations, searchResult, clickedStationId]);

  // 시트를 끌 때마다 지도가 다시 움직이지 않도록 insets는 ref로만 읽는다
  const coveredInsetsRef = useRef(coveredInsets);
  coveredInsetsRef.current = coveredInsets;

  // 중심/줌 이동 — 대상 좌표가 화면 정중앙이 아니라 UI에 가려지지 않는 영역의 가운데에 오도록 보정
  useEffect(() => {
    const view = mapRef.current?.getView();
    if (!view) return;
    const [x, y] = fromLonLat([center[1], center[0]]);
    const { top = 0, bottom = 0 } = coveredInsetsRef.current ?? {};
    const offsetPx = (bottom - top) / 2;
    const resolution = view.getResolutionForZoom(zoom);
    view.animate({
      center: [x, y - offsetPx * resolution],
      zoom,
      duration: 1000,
    });
  }, [center, zoom]);

  // 내 위치
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!userLocation) {
      if (userMarkerRef.current) map.removeOverlay(userMarkerRef.current);
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
      userMarkerRef.current = new Overlay({ element: el, positioning: 'center-center', stopEvent: false });
      map.addOverlay(userMarkerRef.current);
    }
    userMarkerRef.current.setPosition(fromLonLat([userLocation.longitude, userLocation.latitude]));
  }, [userLocation]);

  // 목적지
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!selectedDestination) {
      if (destMarkerRef.current) map.removeOverlay(destMarkerRef.current);
      destMarkerRef.current = null;
      return;
    }
    if (!destMarkerRef.current) {
      const el = document.createElement('div');
      el.className = 'text-gray-900';
      el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 3v1.5M3 21v-6m0 0 2.77-.693a9 9 0 0 1 6.208.682l.108.054a9 9 0 0 0 6.086.71l3.114-.732a48.524 48.524 0 0 1-.005-10.499l-3.11.732a9 9 0 0 1-6.085-.711l-.108-.054a9 9 0 0 0-6.208-.682L3 4.5M3 15V4.5" /></svg>`;
      // 깃대 아래 끝이 좌표에 오도록 이미지 중심에서 이동
      destMarkerRef.current = new Overlay({
        element: el,
        positioning: 'center-center',
        offset: [12, -16],
        stopEvent: false,
      });
      map.addOverlay(destMarkerRef.current);
    }
    destMarkerRef.current.setPosition(
      fromLonLat([selectedDestination.longitude, selectedDestination.latitude])
    );
  }, [selectedDestination]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

export default TashuMap;
