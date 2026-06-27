import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { summarizeText, summarizeAudio } from './services/gemini';
import { sendScrumEmail } from './services/mail';

// Load environment variables from the backend directory explicitly
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for frontend requests
app.use(cors({
  origin: true,
  credentials: true
}));

// Parse JSON body requests
app.use(express.json());

// Setup Multer for audio files (stored in memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024 // Limit audio file size to 20MB
  }
});

// Endpoint 1: Summarize Text Minutes
app.post('/api/summarize', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: '회의록 텍스트(text)가 유효하지 않습니다.' });
      return;
    }

    const summaryResult = await summarizeText(text);
    res.json(summaryResult);
  } catch (error: any) {
    console.error('[API Error - Summarize Text]:', error);
    res.status(500).json({ error: error.message || '텍스트 요약 도출 도중 서버 에러가 발생했습니다.' });
  }
});

// Endpoint 2: Summarize Audio File
app.post('/api/summarize-audio', upload.single('audio'), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: '업로드된 오디오 파일이 없거나 필드명이 "audio"가 아닙니다.' });
      return;
    }

    // Supported mime types check (basic validation)
    const allowedMimeTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/x-m4a', 'audio/ogg', 'audio/webm'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      console.warn(`[Multer] Uploaded file mimetype: ${file.mimetype}. Proceeding anyway.`);
    }

    const summaryResult = await summarizeAudio(file.buffer, file.mimetype);
    res.json(summaryResult);
  } catch (error: any) {
    console.error('[API Error - Summarize Audio]:', error);
    res.status(500).json({ error: error.message || '오디오 요약 도출 도중 서버 에러가 발생했습니다.' });
  }
});

// Endpoint 3: Email Distribution
app.post('/api/send-email', async (req, res) => {
  try {
    const { summary, action_items, emails } = req.body;

    if (!summary || typeof summary !== 'string') {
      res.status(400).json({ error: '회의 요약 내용이 존재하지 않습니다.' });
      return;
    }
    if (!action_items || !Array.isArray(action_items)) {
      res.status(400).json({ error: '액션 아이템 목록이 유효하지 않습니다.' });
      return;
    }
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      res.status(400).json({ error: '수신자 이메일 목록이 비어있습니다.' });
      return;
    }

    const result = await sendScrumEmail(summary, action_items, emails);
    res.json(result);
  } catch (error: any) {
    console.error('[API Error - Send Email]:', error);
    res.status(500).json({ error: error.message || '이메일 발송 도중 서버 에러가 발생했습니다.' });
  }
});

// Start express server
app.listen(port, () => {
  console.log(`[Express Backend] Server running at http://localhost:${port}`);
  console.log(`[Express Backend] Ready to accept request from http://localhost:5173`);
});
