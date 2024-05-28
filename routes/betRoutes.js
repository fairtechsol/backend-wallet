const express = require('express');
const router = express.Router();
const { deleteMultipleBet, getSessionProfitLoss,deleteMultipleBetForOther, deleteMultipleBetForRace } = require('../controllers/bettingController.js');

const validator = require('../middleware/joi.validator');
const { isAuthenticate } = require('../middleware/auth');
const { deleteMultipleBetValidator } = require('../validators/betttingValidtor.js');


router.post('/deleteMultipleBet', isAuthenticate, validator(deleteMultipleBetValidator), deleteMultipleBet);
router.post('/deleteMultipleBetForOther', isAuthenticate, validator(deleteMultipleBetValidator), deleteMultipleBetForOther);
router.post('/deleteMultipleBetForRace', isAuthenticate, validator(deleteMultipleBetValidator), deleteMultipleBetForRace);
router.get('/session/profitLoss/:betId', isAuthenticate, getSessionProfitLoss);

module.exports = router;