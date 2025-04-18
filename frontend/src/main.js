import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';

// Initialize Supabase client – replace with your actual values
const supabaseUrl = 'https://vbcaurfqxmfmlsmsswbx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiY2F1cmZxeG1mbWxzbXNzd2J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5ODc0NjMsImV4cCI6MjA2MDU2MzQ2M30.-ITPfyKUbJiqYYYow9Oby99bwsQJTE6-FQgg82qILPo';
const supabase = createClient(supabaseUrl, supabaseKey);

// Coordinates for Norway
const map = L.map('map').setView([61.14671, 9.9956], 6); // Norway

// Define diagonal stripe patterns for noise categories
const redPattern = new L.StripePattern({
  weight: 5,
  spaceWeight: 4,
  color: 'red',
  opacity: 1,
  angle: 45        // ← 45° for diagonal stripes
});
redPattern.addTo(map);

const yellowPattern = new L.StripePattern({
  weight: 5,
  spaceWeight: 4,
  color: 'yellow',
  opacity: 1,
  angle: 45        // same diagonal orientation
});
yellowPattern.addTo(map);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Fetch noise_zones data from Supabase and add as GeoJSON
async function fetchNoiseZones() {
  const { data, error } = await supabase
    .from('NoisePollution')
    .select('*, geom');
  if (error) {
    console.error('Error fetching noise_zones:', error);
    return;
  }

  // Convert each row into a GeoJSON Feature
  const features = data.map(row => ({
    type: 'Feature',
    properties: {
      lokalId: row.lokalId,
      støysonekategori: row.støysonekategori,
      beregnetÅr: row.beregnetÅr,
      // add other properties as needed
    },
    geometry: row.geom
  }));

  const geojson = {
    type: 'FeatureCollection',
    features
  };

  // Add to map with accessibility enhancements
  L.geoJSON(geojson, {
    style: feature => {
      const cat = feature.properties.støysonekategori;
      return {
        color: '#333',
        weight: 1,
        fillPattern: cat === 'R' ? redPattern : (cat === 'G' ? yellowPattern : null)
      };
    },
    onEachFeature: (feature, layer) => {
      layer.bindPopup(`ID: ${feature.properties.lokalId}`);
      // Ensure DOM element exists before setting tabindex for accessibility
      let element = null;
      if (typeof layer.getElement === 'function') {
        element = layer.getElement();
      } else if (layer._path) {
        element = layer._path;
      } else if (layer._icon) {
        element = layer._icon;
      }
      if (element) {
        element.setAttribute('tabindex', '0');
      }
    }
  }).addTo(map);
}

// Call the function to load data
fetchNoiseZones();