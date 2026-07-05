const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.post('/send', chatController.sendMessage);
router.post('/stop', chatController.stopGeneration);
router.get('/stream', chatController.streamMessage);
router.post('/regenerate', chatController.regenerateMessage);
router.post('/copy', chatController.copyMessage);

module.exports = router;