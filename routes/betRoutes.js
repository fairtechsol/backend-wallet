const express = require('express');
const router = express.Router();
const { deleteMultipleBet, getSessionProfitLoss, changeBetsDeleteReason } = require('../controllers/bettingController.js');

const validator = require('../middleware/joi.validator');
const { isAuthenticate, checkPermanentDeletePassword } = require('../middleware/auth');
const { deleteMultipleBetValidator, changeBetsDeleteReasonValidator, deleteMultipleBetPermanentValidator } = require('../validators/betttingValidtor.js');
const { setDeleteBody } = require('../middleware/setDeleteBody.js');


router.post('/deleteMultipleBet', isAuthenticate, validator(deleteMultipleBetValidator), deleteMultipleBet);

router.post('/deleteMultipleBet/permanent', isAuthenticate, validator(deleteMultipleBetPermanentValidator), checkPermanentDeletePassword, setDeleteBody, deleteMultipleBet);

router.post('/change/deleteReason', isAuthenticate, validator(changeBetsDeleteReasonValidator), changeBetsDeleteReason);
router.get('/session/profitLoss/:betId', isAuthenticate, getSessionProfitLoss);

module.exports = router;