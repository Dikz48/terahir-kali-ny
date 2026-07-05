const express = require('express');
const router = express.Router();
const { SupportMessage } = require('../database');

router.get('/', (req, res) => {
  res.json({
    discord: 'https://discord.gg/3XDDvZfw',
    telegram: 'https://t.me/Handikz26',
    github: 'https://github.com/Dikz48',
    email: 'handikads208@gmail.com'
  });
});

router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, error: 'Nama, email, dan pesan wajib diisi' });
    }

    await SupportMessage.create({ name, email, subject: subject || '', message });

    res.json({ success: true, message: 'Support request berhasil dikirim' });
  } catch (error) {
    console.error('Support submit error:', error);
    res.status(500).json({ success: false, error: error.message || 'Gagal mengirim support request' });
  }
});

module.exports = router;