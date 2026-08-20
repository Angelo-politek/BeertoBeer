import { Colors } from '@/constants/theme';

/**
 * BeerToBeer V2 cartography. OpenFreeMap exposes OpenMapTiles-compatible
 * vector tiles; keeping the style local prevents an upstream theme from
 * introducing colors that do not belong to the brand.
 */
export const BEER_TO_BEER_MAP_STYLE = {
  version: 8,
  name: 'BeerToBeer V2',
  glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
  sources: {
    openfreemap: {
      type: 'vector',
      url: 'https://tiles.openfreemap.org/planet',
      attribution:
        '<a href="https://openfreemap.org">OpenFreeMap</a> · <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [
    { id: 'background', type: 'background', paint: { 'background-color': Colors.dark.background } },
    {
      id: 'landcover',
      type: 'fill',
      source: 'openfreemap',
      'source-layer': 'landcover',
      filter: ['in', ['get', 'class'], ['literal', ['wood', 'grass', 'park', 'farmland']]],
      paint: { 'fill-color': '#18271C', 'fill-opacity': 0.72 },
    },
    {
      id: 'water',
      type: 'fill',
      source: 'openfreemap',
      'source-layer': 'water',
      paint: { 'fill-color': '#171C1D' },
    },
    {
      id: 'buildings',
      type: 'fill',
      source: 'openfreemap',
      'source-layer': 'building',
      minzoom: 12,
      paint: { 'fill-color': '#242424', 'fill-outline-color': '#303030' },
    },
    {
      id: 'minor-roads',
      type: 'line',
      source: 'openfreemap',
      'source-layer': 'transportation',
      filter: ['in', ['get', 'class'], ['literal', ['minor', 'service', 'path', 'track']]],
      paint: {
        'line-color': '#4E4E4B',
        'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.35, 16, 1.8],
      },
    },
    {
      id: 'major-roads-casing',
      type: 'line',
      source: 'openfreemap',
      'source-layer': 'transportation',
      filter: ['in', ['get', 'class'], ['literal', ['primary', 'secondary', 'tertiary', 'trunk', 'motorway']]],
      paint: {
        'line-color': '#0F0F0F',
        'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1.8, 16, 7],
      },
    },
    {
      id: 'major-roads',
      type: 'line',
      source: 'openfreemap',
      'source-layer': 'transportation',
      filter: ['in', ['get', 'class'], ['literal', ['primary', 'secondary', 'tertiary', 'trunk', 'motorway']]],
      paint: {
        'line-color': '#A9A79F',
        'line-width': ['interpolate', ['linear'], ['zoom'], 8, 0.8, 16, 4],
      },
    },
    {
      id: 'boundaries',
      type: 'line',
      source: 'openfreemap',
      'source-layer': 'boundary',
      paint: { 'line-color': '#343434', 'line-dasharray': [3, 3], 'line-width': 0.8 },
    },
    {
      id: 'railways',
      type: 'line',
      source: 'openfreemap',
      'source-layer': 'transportation',
      filter: ['==', ['get', 'class'], 'rail'],
      paint: { 'line-color': '#7A7A7A', 'line-width': 1, 'line-dasharray': [2, 2] },
    },
    {
      id: 'house-numbers',
      type: 'symbol',
      source: 'openfreemap',
      'source-layer': 'housenumber',
      minzoom: 17,
      layout: { 'text-field': ['get', 'housenumber'], 'text-font': ['Noto Sans Regular'], 'text-size': 10 },
      paint: { 'text-color': '#7A7A7A', 'text-halo-color': '#0F0F0F', 'text-halo-width': 1 },
    },
    {
      id: 'road-labels',
      type: 'symbol',
      source: 'openfreemap',
      'source-layer': 'transportation_name',
      minzoom: 13,
      layout: {
        'symbol-placement': 'line',
        'text-field': ['coalesce', ['get', 'name:it'], ['get', 'name']],
        'text-font': ['Noto Sans Regular'],
        'text-size': 11,
      },
      paint: { 'text-color': '#9B9B93', 'text-halo-color': '#0F0F0F', 'text-halo-width': 1.5 },
    },
    {
      id: 'place-labels',
      type: 'symbol',
      source: 'openfreemap',
      'source-layer': 'place',
      layout: {
        'text-field': ['coalesce', ['get', 'name:it'], ['get', 'name']],
        'text-font': ['Noto Sans Bold'],
        'text-size': ['interpolate', ['linear'], ['zoom'], 6, 11, 13, 16],
        'text-transform': 'uppercase',
      },
      paint: { 'text-color': '#F4F1EA', 'text-halo-color': '#0F0F0F', 'text-halo-width': 2 },
    },
  ],
} as const;
