const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  console.log("🔗 SUPABASE_URL:", process.env.SUPABASE_URL);
  console.log("🔑 SUPABASE_ANON_KEY starts with:", process.env.SUPABASE_ANON_KEY?.slice(0, 10));
);
  //process.env.SUPABASE_URL,
 // process.env.SUPABASE_ANON_KEY

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


async function addTestSlot() {
  const { data, error } = await supabase
    .from('agenda')
    .insert([
      {
        date: '2025-06-05',
        hour: '14:00',
        is_booked: false,
      }
    ]);

  if (error) {
    console.error('❌ INSERT Supabase error:', error);
  } else {
    console.log('✅ INSERT successful:', data);
  }
}

// Décommenter pour tester en local uniquement
// addTestSlot();
