// /Users/vebjornkjus/Documents/IT/V25/IS-217/Mappeoppgave 2/Prosjektmappe/IS-217-MppeOppg2/backend/api/avinorService.js
import axios from 'axios';
import { parseStringPromise } from 'xml2js';

// --- Configuration ---
const API_BASE_URL = 'https://asrv.avinor.no';
const FLIGHT_CACHE_TTL = 3 * 60 * 1000; // 3 minutes
const STATIC_DATA_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// --- Caching ---
const flightCache = {};
const airportsCache = { data: null, timestamp: 0 };
// Consider adding caches for airlines and statuses if you implement those functions

// --- Helper Functions ---

/**
 * Maps Avinor status codes to human-readable text.
 * NOTE: Verify these codes against Avinor documentation.
 * @param {string|null} code The status code (e.g., 'E', 'A', 'D', 'C', 'N', 'O', 'G', 'X')
 * @returns {string} Human-readable status text.
 */
function mapStatusCodeToText(code) {
  if (!code) return 'Scheduled'; // Default if no code
  switch (code.toUpperCase()) {
    case 'A': return 'Arrived';
    case 'C': return 'Cancelled';
    case 'D': return 'Delayed'; // Or maybe 'Departed'? Verify!
    case 'E': return 'New Time'; // Estimated/Expected
    case 'G': return 'Gate Open'; // Or Go to Gate?
    case 'N': return 'New Info'; // Or Boarding?
    case 'O': return 'Departed'; // Or On Schedule? Verify!
    case 'X': return 'Cancelled'; // Verify if X is used
    // Add more codes as needed based on documentation or observation
    default: return `Status ${code}`; // Fallback for unknown codes
  }
}

/**
 * Safely extracts the flight list from various possible paths in the parsed XML result.
 * @param {object} parsedResult The object returned by parseStringPromise.
 * @returns {Array} An array of raw flight objects, or an empty array if none found.
 */
function extractFlightsFromResult(parsedResult) {
    let flightsRaw = null;

    // Check the most likely path first based on previous logs
    if (parsedResult?.airport?.flights?.flight) {
        flightsRaw = parsedResult.airport.flights.flight;
        console.log("Found flights under result.airport.flights.flight");
    }
    // Check other common paths seen in XML feeds
    else if (parsedResult?.flights?.flight) {
        flightsRaw = parsedResult.flights.flight;
        console.log("Found flights under result.flights.flight");
    }
    else if (parsedResult?.XmlFeed?.airport?.flights?.flight) { // Example: If there's a root <XmlFeed> tag
        flightsRaw = parsedResult.XmlFeed.airport.flights.flight;
        console.log("Found flights under result.XmlFeed.airport.flights.flight");
    }
     else if (parsedResult?.flight) { // If flights are directly under the root (less likely for a list)
         flightsRaw = parsedResult.flight;
         console.log("Found flights directly under result.flight");
     }

    if (!flightsRaw) {
        console.warn("Could not find flight data in any expected locations. Check the *entire* parsed JSON log.");
        return []; // Return empty array if no flights found
    }

    // Ensure the result is always an array, even if only one flight was returned
    // (Handles xml2js behavior with explicitArray: false)
    return Array.isArray(flightsRaw) ? flightsRaw : [flightsRaw];
}


// --- API Service Functions ---

/**
 * Fetch flight data using the v1.0 endpoint and format it.
 */
export async function getFlights(airport, direction, timeFrom = 1, timeTo = 1) {
  if (!airport) {
    throw new Error('Airport code is required');
  }
  const airportCode = airport.toUpperCase();
  let directionParam = '';
  if (direction) {
    const dir = direction.toLowerCase();
    if (dir === 'a') directionParam = 'A'; // Arrival
    else if (dir === 'd') directionParam = 'D'; // Departure
  }

  const validTimeFrom = Math.max(0, parseInt(timeFrom, 10) || 1);
  const validTimeTo = Math.max(1, parseInt(timeTo, 10) || 7);

  const cacheKey = `${airportCode}_${directionParam || 'ALL'}_${validTimeFrom}_${validTimeTo}`;
  const now = Date.now();
  if (flightCache[cacheKey] && (now - flightCache[cacheKey].timestamp < FLIGHT_CACHE_TTL)) {
    console.log(`Cache hit for flights: ${cacheKey}`);
    return flightCache[cacheKey].data;
  }
  console.log(`Cache miss for flights: ${cacheKey}. Fetching from Avinor v1.0...`);

  const url = `${API_BASE_URL}/XmlFeed/v1.0?TimeFrom=${validTimeFrom}&TimeTo=${validTimeTo}&airport=${airportCode}` +
              (directionParam ? `&direction=${directionParam}` : '');

  try {
    console.log(`Fetching URL: ${url}`);
    const response = await axios.get(url, { responseType: 'text' });
    const xmlData = response.data;

    const result = await parseStringPromise(xmlData, {
        explicitArray: false, // Keep false for easier access, handle single items later
        ignoreAttrs: false,
        mergeAttrs: true,     // Merge attributes (like status code) into properties
        charkey: 'text',      // Use 'text' for tag content
        emptyTag: null,       // Represent empty tags as null
        trim: true,           // Trim whitespace
        strict: false         // Be tolerant
    });

    // --- Log the *entire* parsed object. Crucial for debugging structure issues! ---
    console.log("--- Parsed XML Result (Full JSON) ---");
    console.log(JSON.stringify(result, null, 2));
    console.log("--- End Parsed XML Result ---");
    // ---

    const flightsArray = extractFlightsFromResult(result);

    console.log(`--- Found ${flightsArray.length} flight entries before mapping ---`);

    const cleanFlights = flightsArray
      // Filter based on essential fields identified
      .filter(f => f && f.UNIQUEID && f.AIRLINE && f.FLIGHT_ID && f.SCHEDULE_TIME && f.AIRPORT)
      .map(f => ({
        id:            f.UNIQUEID ?? null,
        operator:      f.AIRLINE ?? null,
        flightId:      f.FLIGHT_ID ?? null,
        flightNumber:  (f.FLIGHT_ID && f.AIRLINE && f.FLIGHT_ID.startsWith(f.AIRLINE))
                         ? f.FLIGHT_ID.substring(f.AIRLINE.length).trim()
                         : (f.FLIGHT_ID ?? null),
        scheduled:     f.SCHEDULE_TIME ?? null,
        estimated:     f.STATUS?.TIME ?? null, // Estimated time is often linked to status changes
        status:        mapStatusCodeToText(f.STATUS?.CODE), // Use helper for readable status
        statusCode:    f.STATUS?.CODE ?? null,
        gate:          f.GATE ?? null,
        checkIn:       f.CHECK_IN ?? null,
        remoteAirport: f.AIRPORT ?? null, // The other airport (Destination for D, Origin for A)
        via:           f.VIA_AIRPORT ?? null,
        direction:     f.ARR_DEP ?? null, // 'A' or 'D'
        domInt:        f.DOM_INT ?? null, // 'D', 'S', or 'I'
      }));

    console.log(`--- Returning ${cleanFlights.length} flights after filtering/mapping ---`);

    // Only cache if successful and data is present
    if (cleanFlights.length > 0) {
        flightCache[cacheKey] = {
          data: cleanFlights,
          timestamp: Date.now()
        };
    } else {
        // Optionally, cache empty results for a shorter time to avoid hammering the API
        // flightCache[cacheKey] = { data: [], timestamp: Date.now() };
        console.warn("No valid flight data found after mapping, not caching empty result.");
    }
    return cleanFlights;

  } catch (err) {
    console.error(`Avinor API request failed for ${url}:`, err.response?.status, err.message);
    if (err.response?.data) {
        console.error("Response data (start):", err.response.data.substring(0, 500) + "...");
    }
    if (err.message.includes('XML') || err.message.includes('Non-whitespace') || err.message.includes('Invalid character') || err.message.includes('Unexpected end')) {
         console.error("XML Parsing Error Detail:", err);
    }
    // Re-throw the error so the caller knows something went wrong
    throw new Error(`Avinor API request or parsing failed: ${err.message}`);
  }
}

/**
 * Fetch airport names and codes using the v1.0 endpoint.
 */
export async function getAirports() {
  const now = Date.now();
  if (airportsCache.data && (now - airportsCache.timestamp < STATIC_DATA_CACHE_TTL)) {
    console.log("Cache hit for airports.");
    return airportsCache.data;
  }
  console.log("Cache miss for airports. Fetching from Avinor v1.0...");

  // --- *** Use the v1.0 endpoint *** ---
  const url = `${API_BASE_URL}/airportNames/v1.0`;
  // ---

  try {
    const response = await axios.get(url, { responseType: 'text' });
    const xmlData = response.data;

    // Use explicitArray: true for lists where structure is known (like airports, airlines)
    const result = await parseStringPromise(xmlData, {
        explicitArray: true, // Good for known list structures
        ignoreAttrs: false,  // Keep attributes (like 'code')
        mergeAttrs: true,    // Merge attributes into properties
        charkey: 'name',     // Map text content to 'name' property
        emptyTag: null,
        trim: true,
        strict: false
    });

    // --- Log parsed airports for verification ---
    // console.log("--- Parsed Airports JSON ---");
    // console.log(JSON.stringify(result, null, 2));
    // ---

    let airportsList = [];
    // Adjust path based on actual XML structure (inspect log if needed)
    const airportEntries = result?.airportNames?.airport;

    if (airportEntries && Array.isArray(airportEntries)) {
        airportsList = airportEntries.map(entry => {
            // Check if 'code' and 'name' exist after merging attributes and using charkey
            if (entry && entry.code && entry.name) {
                return { code: entry.code, name: entry.name.trim() };
            }
            console.warn("Skipping malformed airport entry:", entry);
            return null;
        }).filter(Boolean); // Remove null entries
        console.log(`Found ${airportsList.length} airports.`);
    } else {
        console.warn("Could not find 'airportNames.airport' array in the XML response for airports. Check parsed JSON.");
    }

    airportsCache = {
      data: airportsList,
      timestamp: now // Use 'now' from the start of the function
    };
    return airportsList;
  } catch (err) {
    console.error(`Failed to fetch airport list from ${url}:`, err.response?.status, err.message);
     if (err.response?.data) {
        console.error("Response data (start):", err.response.data.substring(0, 500) + "...");
    }
    if (err.message.includes('XML') || err.message.includes('Invalid character')) {
         console.error("XML Parsing Error Detail:", err);
    }
    // Don't cache on error, re-throw
    throw new Error(`Failed to fetch airport list: ${err.message}`);
  }
}

// Potential future functions:
// export async function getAirlineNames() { ... }
// export async function getFlightStatus(flightId) { ... }
