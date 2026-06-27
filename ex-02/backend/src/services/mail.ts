import nodemailer from 'nodemailer';
import { ActionItem } from '../types';

function generateEmailHtml(summary: string, actionItems: ActionItem[]): string {
  const itemsHtml = actionItems.map(item => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: #1e293b;">${item.owner}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #334155;">${item.task}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #64748b;">${item.due}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>AI 스크럼 회의록 요약 및 액션 아이템</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0; }
        .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 30px 20px; text-align: center; color: #ffffff; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
        .header p { margin: 5px 0 0 0; font-size: 14px; opacity: 0.9; }
        .content { padding: 30px 20px; }
        .section-title { font-size: 16px; font-weight: 700; color: #1e3a8a; margin-top: 0; margin-bottom: 12px; border-bottom: 2px solid #3b82f6; padding-bottom: 6px; display: inline-block; }
        .summary-box { background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; border-radius: 0 8px 8px 0; margin-bottom: 25px; line-height: 1.6; color: #1e293b; font-size: 15px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th { background-color: #f1f5f9; text-align: left; padding: 12px; font-size: 13px; font-weight: 600; color: #475569; border-bottom: 2px solid #cbd5e1; }
        .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📝 AI 스크럼 회의록 요약</h1>
          <p>Scrum Minutes & Action Items</p>
        </div>
        <div class="content">
          <div class="section-title">📌 회의 요약 개요</div>
          <div class="summary-box">
            ${summary.replace(/\n/g, '<br>')}
          </div>
          
          <div class="section-title">⚡ 액션 아이템 (Action Items)</div>
          <table>
            <thead>
              <tr>
                <th style="width: 25%;">담당자</th>
                <th style="width: 55%;">업무 내용</th>
                <th style="width: 20%;">기한</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>
        <div class="footer">
          본 메일은 AI Scrum Minutes Minimizer를 통해 자동 발송되었습니다.
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function sendScrumEmail(
  summary: string,
  actionItems: ActionItem[],
  emails: string[]
): Promise<{ success: boolean; isMock: boolean; message?: string }> {
  if (emails.length === 0) {
    throw new Error('이메일을 발송할 수신자 목록이 비어있습니다.');
  }

  const htmlContent = generateEmailHtml(summary, actionItems);

  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_FROM || 'scrum-minimizer@example.com';

  // Check if SMTP is fully configured
  const isSmtpConfigured = smtpHost && smtpPort && smtpUser && smtpPass && smtpUser.trim() !== '' && smtpPass.trim() !== '';

  if (!isSmtpConfigured) {
    console.log('\n================== [MOCK EMAIL OUTBOX] ==================');
    console.log(`From: ${smtpFrom}`);
    console.log(`To: ${emails.join(', ')}`);
    console.log('Subject: 📝 AI 스크럼 회의록 요약 및 액션 아이템');
    console.log('---------------------------------------------------------');
    console.log('HTML Body (Styled Summary & Action Table logged to console)');
    console.log(htmlContent);
    console.log('=========================================================\n');
    
    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    return {
      success: true,
      isMock: true,
      message: 'SMTP 설정이 누락되어 콘솔에 가상 발송 로그를 출력했습니다.'
    };
  }

  // Real SMTP transport
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: parseInt(smtpPort || '587'),
    secure: smtpPort === '465', // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });

  const mailOptions = {
    from: smtpFrom,
    to: emails.join(', '),
    subject: '📝 AI 스크럼 회의록 요약 및 액션 아이템',
    html: htmlContent
  };

  await transporter.sendMail(mailOptions);
  return {
    success: true,
    isMock: false
  };
}
