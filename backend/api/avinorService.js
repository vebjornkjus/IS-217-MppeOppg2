// /Users/vebjornkjus/Documents/IT/V25/IS-217/Mappeoppgave 2/Prosjektmappe/IS-217-MppeOppg2/backend/api/avinorService.js
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

// Caching objects (should be defined outside the functions)
const flightCache = {};
let airportsCache = { data: null, timestamp: 0 };

const FLIGHT_CACHE_TTL = 3 * 60 * 1000; // 3 minutes
const AIRPORTS_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch flight data and format it for the frontend.
 */
export async function getFlights(airport, direction, timeFrom = 1, timeTo = 7) { // Add default values
  if (!airport) {
    throw new Error('Airport code is required');
  }
  const airportCode = airport.toUpperCase();
  let directionParam = '';
  if (direction) {
    const dir = direction.toLowerCase();
    if (dir === 'a') directionParam = 'A';
    else if (dir === 'd') directionParam = 'D';
  }

  // Validate time inputs (optional but good practice)
  const validTimeFrom = Math.max(0, parseInt(timeFrom, 10) || 1);
  const validTimeTo = Math.max(1, parseInt(timeTo, 10) || 7);

  const cacheKey = `${airportCode}_${directionParam || 'ALL'}_${validTimeFrom}_${validTimeTo}`; // Include time in cache key
  const now = Date.now();
  if (flightCache[cacheKey] && (now - flightCache[cacheKey].timestamp < FLIGHT_CACHE_TTL)) {
    console.log(`Cache hit for flights: ${cacheKey}`);
    return flightCache[cacheKey].data;
  }
  console.log(`Cache miss for flights: ${cacheKey}. Fetching from Avinor...`);

  // Use the validated time parameters in the URL
  const url = `https://flydata.avinor.no/XmlFeed.asp?TimeFrom=${validTimeFrom}&TimeTo=${validTimeTo}&airport=${airportCode}` +
              (directionParam ? `&direction=${directionParam}` : '');

  try {
    const response = await axios.get(url, { responseType: 'text' });
    const xmlData = response.data;

    // --- Add Logging Here for Debugging ---
    console.log("--- Raw XML Data ---");
    console.log(xmlData);
    console.log("--- End Raw XML Data ---");
    // --- End Logging ---

    const result = await parseStringPromise(xmlData, {
        explicitArray: false,
        ignoreAttrs: false,
        mergeAttrs: true,
        charkey: 'text',
        strict: false
    });

    // --- Add Logging Here for Debugging ---
    console.log("--- Parsed XML Result ---");
    console.log(JSON.stringify(result, null, 2)); // Pretty print JSON
    console.log("--- End Parsed XML Result ---");
    // --- End Logging ---


    let flightsRaw = [];
    if (result?.flights?.flight) {
        flightsRaw = result.flights.flight;
    } else if (result?.airport?.flights?.flight) {
        flightsRaw = result.airport.flights.flight;
    } else if (result?.flight) {
        flightsRaw = result.flight;
    }

    const flightsArray = Array.isArray(flightsRaw) ? flightsRaw : (flightsRaw ? [flightsRaw] : []);

    // --- Add Logging Here for Debugging ---
    console.log(`--- Found ${flightsArray.length} flights before filtering ---`);
    // --- End Logging ---

    const cleanFlights = flightsArray
      .filter(f => f && f.flight_id && f.airline)
      .map(f => ({
        id:            f.flight_id || null,
        operator:      f.airline || null,
        flightNumber:  f.flight_id ? f.flight_id.replace(f.airline, '').trim() : null,
        scheduled:     f.schedule_time || null,
        estimated:     null, // Still likely unavailable from this endpoint
        status:        f.status?.text || f.status || null, // Handle if status is just text
        terminal:      f.terminal || null,
        gate:          f.gate || null
      }));

    // --- Add Logging Here for Debugging ---
    console.log(`--- Returning ${cleanFlights.length} flights after filtering/mapping ---`);
    // --- End Logging ---


    flightCache[cacheKey] = {
      data: cleanFlights,
      timestamp: Date.now()
    };
    return cleanFlights;

  } catch (err) {
    console.error(`Avinor API request failed for ${url}:`, err.response?.status, err.message);
    if (err.message.includes('Invalid character')) {
         console.error("XML Parsing Error Detail:", err);
    }
    throw new Error(`Avinor API request failed: ${err.message}`);
  }
}

/**
 * Fetch list of airports (using export syntax) - ADD THIS FUNCTION BACK
 */
export async function getAirports() {
  const now = Date.now();
  if (airportsCache.data && (now - airportsCache.timestamp < AIRPORTS_CACHE_TTL)) {
    console.log("Cache hit for airports.");
    return airportsCache.data;
  }
  console.log("Cache miss for airports. Fetching from Avinor...");

  const url = `https://flydata.avinor.no/airportNames.asp?`;
  try {
    const response = await axios.get(url, { responseType: 'text' });
    const xmlData = response.data;

    const result = await parseStringPromise(xmlData, {
        explicitArray: true, // Keep true to handle single vs multiple airports consistently
        strict: false // Tolerate minor XML errors like unescaped '&'
    });

    let airportsList = [];
    // Adjust parsing based on actual XML structure
    if (result?.airportNames?.airport) {
        const airportEntries = result.airportNames.airport; // This should be an array due to explicitArray: true
        airportsList = airportEntries.map(entry => {
            // Attributes are in '$', text content in '_'
            // Add checks for entry existence and properties
            if (entry && entry.$ && entry.$.code && entry._) {
                return { code: entry.$.code, name: entry._.trim() };
            }
            console.warn("Skipping malformed airport entry:", entry);
            return null; // Or handle unexpected structure
        }).filter(Boolean); // Remove null entries
    } else {
        console.warn("Could not find 'airportNames.airport' structure in the XML response for airports.");
    }


    airportsCache = {
      data: airportsList,
      timestamp: Date.now()
    };
    return airportsList;
  } catch (err) {
    console.error(`Failed to fetch airport list from ${url}:`, err.response?.status, err.message);
     // Check if it's a parsing error specifically
    if (err.message.includes('Invalid character')) {
         console.error("XML Parsing Error Detail:", err);
    }
    throw new Error(`Failed to fetch airport list: ${err.message}`);
  }
}
