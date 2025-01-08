const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

// Rota principal
app.get('/', (req, res) => {
    res.send('Olá, Vercel! O servidor está funcionando 🎉');
});

// Escuta na porta definida pelo Vercel
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
