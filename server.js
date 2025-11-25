const express = require('express');
const cors = require('cors');
const axios = require('axios'); // Libreria per fare richieste HTTP a Google

const app = express();
const PORT = process.env.PORT || 3000;

// Configurazione API Google
const GOOGLE_API_KEY = "AIzaSyAwolKBmgcWB3ZnXgdKw4l3URu8XlnZ4i0";
const GOOGLE_TTS_URL = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${GOOGLE_API_KEY}`;

// Variabili di memoria globale
let ultimoComando = "";
// Salveremo il contenuto audio in Base64 direttamente qui, in memoria RAM
let ultimoAudioBase64 = null; 
let ultimoTestoGenerato = "";

// Middleware
app.use(cors());
app.use(express.json());

// --- LOGGING DI AVVIO ---
console.log("--- SERVER AVVIATO ---");
console.log(`Porta: ${PORT}`);
console.log("Pronto a ricevere comandi e generare audio. (Nessun salvataggio su disco)");

// 1. ROTTA POST: Riceve il testo, chiama Google, salva l'audio in memoria
// Indirizzo: https://ricevi-dati-da-arduino-e-invia.onrender.com/api/comando
app.post('/api/comando', async (req, res) => {
    const messaggioRicevuto = req.body.messaggio;

    // STEP 1: Log ricezione dalla pagina HTML
    console.log("\n[STEP 1] Ricevuto comando dalla pagina HTML: " + messaggioRicevuto);

    if (!messaggioRicevuto) {
        console.error("[ERRORE] Il messaggio è vuoto!");
        return res.status(400).json({ status: 'errore', motivo: 'Messaggio vuoto' });
    }

    ultimoTestoGenerato = messaggioRicevuto;

    try {
        // STEP 2: Preparazione chiamata a Google TTS (Text-to-Speech)
        console.log("[STEP 2] Sto contattando Google per generare l'audio...");

        const requestBody = {
            input: { text: messaggioRicevuto },
            // Utilizzo di una voce italiana neurale (MP3)
            voice: { languageCode: "it-IT", name: "it-IT-Neural2-A" }, 
            audioConfig: { audioEncoding: "MP3" }
        };

        const googleResponse = await axios.post(GOOGLE_TTS_URL, requestBody);

        // STEP 3: Ricezione e salvataggio in RAM
        console.log("[STEP 3] Risposta ricevuta da Google! Salvataggio audio in memoria RAM...");

        if (googleResponse.data && googleResponse.data.audioContent) {
            // Salviamo la stringa Base64 direttamente in memoria
            ultimoAudioBase64 = googleResponse.data.audioContent; 

            // STEP 4: Conferma operazione
            console.log(`[STEP 4] SUCCESSO! Contenuto audio (${ultimoAudioBase64.length} caratteri) salvato in memoria.`);

            // Risposta al client (pagina web)
            res.json({ 
                status: 'successo', 
                messaggio: 'Comando ricevuto e audio salvato in memoria (non su disco)', 
                testo: messaggioRicevuto
            });

        } else {
            throw new Error("Nessun contenuto audio nella risposta di Google");
        }

    } catch (error) {
        console.error("[ERRORE STEP 3/4] Qualcosa è andato storto con Google:");
        console.error(error.response ? error.response.data : error.message);
        
        res.status(500).json({ 
            status: 'errore_audio', 
            motivo: 'Fallimento generazione audio'
        });
    }
});

// 2. ROTTA GET: PER LA NODEMCU (Recupera l'ultimo audio Base64)
// Indirizzo: https://ricevi-dati-da-arduino-e-invia.onrender.com/api/get_audio
app.get('/api/get_audio', (req, res) => {
    console.log(`[GET] Richiesta audio ricevuta. Invio ${ultimoAudioBase64 ? 'audio in Base64' : 'NIENTE'}...`);

    if (ultimoAudioBase64) {
        res.json({
            status: 'disponibile',
            testo: ultimoTestoGenerato,
            audioBase64: ultimoAudioBase64 // Il dato che la NodeMCU dovrà scaricare
        });
    } else {
        res.status(404).json({
            status: 'nessun_audio',
            messaggio: 'Nessun comando inviato di recente per generare un audio.'
        });
    }
});

// Avvio del server
app.listen(PORT, () => {
    console.log(`Server in ascolto sulla porta ${PORT}`);
});
