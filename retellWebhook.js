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
      messages: [{ role: "user", content: message }],
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

module.exports = router;
