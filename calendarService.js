const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

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
