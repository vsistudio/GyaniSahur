// server.js
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and parse large JSON payloads (for base64 image uploads)
app.use(cors());
app.use(express.json({ limit: '15mb' }));

// 🔑 REPLACE THESE WITH YOUR ACTUAL GROQ API KEYS
const GROQ_PRIMARY_KEY = process.env.GROQ_PRIMARY_KEY || "PASTE_YOUR_PRIMARY_GROQ_API_KEY_HERE";
const GROQ_SECONDARY_KEY = process.env.GROQ_SECONDARY_KEY || "PASTE_YOUR_SECONDARY_GROQ_API_KEY_HERE";

// API Endpoint proxying calls to Groq AI
app.post('/api/chat', async (req, res) => {
  const { mode, ...groqPayload } = req.body;

  // Use secondary key for Nightmare mode if provided, otherwise fallback to primary key
  const apiKey = (mode === 'nightmare' && GROQ_SECONDARY_KEY && !GROQ_SECONDARY_KEY.includes('PASTE_'))
    ? GROQ_SECONDARY_KEY 
    : GROQ_PRIMARY_KEY;

  if (!apiKey || apiKey.includes('PASTE_')) {
    return res.status(400).json({ error: { message: "Server API Key is missing. Please configure GROQ_PRIMARY_KEY in server.js." } });
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(groqPayload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return res.status(response.status).json(errorData);
    }

    // Handle Streaming Response (for Chat)
    if (groqPayload.stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      return res.end();
    } 
    
    // Handle JSON Response (for Memory Evaluation / Single calls)
    const data = await response.json();
    return res.json(data);

  } catch (error) {
    console.error("Server execution error:", error);
    return res.status(500).json({ error: { message: "Internal server error connecting to Groq." } });
  }
});

// Serve static web app files (index.html)
app.use(express.static(__dirname));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Gyani Sahur AI Server is running securely on http://localhost:${PORT}`);
});

