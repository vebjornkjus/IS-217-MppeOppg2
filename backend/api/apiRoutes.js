import express from 'express';
import { getFlights, getAirports } from './avinorService.js';

const router = express.Router();

router.get('/flightdata', async (req, res) => {
  const { airport, direction, timeFrom, timeTo } = req.query;
  try {
    // Pass timeFrom and timeTo to getFlights
    const flights = await getFlights(airport, direction, timeFrom, timeTo);
    return res.json(flights);
  } catch (error) {
    console.error('Error fetching flight data:', error.message);
    return res.status(500).json({ error: 'Failed to fetch flight data' });
  }
});

// GET /api/airports (keep if needed)
router.get('/airports', async (req, res) => {
  try {
    // Now call the imported function directly
    const airports = await getAirports();
    return res.json(airports);
  } catch (error) {
    console.error('Error fetching airports:', error.message);
    return res.status(500).json({ error: error.message || 'Failed to fetch airports list' });
  }
});

export default router;
