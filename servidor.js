const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(cors());
app.use(express.json({ limit: '20mb' }));
 
app.post('/avaliar', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY nao configurada' });
  const { messages } = req.body;
  if (!messages) return res.status(400).json({ error: 'messages ausente' });
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5', max_tokens: 4000, messages: messages })
    });
    if (!response.ok) { const err = await response.text(); return res.status(response.status).json({ error: 'API error: ' + err }); }
    const data = await response.json();
    const rawText = data.content.map(i => i.text || '').join('');
 
    // tenta achar o JSON na resposta
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'JSON nao encontrado', raw: rawText.slice(0, 500) });
 
    // limpa caracteres de controle que quebram o parser
    let cleaned = match[0].replace(/[\u0000-\u001F\u007F]/g, c => {
      if (c === '\n' || c === '\r' || c === '\t') return ' ';
      return '';
    });
 
    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (e1) {
      // segunda tentativa: tenta extrair só o primeiro objeto JSON válido balanceando chaves
      try {
        let depth = 0, end = -1, inString = false, esc = false;
        for (let i = 0; i < cleaned.length; i++) {
          const ch = cleaned[i];
          if (esc) { esc = false; continue; }
          if (ch === '\\') { esc = true; continue; }
          if (ch === '"') inString = !inString;
          if (inString) continue;
          if (ch === '{') depth++;
          if (ch === '}') { depth--; if (depth === 0) { end = i; break; } }
        }
        if (end > 0) parsed = JSON.parse(cleaned.slice(0, end + 1));
        else throw e1;
      } catch (e2) {
        return res.status(500).json({ error: 'Erro ao ler resposta da IA: ' + e1.message, raw: rawText.slice(0, 800) });
      }
    }
    res.json(parsed);
  } catch (e) { res.status(500).json({ error: 'Erro: ' + e.message }); }
});
 
app.get('/', (req, res) => res.json({ status: 'API LSP online' }));
app.listen(PORT, () => console.log('Porta ' + PORT));
