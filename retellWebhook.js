const express = require('express');
const router = express.Router();
const { getAvailableSlots } = require('./calendarService');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

router.post('/', async (req, res) => {
  const { call_id, message } = req.body;

  if (message.toLowerCase().includes("disponible")) {
    const slots = await getAvailableSlots();

    const formatted = slots.map(slot =>
      `${slot.date} à ${slot.hour}`
    ).slice(0, 3).join(', ');

    return res.json({
      response: `Voici les prochains créneaux disponibles : ${formatted}. Voulez-vous réserver l’un d’eux ?`,
      end_call: false,
    });
  }

  return res.json({
    response: "Merci pour votre message. Pour connaître nos disponibilités, dites 'disponible'.",
    end_call: false,
  });
});

// ✅ Test INSERT route
router.post('/test-insert', async (req, res) => {
  const { data, error } = await supabase
    .from('agenda')
    .insert([{ date: '2025-06-05', hour: '14:30', is_booked: false }]);

  if (error) {
    console.error("❌ INSERT ERROR:", error);
    return res.status(500).json({ error: "Insert failed" });
  }

  return res.json({ success: true, data });
});

module.exports = router; // ✅ à la toute fin
