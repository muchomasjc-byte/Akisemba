const express = require('express');
const path = require('path');
const app = express();

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'panel-gestion-evento.html'));
});

app.listen(process.env.PORT || 3000);
