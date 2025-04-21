const axios=require("axios");

async function notifyTelegram(message) {
    const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  
    try {
      await axios.post(url, {
        chat_id: process.env.TELEGRAM_CHAT_ID,
        text: `🚨 *ERROR ALERT*\n\n${message}`,
        parse_mode: 'Markdown',
      });
    } catch (err) {
      console.error('Failed to send message to Telegram group:', err.message);
    }
  }

exports.notifyTelegram = notifyTelegram;