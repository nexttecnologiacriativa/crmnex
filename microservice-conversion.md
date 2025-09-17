# Microserviço de Conversão de Áudio WebM → OGG/Opus

## Opção 1: Vercel + Node.js + FFmpeg

### 1. Criar projeto no Vercel
```bash
npm init -y
npm install @vercel/node express multer fluent-ffmpeg
npm install -D @types/node @types/express @types/multer
```

### 2. Arquivo `api/convert-audio.js`:
```javascript
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

// Configure multer for file uploads
const upload = multer({ 
  dest: '/tmp/',
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse multipart form data
    upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: 'Upload error: ' + err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No audio file provided' });
      }

      const inputPath = req.file.path;
      const outputPath = `/tmp/output_${Date.now()}.ogg`;

      try {
        // Convert webm to ogg with opus codec
        await new Promise((resolve, reject) => {
          ffmpeg(inputPath)
            .audioCodec('libopus')
            .audioBitrate('64k')
            .audioChannels(1)
            .format('ogg')
            .on('end', resolve)
            .on('error', reject)
            .save(outputPath);
        });

        // Read converted file and return as base64
        const convertedBuffer = fs.readFileSync(outputPath);
        const base64Audio = convertedBuffer.toString('base64');

        // Cleanup files
        fs.unlinkSync(inputPath);
        fs.unlinkSync(outputPath);

        res.json({
          success: true,
          audioData: base64Audio,
          mimeType: 'audio/ogg; codecs=opus',
          size: convertedBuffer.length
        });

      } catch (conversionError) {
        // Cleanup input file
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        
        res.status(500).json({ 
          error: 'Conversion failed', 
          details: conversionError.message 
        });
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Server error: ' + error.message });
  }
}
```

### 3. Arquivo `vercel.json`:
```json
{
  "functions": {
    "api/convert-audio.js": {
      "maxDuration": 30
    }
  }
}
```

## Opção 2: Railway + Dockerfile + FFmpeg

### 1. Arquivo `Dockerfile`:
```dockerfile
FROM node:18-alpine

RUN apk add --no-cache ffmpeg

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
```

### 2. Arquivo `server.js`:
```javascript
const express = require('express');
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const cors = require('cors');

const app = express();
app.use(cors());

const upload = multer({ dest: '/tmp/' });

app.post('/convert-audio', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const inputPath = req.file.path;
  const outputPath = `/tmp/output_${Date.now()}.ogg`;

  ffmpeg(inputPath)
    .audioCodec('libopus')
    .audioBitrate('64k')
    .audioChannels(1)
    .format('ogg')
    .on('end', () => {
      const convertedBuffer = fs.readFileSync(outputPath);
      const base64Audio = convertedBuffer.toString('base64');
      
      // Cleanup
      fs.unlinkSync(inputPath);
      fs.unlinkSync(outputPath);
      
      res.json({
        success: true,
        audioData: base64Audio,
        mimeType: 'audio/ogg; codecs=opus',
        size: convertedBuffer.length
      });
    })
    .on('error', (err) => {
      fs.unlinkSync(inputPath);
      res.status(500).json({ error: 'Conversion failed', details: err.message });
    })
    .save(outputPath);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Audio conversion service running on port ${PORT}`);
});
```

## Como Integrar

1. **Deploy o microserviço** em Vercel ou Railway
2. **Obtenha a URL** do serviço (ex: `https://audio-converter.vercel.app`)
3. **Atualize a edge function** para usar o serviço externo

Qual opção você prefere? Posso criar e configurar qualquer uma delas.