const { createClient } = require('@supabase/supabase-js');
const fetch = require('cross-fetch');
global.fetch = fetch;

require('dotenv').config();

// 🔍 Debug (optionnel à supprimer en prod)
console.log("🔗 SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("🔑 SUPABASE_ANON_KEY starts with:", process.env.SUPABASE_ANON_KEY?.slice(0, 10));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function getAvailableSlots() {
  const { data, error } = await supabase
    .from('agenda')
    .select('*')
    .eq('is_booked', false)
    .order('date', { ascending: true })
    .order('hour', { ascending: true });

  if (error) {
    console.error('❌ Supabase error:', error);
    return [];
  }

  return data;
}

module.exports = { getAvailableSlots };
