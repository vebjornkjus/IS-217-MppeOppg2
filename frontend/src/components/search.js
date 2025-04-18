// search.js
export function setupSearch(map, layer) {
    document.getElementById('searchBtn').addEventListener('click', () => {
      const id = document.getElementById('searchInput').value.trim();
      const match = layer.getLayers().find(l => l.feature.properties.lokalId === id);
      if (match) {
        map.fitBounds(match.getBounds());
        match.openPopup();
      } else {
        alert('Fant ingen sone med ID ' + id);
      }
    });
  }