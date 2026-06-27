const nodemailer = require("nodemailer");

/**
 * Converts basic markdown formatting (headers, lists, bold) to structured HTML for email clients.
 * @param {string} markdown 
 * @returns {string} Styled HTML
 */
function convertMarkdownToHtml(markdown) {
  // Simple markdown parser for the expected scrum layout
  let html = markdown
    .replace(/### 📌 (.+)/g, '<h2 style="color: #4f46e5; font-size: 1.2rem; font-weight: 700; margin-top: 24px; margin-bottom: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">📌 $1</h2>')
    .replace(/### 🎬 (.+)/g, '<h2 style="color: #4f46e5; font-size: 1.2rem; font-weight: 700; margin-top: 24px; margin-bottom: 12px; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">🎬 $1</h2>')
    .replace(/- \*\*(.+?)\*\*:(.+)/g, '<li style="margin-bottom: 8px; line-height: 1.6;"><strong style="color: #1e293b;">$1</strong>:$2</li>')
    .replace(/- (.+)/g, '<li style="margin-bottom: 8px; line-height: 1.6;">$1</li>');

  // Wrap lists in styled <ul>
  html = html.replace(/(<li style=".*?">.*?<\/li>\s*)+/g, (match) => {
    return `<ul style="padding-left: 20px; color: #334155; margin-bottom: 16px;">${match}</ul>`;
  });

  // Replace remaining text paragraphs
  html = html.split('\n').filter(line => line.trim() !== '').map(line => {
    if (!line.startsWith('<ul') && !line.startsWith('<li') && !line.startsWith('<h2') && !line.startsWith('</ul')) {
      return `<p style="color: #334155; line-height: 1.6; margin-bottom: 12px;">${line}</p>`;
    }
    return line;
  }).join('\n');

  // Full email shell
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>스크럼 회의 요약 공유</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
          <td align="center" style="padding: 40px 10px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); overflow: hidden;">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 32px; text-align: center;">
                  <h1 style="color: #ffffff; font-size: 1.5rem; font-weight: 700; margin: 0; letter-spacing: -0.025em;">Scrum Summary</h1>
                  <p style="color: #c7d2fe; font-size: 0.875rem; margin: 8px 0 0 0;">AI 기반 스크럼 회의 요약 및 액션 아이템</p>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 32px; background-color: #ffffff;">
                  ${html}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #f1f5f9;">
                  <p style="color: #64748b; font-size: 0.75rem; margin: 0;">본 메일은 VibeCode AI Scrum Summarizer에 의해 자동으로 발송되었습니다.</p>
                  <p style="color: #94a3b8; font-size: 0.75rem; margin: 4px 0 0 0;">© 2026 VibeCode. All rights reserved.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Sends scrum summary email to the specified list of recipients.
 * @param {string} summary Markdown content
 * @param {string[]} recipients Array of email addresses
 * @returns {Promise<any>} Transporter send result
 */
async function sendScrumEmail(summary, recipients) {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASS;

  if (!user || !pass) {
    throw new Error("GMAIL_USER 또는 GMAIL_APP_PASS가 .env 파일에 설정되어 있지 않습니다.");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: user,
      pass: pass
    }
  });

  // Format today's date in YYYY-MM-DD
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  const subject = `[스크럼 요약] ${dateStr} 회의 공유`;
  const htmlBody = convertMarkdownToHtml(summary);

  const mailOptions = {
    from: `"AI Scrum Summarizer" <${user}>`,
    to: recipients.join(", "),
    subject: subject,
    text: summary, // plain text fallback
    html: htmlBody // formatted HTML
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendScrumEmail, convertMarkdownToHtml };
