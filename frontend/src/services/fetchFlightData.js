// frontend/src/services/fetchFlightData.js

/**
 * Fetches flight data via the local backend proxy.
 * @param {Object} opts
 * @param {string} [opts.airport='OSL']   IATA code, e.g., 'OSL'
 * @param {'A'|'D'} [opts.direction='D']  'A' for arrivals, 'D' for departures
 * @param {number} [opts.timeFrom=1]      Hours before now
 * @param {number} [opts.timeTo=1]        Hours ahead of now
 * @returns {Promise<Array<Object>>}      Array of flight objects
 */
export async function fetchFlightData({
  airport   = 'OSL',
  direction = 'D',
  timeFrom  = 1,
  timeTo    = 1
} = {}) {
  const params = new URLSearchParams({
    airport: airport.toUpperCase(),
    direction,
    timeFrom,
    timeTo
  });
  const proxyUrl = `http://localhost:3000/api/flightdata?${params.toString()}`;
  const res = await fetch(proxyUrl, { cache: 'no-store' });
  if (res.status === 304) {
    // No new data; return empty
    return [];
  }
  if (!res.ok) {
    throw new Error(`Backend fetch failed: ${res.status}`);
  }
  return await res.json();
}