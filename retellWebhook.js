const express = require('express');
const router = express.Router();

router.post('/', async (req, res) => {
  const { call_id, message } = req.body;

  console.log(`📞 New message from call ${call_id}: ${message}`);

  // TODO: envoyer à OpenAI, Supabase, etc.

  return res.json({
    response: `Merci pour votre message. Nous allons le traiter.`,
    end_call: false,
  });
});

module.exports = router;
