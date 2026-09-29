const nodemailer = require('nodemailer');

let transporter;
function getTransport() {
  if (transporter) return transporter;
  if (process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: String(process.env.SMTP_SECURE || 'false') === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  } else {
    // Sem SMTP configurado: escreve o e-mail no log em vez de enviar.
    transporter = nodemailer.createTransport({ jsonTransport: true });
  }
  return transporter;
}

async function sendMail({ to, subject, html, text }) {
  const from = process.env.MAIL_FROM || 'PixelPro OS <no-reply@pixelpro.local>';
  const info = await getTransport().sendMail({ from, to, subject, html, text });
  if (info.message) {
    // jsonTransport: registra no console pra você ver em dev.
    console.log('[email:dev]', subject, '->', to);
  }
  return info;
}

function approvalRequestEmail({ clientName, postTitle, portalUrl }) {
  return {
    subject: `Aprovacao pendente, ${clientName}: ${postTitle}`,
    text: `Ola. Voce tem um conteudo aguardando aprovacao no portal PixelPro.\n\nTitulo: ${postTitle}\n\nAcesse: ${portalUrl}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px">
      <h2 style="color:#7c6cff">Voce tem um conteudo pra aprovar</h2>
      <p>Ola, o time da PixelPro enviou um conteudo de <b>${clientName}</b> pra sua aprovacao.</p>
      <p style="font-size:15px"><b>${postTitle}</b></p>
      <p><a href="${portalUrl}" style="display:inline-block;background:#7c6cff;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:600">Abrir no portal</a></p>
      <p style="color:#888;font-size:12px">PixelPro OS</p>
    </div>`,
  };
}

module.exports = { sendMail, approvalRequestEmail };
