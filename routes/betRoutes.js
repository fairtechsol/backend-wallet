const express = require('express');
const router = express.Router();
const { deleteMultipleBet, getSessionProfitLoss,deleteMultipleBetForOther } = require('../controllers/bettingController.js');

const validator = require('../middleware/joi.validator');
const { isAuthenticate } = require('../middleware/auth');
const { deleteMultipleBetValidator } = require('../validators/betttingValidtor.js');


router.post('/deleteMultipleBet', isAuthenticate, validator(deleteMultipleBetValidator), deleteMultipleBet)
router.post('/deleteMultipleBetForOther', isAuthenticate, validator(deleteMultipleBetValidator), deleteMultipleBetForOther)
router.get('/session/profitLoss/:betId', isAuthenticate, getSessionProfitLoss);

module.exports = router;