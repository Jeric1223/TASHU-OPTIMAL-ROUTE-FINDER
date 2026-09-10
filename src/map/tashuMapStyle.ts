import type { StyleSpecification } from 'maplibre-gl';

/**
 * 타슈 지도 베이스맵 스타일.
 *
 * 대전 전역(z0-15)을 담은 PMTiles 한 파일을 HTTP Range로 읽는다.
 * places/pois 레이어는 의도적으로 스타일하지 않는다 → 지명 라벨 0개.
 * 색은 tailwind.config.js의 잠금 팔레트만 사용한다.
 */

const C = {
  ground: '#F7F8FA', // gray-50
  water: '#C7CCD3', // gray-300 — 강이 녹지와 구분되게 한 단계 진하게
  building: '#EFF1F4', // gray-100
  park: '#EFF1F4',
  roadCasing: '#E2E5E9', // gray-200
  road: '#FFFFFF',
} as const;

const GREEN_KINDS = [
  'park', 'forest', 'wood', 'grass', 'grassland', 'meadow', 'scrub',
  'garden', 'village_green', 'recreation_ground', 'pitch', 'golf_course',
  'cemetery', 'zoo',
];

const MAIN_ROAD_KINDS = ['highway', 'major_road', 'medium_road'];
const MINOR_ROAD_KINDS = ['minor_road', 'other', 'path'];

/** 줌에 따라 선 굵기를 지수 보간 — 라벨 없이도 도로 위계가 읽히게 한다. */
const widthByZoom = (stops: number[]) =>
  ['interpolate', ['exponential', 1.6], ['zoom'], ...stops] as unknown as never;

export const GLYPHS_URL =
  'https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf';

export const createTashuMapStyle = (pmtilesUrl: string): StyleSpecification => ({
  version: 8,
  glyphs: GLYPHS_URL,
  sources: {
    protomaps: {
      type: 'vector',
      url: `pmtiles://${pmtilesUrl}`,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://protomaps.com">Protomaps</a>',
    },
  },
  layers: [
    { id: 'bg', type: 'background', paint: { 'background-color': C.ground } },
    {
      id: 'earth',
      type: 'fill',
      source: 'protomaps',
      'source-layer': 'earth',
      paint: { 'fill-color': C.ground },
    },
    {
      id: 'park',
      type: 'fill',
      source: 'protomaps',
      'source-layer': 'landuse',
      filter: ['in', ['get', 'kind'], ['literal', GREEN_KINDS]],
      paint: { 'fill-color': C.park },
    },
    {
      id: 'water',
      type: 'fill',
      source: 'protomaps',
      'source-layer': 'water',
      paint: { 'fill-color': C.water },
    },
    {
      id: 'buildings',
      type: 'fill',
      source: 'protomaps',
      'source-layer': 'buildings',
      minzoom: 14,
      paint: {
        'fill-color': C.building,
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 14, 0, 15, 1],
      },
    },
    // 도로는 케이싱(아래) + 본선(위) 2겹
    {
      id: 'road-casing',
      type: 'line',
      source: 'protomaps',
      'source-layer': 'roads',
      filter: ['in', ['get', 'kind'], ['literal', MAIN_ROAD_KINDS]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': C.roadCasing,
        'line-width': widthByZoom([8, 1.6, 11, 3.2, 14, 8, 16, 20]),
      },
    },
    {
      id: 'road-minor',
      type: 'line',
      source: 'protomaps',
      'source-layer': 'roads',
      filter: ['in', ['get', 'kind'], ['literal', MINOR_ROAD_KINDS]],
      minzoom: 13,
      layout: { 'line-cap': 'round' },
      paint: {
        'line-color': C.road,
        'line-width': widthByZoom([13, 0.6, 15, 2.4, 17, 8]),
      },
    },
    {
      id: 'road-main',
      type: 'line',
      source: 'protomaps',
      'source-layer': 'roads',
      filter: ['in', ['get', 'kind'], ['literal', MAIN_ROAD_KINDS]],
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': C.road,
        'line-width': widthByZoom([8, 0.8, 11, 2, 14, 6, 16, 16]),
      },
    },
    // places / pois 는 스타일하지 않는다 (라벨 0개)
  ],
});
