// mini.js
const express = require('express');
const app = express();

app.get('/ping', (_req, res) => res.send('pong'));
app.get('/', (_req, res) => res.send('OK-mini'));
const PORT = process.env.PORT || 3000; app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
