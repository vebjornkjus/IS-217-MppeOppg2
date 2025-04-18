// Coordinates for Norway
const map = L.map('map').setView([61.14671, 9.9956], 6); // Norway

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Her kan dere etter hvert legge til Turf-analyse, GeoJSON-data osv.