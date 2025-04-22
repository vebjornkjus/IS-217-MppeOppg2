import { initMap }      from './maps/mapInit.js';
import { addPatterns }  from './services/patterns.js';
import { fetchZones }   from './services/fetchZones.js';
import { addLegend }    from './components/legend.js';
import { setupFilters } from './components/filters.js';
import { setupSearch }  from './components/search.js';
import { setupSidebar } from './components/sidebar.js';
import { fetchAirports } from './services/fetchAirports.js';
import { fetchFlightData } from './services/fetchFlightData.js';
import { planeIcon, heliIcon, getAirportIcon } from './maps/icons.js';

(async () => {
  const map      = initMap();
  const { red, yellow } = addPatterns(map);
  const data     = await fetchZones();

  // Bygg GeoJSON-laget for støysonekategorier
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

  // Legg til flyplasser med spesifikke ikoner
  const airports = await fetchAirports();

  // Konverter til GeoJSON
  const airportGeoJson = {
    type: 'FeatureCollection',
    features: airports.map(a => ({
      type: 'Feature',
      properties: {
        id: a.id,
        navn: a.navn,
        iata: a.iataKode,
        lufthavntype: a.lufthavntype,
        trafikktype: a.trafikktype
      },
      geometry: a.geom
    }))
  };

  L.geoJSON(airportGeoJson, {
    pointToLayer: (feature, latlng) => {
      const icon = getAirportIcon(feature.properties.lufthavntype);
      return L.marker(latlng, { icon });
    },
    onEachFeature: (feature, layer) => {
      layer.bindPopup(`
        <strong>${feature.properties.navn}</strong><br>
        IATA: ${feature.properties.iata}<br>
        Type: ${feature.properties.lufthavntype}<br>
        Trafikktype: ${feature.properties.trafikktype}
      `);
    }
  }).addTo(map);

  // Dynamisk opprett flight‑kontroller
  const controlsContainer = document.createElement('section');
  controlsContainer.id = 'flight-controls';
  controlsContainer.innerHTML = `
    <h2>Flydata-filtre</h2>
    <label>Flyplass:
      <select id="airportSelect">
        <option value="OSL">OSL</option>
        <option value="BGO">BGO</option>
        <option value="TOS">TOS</option>
      </select>
    </label>
    <label>Retning:
      <select id="directionSelect">
        <option value="">Alle</option>
        <option value="A">Ankomster</option>
        <option value="D">Avganger</option>
      </select>
    </label>
    <label>Timer bak:
      <input type="number" id="timeFrom" min="0" max="24" value="2">
    </label>
    <label>Timer fram:
      <input type="number" id="timeTo" min="0" max="24" value="12">
    </label>
    <button id="refreshFlights">Oppdater flydata</button>
  `;
  document.getElementById('sidebar').appendChild(controlsContainer);
  
  // Legg til flight‑kontroller og last flydata
  const airportSelect   = document.getElementById('airportSelect');
  const directionSelect = document.getElementById('directionSelect');
  const timeFromInput   = document.getElementById('timeFrom');
  const timeToInput     = document.getElementById('timeTo');
  const refreshBtn      = document.getElementById('refreshFlights');

  async function loadFlights() {
    // Fjern tidligere
    const old = document.getElementById('flightdata-panel');
    if (old) old.remove();

    // Les parametre
    const opts = {
      airport:   airportSelect.value,
      direction: directionSelect.value || undefined,
      timeFrom:  parseInt(timeFromInput.value, 10),
      timeTo:    parseInt(timeToInput.value, 10)
    };

    let flights = [];
    try {
      flights = await fetchFlightData(opts);
      console.log('Fetched flights:', flights);
    } catch (err) {
      console.error('Feil ved henting av flydata:', err);
    }

    // Bygg seksjon
    const flightSection = document.createElement('section');
    flightSection.id = 'flightdata-panel';
    flightSection.innerHTML = '<h2>Flydata</h2>';

    if (flights.length === 0) {
      flightSection.innerHTML += '<p>Ingen fly funnet i valgt tidsrom.</p>';
    } else {
      const table = document.createElement('table');
      table.className = 'flight-table';
      table.innerHTML = `
        <thead>
          <tr>
            <th>Flight</th><th>Status</th><th>Gate</th><th>Terminal</th><th>Scheduled</th>
          </tr>
        </thead>
        <tbody>
          ${flights.map(f => `
            <tr>
              <td>${f.operator} ${f.flightNumber}</td>
              <td>${f.status}</td>
              <td>${f.gate || '-'}</td>
              <td>${f.terminal || '-'}</td>
              <td>${f.scheduled || '-'}</td>
            </tr>
          `).join('')}
        </tbody>
      `;
      flightSection.appendChild(table);
    }
    document.getElementById('sidebar').appendChild(flightSection);
  }

  refreshBtn.addEventListener('click', loadFlights);
  await loadFlights();
  setInterval(loadFlights, 180000);

  // UI‑bygging
  addLegend(map);
  setupFilters(geojsonLayer);
  setupSearch(map, geojsonLayer);
  setupSidebar(data, geojsonLayer, map);
})();