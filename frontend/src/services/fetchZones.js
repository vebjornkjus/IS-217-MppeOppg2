// fetchZones.js
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';
const supabase = createClient(/* ... */);

export async function fetchZones() {
  const { data, error } = await supabase.from('NoisePollution').select('*, geom');
  if (error) throw error;
  return data;
}