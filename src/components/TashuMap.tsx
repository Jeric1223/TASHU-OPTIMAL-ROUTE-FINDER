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
import type BaseLayer from 'ol/layer/Base';
import type { Station, StationWithDistance, Coordinates, OptimalRoute, CityId } from '../types';
import { fetchRoadPath, lonLatOf } from '../services/roadRouteService';
import type { LonLat } from '../services/roadRouteService';

interface TashuMapProps {
  stations: Station[];
  center: [number, number];
  zoom: number;
  userLocation?: Coordinates | null;
  searchResult?: StationWithDistance | null;
  /** 주어지면 이 id의 정류소만 지도에 그린다 (즐겨찾기 탭) */
  visibleStationIds?: string[] | null;
  /** 내 위치 → 선택한 정류소 도보선과 '도보 N분' 말풍선 (주변 탭) */
  walkLine?: { from: Coordinates; to: Coordinates; label: string } | null;
  clickedStationId?: string | null;
  /** 브랜드색 테마(data-city)를 정하고, 바뀌면 캔버스 마커를 다시 그린다 */
  city: CityId;
  onStationClick: (station: Station) => void;
  /** 정류소·클러스터가 아닌 지도 빈 곳을 탭했을 때 */
  onMapClick?: () => void;
  route?: OptimalRoute | null;
  /** 경로 결과를 볼 때 정류소·클러스터를 숨겨 길이 잘 보이게 한다 */
  hideStations?: boolean;
  /** 지도 위를 덮는 UI(상단 검색바, 하단 시트+탭바) 높이(px). 중심 이동 시 가려지지 않는 영역 가운데로 맞춘다. */
  coveredInsets?: { top: number; bottom: number };
}

/**
 * 배경지도: VWorld WMTS 'white' 레이어 (Google XYZ 좌표계, z6–19). 채도를 뺀 백지도라 핀·경로가 돋보인다. 'Base'는 POI 아이콘이 많아 핀과 경쟁한다.
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
    url: `https://api.vworld.kr/req/wmts/1.0.0/${VWORLD_KEY}/white/{z}/{y}/{x}.png`,
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

type PillState = 'available' | 'empty' | 'selected';

// 시안 D: 흰 알약에 숫자만. 선택되면 도시 브랜드색으로 채운다 (--brand / --on-brand, data-city로 전환).
const readCssVar = (name: string, fallback: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;

const pillColors = (state: PillState): { bg: string; fg: string } => {
  if (state === 'selected') return { bg: readCssVar('--brand', '#FF9A24'), fg: readCssVar('--on-brand', '#14171C') };
  return state === 'empty' ? { bg: '#FFFFFF', fg: '#7A828C' } : { bg: '#FFFFFF', fg: '#14171C' };
};

/** 논리 px 크기의 캔버스를 만들고 2배 스케일을 적용한다. 그림자가 잘리지 않게 사방 여백을 둔다. */
const CANVAS_PAD = 8;
const createCanvas = (width: number, height: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = (width + CANVAS_PAD * 2) * IMAGE_PIXEL_RATIO;
  canvas.height = (height + CANVAS_PAD * 2) * IMAGE_PIXEL_RATIO;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(IMAGE_PIXEL_RATIO, IMAGE_PIXEL_RATIO);
  ctx.translate(CANVAS_PAD, CANVAS_PAD);
  return { canvas, ctx };
};

/** 알약 라벨: 대여 가능 대수만. 정류소 좌표가 알약 중심에 온다. */
const PILL_H = 32;
const PILL_MIN_W = 32;

const drawPill = (state: PillState, count: number) => {
  const PAD_X = 9;
  const font = `700 14px ${FONT_STACK}`;
  const label = String(count);
  const colors = pillColors(state);

  const measure = document.createElement('canvas').getContext('2d');
  if (!measure) return null;
  measure.font = font;
  const W = Math.max(PILL_MIN_W, Math.ceil(PAD_X * 2 + measure.measureText(label).width));
  const H = PILL_H;

  const created = createCanvas(W, H);
  if (!created) return null;
  const { canvas, ctx } = created;

  const radius = H / 2;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(W - radius, 0);
  ctx.arc(W - radius, radius, radius, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(radius, H);
  ctx.arc(radius, radius, radius, Math.PI / 2, Math.PI * 1.5);
  ctx.closePath();
  ctx.shadowColor = 'rgba(20, 23, 28, 0.25)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.fillStyle = colors.bg;
  ctx.fill();
  ctx.shadowColor = 'transparent';

  ctx.font = font;
  ctx.fillStyle = colors.fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, W / 2, H / 2 + 1);

  return { canvas, height: H };
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
  ctx.fillStyle = readCssVar('--brand', '#FF9A24'); // 도시 트레이드마크 색 (타슈 주황 / 따릉이 파랑)
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#FFFFFF';
  ctx.stroke();

  ctx.font = `700 ${count < 1000 ? 14 : 13}px ${FONT_STACK}`;
  ctx.fillStyle = readCssVar('--on-brand', '#14171C');
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
    const pill = drawPill(state, count);
    style = new Style({
      image: pill
        ? new Icon({
            img: pill.canvas,
            // 선택된 핀은 시안처럼 1.3배
            scale: (state === 'selected' ? 1.3 : 1) / IMAGE_PIXEL_RATIO,
          })
        : undefined,
      zIndex: state === 'selected' ? 10 : 0,
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

// 도보는 점선(점 모양), 자전거는 초록 실선 — 시안 D
const walkStyle = new Style({
  stroke: new Stroke({
    color: 'rgba(107, 114, 125, 0.7)',
    width: 4,
    lineDash: [1, 10],
    lineCap: 'round',
  }),
});
const bikeStyle = new Style({
  stroke: new Stroke({
    color: 'rgba(20, 23, 28, 0.8)',
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

// 도로 좌표는 가장 가까운 도로로 스냅되어 끝점이 실제 지점과 조금 어긋난다. 양 끝에 실제 지점을 이어 붙인다.
const withEnds = (path: LonLat[] | null | undefined, start: LonLat, end: LonLat): LonLat[] =>
  path ? [start, ...path, end] : [start, end];

// roadPaths[i]가 있으면 i번째 구간을 도로 좌표로, 없으면 직선으로 그린다
const toRouteFeatures = (route?: OptimalRoute | null, roadPaths: (LonLat[] | null)[] = []) =>
  // 도보(점선) → 자전거(실선) 순서로 넣어 자전거 구간이 위에 그려지게
  (route?.segments ?? [])
    .map((segment, i) => ({ segment, i }))
    .sort((a, b) => Number(a.segment.type !== 'walk') - Number(b.segment.type !== 'walk'))
    .map(({ segment, i }) => {
      const start = lonLatOf(segment.startPoint);
      const end = lonLatOf(segment.endPoint);

      return new Feature({
        geometry: new LineString(withEnds(roadPaths[i], start, end).map((p) => fromLonLat(p))),
        walk: segment.type === 'walk',
      });
    });

const TashuMap: React.FC<TashuMapProps> = ({
  stations,
  center,
  zoom,
  userLocation,
  searchResult,
  visibleStationIds,
  walkLine,
  clickedStationId,
  city,
  onStationClick,
  onMapClick,
  route,
  hideStations = false,
  coveredInsets,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<OlMap | null>(null);
  const stationSourceRef = useRef<VectorSource | null>(null);
  const routeSourceRef = useRef<VectorSource | null>(null);
  const highlightSourceRef = useRef<VectorSource | null>(null);
  const userMarkerRef = useRef<Overlay | null>(null);
  const walkSourceRef = useRef<VectorSource | null>(null);
  const stationLayersRef = useRef<BaseLayer[]>([]);
  const walkBubbleRef = useRef<Overlay | null>(null);
  const routePinsRef = useRef<Overlay[]>([]);
  // 최신 콜백을 이벤트 핸들러에서 쓰기 위한 참조 (핸들러를 재등록하지 않는다)
  const onStationClickRef = useRef(onStationClick);
  onStationClickRef.current = onStationClick;
  const onMapClickRef = useRef(onMapClick);
  onMapClickRef.current = onMapClick;

  // 도시 테마 반영 (캔버스 마커는 CSS 변수를 못 따라가므로 캐시를 비워 다시 그린다)
  useEffect(() => {
    document.documentElement.dataset.city = city;
    styleCache.clear();
    stationLayersRef.current.forEach((l) => l.changed());
  }, [city]);

  // 지도 1회 생성
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const stationSource = new VectorSource();
    const clusterSource = new Cluster({ source: stationSource, distance: CLUSTER_DISTANCE });
    const routeSource = new VectorSource();
    const walkSource = new VectorSource();
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
    const walkLayer = new VectorLayer({ source: walkSource, style: walkStyle });
    const routeLayer = new VectorLayer({
      source: routeSource,
      style: (f) => (f.get('walk') ? walkStyle : bikeStyle),
    });

    const map = new OlMap({
      target: containerRef.current,
      layers: [new TileLayer({ source: createBaseSource() }), walkLayer, routeLayer, stationLayer, highlightLayer],
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
    stationLayersRef.current = [stationLayer, highlightLayer];
    stationSourceRef.current = stationSource;
    routeSourceRef.current = routeSource;
    walkSourceRef.current = walkSource;
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
      walkBubbleRef.current = null;
      routePinsRef.current = [];
    };
    // 최초 1회만 생성한다 (center/zoom 후속 변경은 아래 effect가 처리)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 정류소 (즐겨찾기 탭에서는 저장한 정류소만)
  const visibleKey = visibleStationIds ? visibleStationIds.join(',') : null;
  useEffect(() => {
    const source = stationSourceRef.current;
    if (!source) return;
    const shown = visibleStationIds ? stations.filter((s) => visibleStationIds.includes(s.id)) : stations;
    source.clear();
    source.addFeatures(toStationFeatures(shown));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stations, visibleKey]);

  useEffect(() => {
    stationLayersRef.current.forEach((l) => l.setVisible(!hideStations));
  }, [hideStations]);

  // 경로: 선, 대여/반납/도착 라벨 핀, 경로 전체가 보이도록 화면 맞춤
  useEffect(() => {
    const map = mapRef.current;
    const source = routeSourceRef.current;
    if (!map || !source) return;
    source.clear();
    source.addFeatures(toRouteFeatures(route));
    routePinsRef.current.forEach((o) => map.removeOverlay(o));
    routePinsRef.current = [];
    if (!route || route.segments.length === 0) return;

    const pinAt = (label: string, lonLat: [number, number], tone: 'white' | 'muted' | 'accent') => {
      const el = document.createElement('div');
      const color = tone === 'accent' ? 'bg-primary text-on-primary' : tone === 'muted' ? 'bg-white text-[#7A828C]' : 'bg-white text-[#14171C]';
      el.className = `px-3 min-w-[36px] h-8 grid place-items-center rounded-2xl text-sm font-bold whitespace-nowrap shadow-[0_2px_8px_rgba(20,23,28,0.25)] ${color}`;
      el.textContent = label;
      const overlay = new Overlay({ element: el, positioning: 'center-center', position: fromLonLat(lonLat), stopEvent: false });
      map.addOverlay(overlay);
      routePinsRef.current.push(overlay);
    };
    pinAt('대여', [Number(route.startStation.y_pos), Number(route.startStation.x_pos)], route.startStation.parking_count === 0 ? 'muted' : 'white');
    pinAt('반납', [Number(route.endStation.y_pos), Number(route.endStation.x_pos)], 'white');
    pinAt('도착', lonLatOf(route.segments[route.segments.length - 1].endPoint), 'accent');

    // 위는 유리 입력 폼, 아래는 결과 시트(모바일) / 왼쪽은 패널(데스크톱)이 덮는다
    const desktop = window.innerWidth >= 900;
    const padding = desktop ? [80, 80, 80, 460] : [150, 40, Math.round(window.innerHeight * 0.54) + 24, 40];
    const extent = boundingExtent(
      route.segments.flatMap((seg) => [fromLonLat(lonLatOf(seg.startPoint)), fromLonLat(lonLatOf(seg.endPoint))])
    );
    map.getView().fit(extent, { padding, duration: 700, maxZoom: 17 });

    // 직선을 먼저 보여 주고, 도로 좌표가 오면 길을 따라가는 선으로 바꾼다 (실패한 구간은 직선 유지)
    // 자전거 구간도 foot 프로파일을 쓴다: OSM bike 프로파일은 대전에서 foot의 1~2배 넘게 돌아간다 (시청→유성온천 10.4km vs 4.6km)
    const ctrl = new AbortController();
    Promise.all(
      route.segments.map((seg) => fetchRoadPath('foot', lonLatOf(seg.startPoint), lonLatOf(seg.endPoint), ctrl.signal))
    ).then((paths) => {
      if (ctrl.signal.aborted || paths.every((p) => !p)) return;
      source.clear();
      source.addFeatures(toRouteFeatures(route, paths.map((p) => p?.coords ?? null)));
    });
    return () => ctrl.abort();
  }, [route]);

  // 내 위치 → 선택 정류소 도보선 + '도보 N분' 말풍선
  useEffect(() => {
    const map = mapRef.current;
    const source = walkSourceRef.current;
    if (!map || !source) return;
    source.clear();
    if (!walkLine) {
      if (walkBubbleRef.current) map.removeOverlay(walkBubbleRef.current);
      walkBubbleRef.current = null;
      return;
    }
    const from = fromLonLat([walkLine.from.longitude, walkLine.from.latitude]);
    const to = fromLonLat([walkLine.to.longitude, walkLine.to.latitude]);
    source.addFeature(new Feature({ geometry: new LineString([from, to]) }));
    // 직선을 먼저 그리고 도로 좌표가 오면 길을 따라가는 선으로 교체한다
    const ctrl = new AbortController();
    const a: LonLat = [walkLine.from.longitude, walkLine.from.latitude];
    const b: LonLat = [walkLine.to.longitude, walkLine.to.latitude];
    fetchRoadPath('foot', a, b, ctrl.signal).then((path) => {
      if (ctrl.signal.aborted || !path) return;
      source.clear();
      source.addFeature(new Feature({ geometry: new LineString(withEnds(path.coords, a, b).map((p) => fromLonLat(p))) }));
    });
    if (!walkBubbleRef.current) {
      const el = document.createElement('div');
      el.className = 'px-2.5 py-1 rounded-full bg-[#F4F5F3] text-xs font-semibold text-[#14171C] whitespace-nowrap shadow-[0_2px_8px_rgba(20,23,28,0.25)]';
      walkBubbleRef.current = new Overlay({ element: el, positioning: 'bottom-center', offset: [0, -30], stopEvent: false });
      map.addOverlay(walkBubbleRef.current);
    }
    walkBubbleRef.current.getElement()!.textContent = walkLine.label;
    walkBubbleRef.current.setPosition(to);
    return () => ctrl.abort();
  }, [walkLine]);

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
        <div class="absolute w-9 h-9 bg-[#3B7DDD]/20 rounded-full"></div>
        <div class="relative w-4 h-4 bg-[#3B7DDD] rounded-full border-[3px] border-white shadow-[0_1px_4px_rgba(20,23,28,0.3)]"></div>
      `;
      userMarkerRef.current = new Overlay({ element: el, positioning: 'center-center', stopEvent: false });
      map.addOverlay(userMarkerRef.current);
    }
    userMarkerRef.current.setPosition(fromLonLat([userLocation.longitude, userLocation.latitude]));
  }, [userLocation]);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
};

export default TashuMap;
