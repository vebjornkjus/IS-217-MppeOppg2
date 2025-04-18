// fetchZones.js
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js';
// Initialize Supabase client – replace with your actual values
const supabaseUrl = 'https://vbcaurfqxmfmlsmsswbx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZiY2F1cmZxeG1mbWxzbXNzd2J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ5ODc0NjMsImV4cCI6MjA2MDU2MzQ2M30.-ITPfyKUbJiqYYYow9Oby99bwsQJTE6-FQgg82qILPo';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function fetchZones() {
  const { data, error } = await supabase.from('NoisePollution').select('*, geom');
  if (error) throw error;
  return data;
}