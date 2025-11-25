const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurazione API Google (Gemini TTS)
const GOOGLE_API_KEY = "AIzaSyAwolKBmgcWB3ZnXgdKw4l3URu8XlnZ4i0";
// Nuovo endpoint per Gemini TTS (generative language API)
const GEMINI_TTS_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${GOOGLE_API_KEY}`;

// Variabili di memoria globale
let ultimoAudioBase64 = null; 
let ultimoTestoGenerato = "";

// Middleware
app.use(cors());
app.use(express.json());

// --- LOGGING DI AVVIO ---
console.log("--- SERVER AVVIATO ---");
console.log(`Porta: ${PORT}`);
console.log("Pronto a ricevere comandi e generare audio con Gemini TTS.");

// 1. ROTTA POST: Riceve il testo, chiama Gemini TTS, salva l'audio in memoria
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
        // STEP 2: Preparazione chiamata a Gemini TTS
        console.log("[STEP 2] Sto contattando Gemini TTS per generare l'audio...");

        const payload = {
            contents: [{
                parts: [{ text: messaggioRicevuto }]
            }],
            generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                    voiceConfig: {
                        // Scegliamo una voce italiana predefinita, ad esempio "Kore" o lasciamo il default
                        prebuiltVoiceConfig: { voiceName: "Kore" } 
                    }
                }
            }
        };

        const geminiResponse = await axios.post(GEMINI_TTS_URL, payload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        // STEP 3: Ricezione e salvataggio in RAM
        console.log("[STEP 3] Risposta ricevuta da Gemini! Salvataggio audio in memoria RAM...");
        
        const candidate = geminiResponse.data.candidates?.[0];
        const audioPart = candidate?.content?.parts?.find(p => p.inlineData && p.inlineData.mimeType.startsWith('audio/'));

        if (audioPart && audioPart.inlineData.data) {
            // Salviamo la stringa Base64 (che ora è PCM16) direttamente in memoria
            ultimoAudioBase64 = audioPart.inlineData.data; 

            // STEP 4: Conferma operazione
            console.log(`[STEP 4] SUCCESSO! Contenuto audio (${ultimoAudioBase64.length} caratteri, PCM16) salvato in memoria.`);

            // Risposta al client (pagina web)
            res.json({ 
                status: 'successo', 
                messaggio: 'Comando ricevuto e audio salvato in memoria', 
                testo: messaggioRicevuto
            });

        } else {
            throw new Error("Nessun contenuto audio valido nella risposta di Gemini");
        }

    } catch (error) {
        console.error("[ERRORE STEP 3/4] Qualcosa è andato storto con Gemini:");
        // Stampiamo i dettagli della risposta per debug
        console.error("Dettagli API:", error.response ? error.response.data : error.message);
        
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
