const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const retellWebhook = require('./retellWebhook');
app.use('/webhook/retell', retellWebhook);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ FitCall AI running on port ${PORT}`);
});
