const express = require('express');
const router = express.Router();
const { getAvailableSlots } = require('./calendarService');
require('dotenv').config();

const { OpenAI } = require('openai');
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

const session = {}; // 🧠 Stockage temporaire des infos de l'appel

router.post('/', async (req, res) => {
  const { call_id, message } = req.body;
  if (!session[call_id]) session[call_id] = {};

  const state = session[call_id];
  const lower = message.toLowerCase();

  if (!state.step) {
    state.step = 'ask_booking';
    return res.json({ response: "Bonjour, souhaitez-vous prendre un rendez-vous ?", end_call: false });
  }

  // Étape 1 : Confirmation prise de RDV
  if (state.step === 'ask_booking') {
    if (lower.includes("oui")) {
      state.step = 'get_name';
      return res.json({ response: "Quel est votre prénom ?", end_call: false });
    } else {
      delete session[call_id];
      return res.json({ response: "Très bien. N'hésitez pas à nous recontacter si besoin !", end_call: true });
    }
  }

  // Étape 2 : Prénom
  if (state.step === 'get_name') {
    state.first_name = message.trim();
    state.step = 'get_service';
    return res.json({ response: `Merci ${state.first_name}. Pour quel service souhaitez-vous réserver ?`, end_call: false });
  }

  // Étape 3 : Service
  if (state.step === 'get_service') {
    state.service_type = message.trim();
    const slots = await getAvailableSlots();

    if (!slots.length) {
      return res.json({ response: "Désolé, aucun créneau disponible actuellement. Souhaitez-vous être rappelé ?", end_call: false });
    }

    state.availableSlots = slots;
    state.step = 'get_slot';

    const formatted = slots.map(s => `${s.date} à ${s.hour}`).slice(0, 3).join(', ');
    return res.json({ response: `Voici les créneaux disponibles : ${formatted}. Lequel préférez-vous ?`, end_call: false });
  }

  // Étape 4 : Créneau
  if (state.step === 'get_slot') {
    const chosen = state.availableSlots.find(s => `${s.date} ${s.hour}`.includes(message.trim()));

    if (!chosen) {
      return res.json({ response: "Désolé, ce créneau n’est pas disponible. Veuillez choisir un des créneaux proposés.", end_call: false });
    }

    state.date = chosen.date;
    state.hour = chosen.hour;
    state.step = 'get_email';
    return res.json({ response: "Merci ! Pouvez-vous me donner votre adresse e-mail pour confirmer la réservation ?", end_call: false });
  }

  // Étape 5 : Email + Enregistrement
  if (state.step === 'get_email') {
    state.email = message.trim();

    // Vérification du créneau
    const { data: existing } = await supabase
      .from('agenda')
      .select('*')
      .eq('date', state.date)
      .eq('hour', state.hour)
      .eq('is_booked', false);

    if (!existing.length) {
      delete session[call_id];
      return res.json({ response: "Malheureusement, le créneau vient d'être réservé. Merci de recommencer.", end_call: true });
    }

    // Enregistrement
    await supabase.from('reservations').insert([
      {
        call_id,
        first_name: state.first_name,
        email: state.email,
        service_type: state.service_type,
        date: state.date,
        hour: state.hour,
      }
    ]);

    await supabase
      .from('agenda')
      .update({ is_booked: true })
      .eq('date', state.date)
      .eq('hour', state.hour);

    const confirmation = `Votre rendez-vous est confirmé pour le ${state.date} à ${state.hour} ! Vous recevrez un e-mail à ${state.email}. Merci et à bientôt !`;
    delete session[call_id];
    return res.json({ response: confirmation, end_call: true });
  }

  // 🧠 Fallback vers OpenAI
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Tu es un assistant vocal pour un centre de remise en forme. Réponds aux questions des clients sur les horaires, services et réservations."
        },
        { role: "user", content: message }
      ],
      temperature: 0.7,
    });

    const aiResponse = completion.choices[0].message.content;
    return res.json({ response: aiResponse, end_call: false });
  } catch (error) {
    console.error("❌ OpenAI error:", error);
    return res.json({ response: "Désolé, une erreur est survenue. Pouvez-vous répéter ?", end_call: false });
  }
});

module.exports = router;
