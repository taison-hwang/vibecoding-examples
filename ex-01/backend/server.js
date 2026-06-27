require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { generateScrumSummary, generateScrumSummaryFromAudio } = require("./utils/gemini");
const { sendScrumEmail } = require("./utils/email");

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS
app.use(cors());

// Parse JSON request bodies (increased limit for audio payloads)
app.use(express.json({ limit: "15mb" }));

// Summary Generation Endpoint
app.post("/api/summarize", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "회의록 텍스트를 입력해 주세요." });
    }

    const summary = await generateScrumSummary(text);
    res.json({ summary });
  } catch (error) {
    console.error("Summary error:", error);
    res.status(500).json({ error: error.message || "회의록 요약 도중 에러가 발생했습니다." });
  }
});

// Audio Summary Generation Endpoint
app.post("/api/summarize-audio", async (req, res) => {
  try {
    const { audio, mimeType } = req.body;
    if (!audio || !mimeType) {
      return res.status(400).json({ error: "오디오 데이터가 누락되었습니다." });
    }

    const summary = await generateScrumSummaryFromAudio(audio, mimeType);
    res.json({ summary });
  } catch (error) {
    console.error("Audio summary error:", error);
    res.status(500).json({ error: error.message || "오디오 요약 도중 에러가 발생했습니다." });
  }
});

// Email Sending Endpoint
app.post("/api/send-email", async (req, res) => {
  try {
    const { summary, emails } = req.body;
    
    if (!summary || summary.trim() === "") {
      return res.status(400).json({ error: "메일로 발송할 요약 내용이 없습니다." });
    }
    
    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ error: "수신자 이메일 주소를 입력해 주세요." });
    }

    // Validate emails array
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = emails.filter(email => !emailRegex.test(email.trim()));
    if (invalidEmails.length > 0) {
      return res.status(400).json({ 
        error: `올바르지 않은 이메일 형식이 포함되어 있습니다: ${invalidEmails.join(", ")}` 
      });
    }

    await sendScrumEmail(summary, emails.map(e => e.trim()));
    res.json({ success: true, message: "이메일이 성공적으로 전송되었습니다." });
  } catch (error) {
    console.error("Email send error:", error);
    res.status(500).json({ error: error.message || "이메일 발송 도중 에러가 발생했습니다." });
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "서버 내부 오류가 발생했습니다." });
});

app.listen(PORT, () => {
  console.log(`BFF Server is running on port ${PORT}`);
});
