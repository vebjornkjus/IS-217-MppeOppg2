// mapInit.js
export function initMap() {
    // Deaktivér standardzoom og sett visning
    const map = L.map('map', { zoomControl: false })
      .setView([61.14671, 9.9956], 6);
    // Flytt zoom‑kontroller
    L.control.zoom({ position: 'topright' }).addTo(map);
    return map;
  }