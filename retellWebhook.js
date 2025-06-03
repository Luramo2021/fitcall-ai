const express = require('express');
const router = express.Router();
const { getAvailableSlots } = require('./calendarService');
require('dotenv').config();

const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/', async (req, res) => {
  const { call_id, message } = req.body;

  // 🔎 Si l'utilisateur demande les disponibilités
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

  // 🤖 Sinon, réponse via OpenAI
  try {
   const completion = await openai.chat.completions.create({
  model: "gpt-3.5-turbo",
  messages: [
    {
      role: "system",
      content: "Tu es un assistant vocal pour un centre de remise en forme. Ta mission est de répondre aux questions des clients sur les horaires, les services proposés, les coachs disponibles, et la prise de rendez-vous. Tu dois être poli, clair, et orienté solution.",
    },
    {
      role: "user",
      content: message,
    }
  ],
  temperature: 0.7,
});

    const aiResponse = completion.choices[0].message.content;

    return res.json({
      response: aiResponse,
      end_call: false,
    });
  } catch (error) {
    console.error("❌ OpenAI error:", error);
    return res.json({
      response: "Désolé, une erreur s'est produite. Pouvez-vous répéter ?",
      end_call: false,
    });
  }
});


router.post('/test-reservation', async (req, res) => {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  const { call_id, first_name, email, service_type, date, hour } = req.body;

  // ✅ Vérifier que le créneau est bien disponible dans la table agenda
  const { data: existing, error: checkError } = await supabase
    .from('agenda')
    .select('*')
    .eq('date', date)
    .eq('hour', hour)
    .eq('is_booked', false);

  if (checkError) {
    console.error("❌ Erreur lors de la vérification du créneau:", checkError);
    return res.status(500).json({ error: "Erreur lors de la vérification du créneau", details: checkError });
  }

  if (!existing.length) {
    return res.status(400).json({ error: "Créneau non disponible" });
  }

  // ✅ Insérer la réservation dans la table reservations
  const { data, error } = await supabase
    .from('reservations')
    .insert([
      {
        call_id,
        first_name,
        email,
        service_type,
        date,
        hour
      }
    ]);

  if (error) {
    console.error('❌ INSERT ERROR:', error);
    return res.status(500).json({ error: "Insert failed", details: error });
  }

  // ✅ Mettre à jour le créneau comme réservé
  await supabase
    .from('agenda')
    .update({ is_booked: true })
    .eq('date', date)
    .eq('hour', hour);

  return res.json({ success: true, data });
});

module.exports = router;
