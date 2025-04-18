import { supabase } from './supabaseClient.js'; // use centralized client

/**
 * Fetch airport features from Supabase.
 * @returns {Promise<Array<Object>>} Array of airport objects with geometry.
 */
export async function fetchAirports() {
  const { data, error } = await supabase
    .from('Airports') 
    .select(`
      id,
      navn,
      icaoKode,
      iataKode,
      lufthavntype,
      trafikktype,
      geom
    `);
  if (error) {
    console.error('Error fetching airports:', error);
    throw error;
  }
  return data;
}