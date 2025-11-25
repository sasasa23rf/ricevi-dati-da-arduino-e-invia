const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // Libreria per fare richieste HTTP a Google

const app = express();
const PORT = process.env.PORT || 3000;

// Configurazione API Google
// NOTA: In produzione è meglio usare le Variabili d'Ambiente di Render, ma per ora usiamo la chiave qui.
const GOOGLE_API_KEY = "AIzaSyAwolKBmgcWB3ZnXgdKw4l3URu8XlnZ4i0";
const GOOGLE_TTS_URL = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_API_KEY}`;

// Middleware
app.use(cors());
app.use(express.json());

// Variabile per salvare l'ultimo comando
let ultimoComando = "";

// --- LOGGING DI AVVIO ---
console.log("--- SERVER AVVIATO ---");
console.log(`Porta: ${PORT}`);
console.log("Pronto a ricevere comandi e generare audio.");

// 1. ROTTA POST: Riceve il testo, chiama Google, salva l'audio
app.post('/api/comando', async (req, res) => {
    const messaggioRicevuto = req.body.messaggio;

    // STEP 1: Log ricezione dalla pagina HTML
    console.log("\n[STEP 1] Ricevuto comando dalla pagina HTML: " + messaggioRicevuto);

    if (!messaggioRicevuto) {
        console.error("[ERRORE] Il messaggio è vuoto!");
        return res.status(400).json({ status: 'errore', motivo: 'Messaggio vuoto' });
    }

    ultimoComando = messaggioRicevuto;

    try {
        // STEP 2: Preparazione chiamata a Google TTS (Text-to-Speech)
        // Usiamo l'endpoint standard TTS di Google Cloud compatibile con la tua chiave.
        console.log("[STEP 2] Sto contattando Google per generare l'audio...");

        const requestBody = {
            input: { text: messaggioRicevuto },
            voice: { languageCode: "it-IT", name: "it-IT-Neural2-A" }, // Voce italiana neurale di alta qualità
            audioConfig: { audioEncoding: "MP3" }
        };

        const googleResponse = await axios.post(GOOGLE_TTS_URL, requestBody);

        // STEP 3: Ricezione risposta da Google
        console.log("[STEP 3] Risposta ricevuta da Google! Elaborazione audio...");

        if (googleResponse.data && googleResponse.data.audioContent) {
            // L'audio arriva come stringa codificata in Base64
            const audioContentBase64 = googleResponse.data.audioContent;
            
            // Decodifica e salvataggio file
            const buffer = Buffer.from(audioContentBase64, 'base64');
            const filePath = path.join(__dirname, 'audio_generato.mp3');
            
            fs.writeFileSync(filePath, buffer);

            // STEP 4: Conferma salvataggio
            console.log(`[STEP 4] SUCCESSO! File audio salvato su Render in: ${filePath}`);
            console.log(`[INFO] Dimensione file: ${buffer.length} bytes`);

            // Risposta al client (pagina web)
            res.json({ 
                status: 'successo', 
                messaggio: 'Comando ricevuto e audio generato', 
                testo: messaggioRicevuto,
                audioSaved: true
            });

        } else {
            throw new Error("Nessun contenuto audio nella risposta di Google");
        }

    } catch (error) {
        console.error("[ERRORE STEP 3/4] Qualcosa è andato storto con Google o il salvataggio:");
        console.error(error.response ? error.response.data : error.message);
        
        res.status(500).json({ 
            status: 'errore_audio', 
            motivo: 'Fallimento generazione audio',
            dettagli: error.message 
        });
    }
});

// 2. ROTTA GET: Per controllare stato e scaricare l'ultimo audio (opzionale per test)
app.get('/audio', (req, res) => {
    const filePath = path.join(__dirname, 'audio_generato.mp3');
    if (fs.existsSync(filePath)) {
        res.download(filePath);
    } else {
        res.status(404).send("Nessun file audio trovato. Invia prima un comando.");
    }
});

app.listen(PORT, () => {
    console.log(`Server in ascolto sulla porta ${PORT}`);
});
