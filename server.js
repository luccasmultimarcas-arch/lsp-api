const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/avaliar', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY nao configurada' });

  const { messages } = req.body;
  if (!messages) return res.status(400).json({ error: 'messages ausente' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 2000,
        messages: messages
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: 'API error: ' + err });
    }

    const data = await response.json();
    const rawText = data.content.map(i => i.text || '').join('');
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) return res.status(500).json({ error: 'JSON nao encontrado na resposta' });

    const parsed = JSON.parse(match[0]);
    res.json(parsed);

  } catch (e) {
    res.status(500).json({ error: 'Erro: ' + e.message });
  }
});

app.get('/', (req, res) => res.json({ status: 'LSP API online' }));

app.listen(PORT, () => console.log('Servidor rodando na porta ' + PORT));
