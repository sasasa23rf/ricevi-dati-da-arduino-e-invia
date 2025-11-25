const express = require('express');
const cors = require('cors');
const app = express();

// IMPORTANTE: Legge la porta fornita da Render, altrimenti usa la 3000 per test locali
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Permette richieste da qualsiasi origine (fondamentale per far funzionare l'HTML locale)
app.use(express.json()); // Permette al server di capire i dati JSON in arrivo

// Variabile per salvare l'ultimo comando (utile per il futuro passaggio con NodeMCU)
let ultimoComando = "";

// 1. ROTTA POST: Riceve il comando dalla pagina Web HTML
// L'indirizzo completo sarà: https://comandi-server.onrender.com/api/comando
app.post('/api/comando', (req, res) => {
    const messaggioRicevuto = req.body.messaggio;

    if (!messaggioRicevuto) {
        return res.status(400).json({ status: 'errore', motivo: 'Messaggio vuoto' });
    }

    console.log("--> NUOVO COMANDO RICEVUTO DAL WEB: " + messaggioRicevuto);
    
    // Aggiorniamo la variabile (servirà dopo per la scheda ESP)
    ultimoComando = messaggioRicevuto;

    // Rispondiamo al sito web che è andato tutto bene
    res.json({ 
        status: 'ricevuto', 
        comando: messaggioRicevuto 
    });
});

// 2. ROTTA GET: (Opzionale per ora) Per controllare se il server è vivo
app.get('/', (req, res) => {
    res.send('Il server dei comandi è attivo! Ultimo comando in memoria: ' + ultimoComando);
});

// Avvio del server
app.listen(PORT, () => {
    console.log(`Server avviato sulla porta ${PORT}`);
});
