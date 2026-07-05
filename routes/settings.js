const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

router.get('/', settingsController.getSettings);
router.put('/', settingsController.updateSettings);
router.post('/clear-cache', settingsController.clearCache);

module.exports = router;