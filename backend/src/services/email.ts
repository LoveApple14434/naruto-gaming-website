import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.qq.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.MAIL_ADDRESS,
    pass: process.env.MAIL_AUTH_CODE,
  },
});

/**
 * 发送验证码到指定邮箱
 * @param to 收件人邮箱地址
 * @param code 验证码
 */
export async function sendVerificationCode(to: string, code: string): Promise<void> {
  const mailFrom = process.env.MAIL_ADDRESS ?? 'no-reply@example.com';
  await transporter.sendMail({
    from: `"火影竞猜" <${mailFrom}>`,
    to,
    subject: '【火影竞猜】南京大学学生身份验证',
    html: `
      <div style="max-width:480px;margin:0 auto;padding:24px;font-family:sans-serif;">
        <h2 style="color:#f59e0b;">南京大学学生身份验证</h2>
        <p>你好，</p>
        <p>你正在进行南京大学学生身份验证，请使用以下验证码完成操作：</p>
        <div style="margin:24px 0;text-align:center;">
          <span style="font-size:32px;letter-spacing:6px;font-weight:bold;color:#f59e0b;">${code}</span>
        </div>
        <p style="color:#999;font-size:13px;">验证码有效期为 10 分钟，请勿泄露给他人。</p>
        <p style="color:#999;font-size:13px;">如果你没有进行此操作，请忽略这封邮件。</p>
      </div>
    `,
  });
}
