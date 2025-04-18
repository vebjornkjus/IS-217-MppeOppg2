import { supabase } from './supabaseClient.js';

export async function fetchZones() {
  const { data, error } = await supabase.from('NoisePollution').select('*, geom');
  if (error) throw error;
  return data;
}