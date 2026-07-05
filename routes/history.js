const express = require('express');
const router = express.Router();
const historyController = require('../controllers/historyController');

router.get('/', historyController.getHistory);
router.get('/search', historyController.searchChat);
router.get('/export/:id', historyController.exportChat);
router.post('/import', historyController.importChat);
router.get('/:id', historyController.getChat);
router.post('/', historyController.createChat);
router.put('/:id', historyController.updateChat);
router.delete('/:id', historyController.deleteChat);
router.post('/:id/pin', historyController.pinChat);
router.delete('/:id/pin', historyController.unpinChat);
router.post('/:id/folder', historyController.moveToFolder);

module.exports = router;