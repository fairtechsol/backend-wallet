const express = require('express');
const router = express.Router();
const { deleteMultipleBet, getSessionProfitLoss,deleteMultipleBetForFootball } = require('../controllers/bettingController.js');

const validator = require('../middleware/joi.validator');
const { isAuthenticate } = require('../middleware/auth');
const { deleteMultipleBetValidator } = require('../validators/betttingValidtor.js');


router.post('/deleteMultipleBet', isAuthenticate, validator(deleteMultipleBetValidator), deleteMultipleBet)
router.post('/deleteMultipleBetForFootball', isAuthenticate, validator(deleteMultipleBetValidator), deleteMultipleBetForFootball)
router.get('/session/profitLoss/:betId', isAuthenticate, getSessionProfitLoss);

module.exports = router;