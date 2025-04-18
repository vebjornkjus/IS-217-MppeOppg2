// main.js
import { initMap }      from './maps/mapInit.js';
import { addPatterns }  from './services/patterns.js';
import { fetchZones }   from './services/fetchZones.js';
import { addLegend }    from './components/legend.js';
import { setupFilters } from './components/filters.js';
import { setupSearch }  from './components/search.js';
import { setupSidebar } from './components/sidebar.js';

(async () => {
  const map      = initMap();
  const { red, yellow } = addPatterns(map);
  const data     = await fetchZones();

  // Bygg GeoJSON-laget
  const features = data.map(r => ({
    type: 'Feature',
    properties: { lokalId: r.lokalId, støysonekategori: r.støysonekategori, beregnetÅr: r.beregnetÅr },
    geometry: r.geom
  }));
  const geojsonLayer = L.geoJSON({ type:'FeatureCollection', features }, {
    style: f => ({
      color:'#333', weight:1,
      fillPattern: f.properties.støysonekategori==='R'?red:yellow
    }),
    onEachFeature: (f, layer) => {
      layer.bindPopup(`<strong>ID:</strong>${f.properties.lokalId}<br><strong>År:</strong>${f.properties.beregnetÅr}`);
      const el = layer.getElement?.()??layer._path;
      if(el) el.setAttribute('tabindex','0');
    }
  }).addTo(map);

  // UI‑bygging
  addLegend(map);
  setupFilters(geojsonLayer);
  setupSearch(map, geojsonLayer);
  setupSidebar(data, geojsonLayer, map);
})();