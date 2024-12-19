const express = require('express');
const router = express.Router();
const { deleteMultipleBet, getSessionProfitLoss, deleteMultipleBetForOther, deleteMultipleBetForRace, changeBetsDeleteReason } = require('../controllers/bettingController.js');

const validator = require('../middleware/joi.validator');
const { isAuthenticate } = require('../middleware/auth');
const { deleteMultipleBetValidator, changeBetsDeleteReasonValidator, deleteMultipleBetPermanentValidator } = require('../validators/betttingValidtor.js');
const { setDeleteBody } = require('../middleware/setDeleteBody.js');


router.post('/deleteMultipleBet', isAuthenticate, validator(deleteMultipleBetValidator), deleteMultipleBet);
router.post('/deleteMultipleBetForOther', isAuthenticate, validator(deleteMultipleBetValidator), deleteMultipleBetForOther);
router.post('/deleteMultipleBetForRace', isAuthenticate, validator(deleteMultipleBetValidator), deleteMultipleBetForRace);

router.post('/deleteMultipleBet/permanent', isAuthenticate, validator(deleteMultipleBetPermanentValidator), setDeleteBody, deleteMultipleBet);
router.post('/deleteMultipleBetForOther/permanent', isAuthenticate, validator(deleteMultipleBetPermanentValidator), setDeleteBody, deleteMultipleBetForOther);
router.post('/deleteMultipleBetForRace/permanent', isAuthenticate, validator(deleteMultipleBetPermanentValidator), setDeleteBody, deleteMultipleBetForRace);

router.post('/change/deleteReason', isAuthenticate, validator(changeBetsDeleteReasonValidator), changeBetsDeleteReason);
router.get('/session/profitLoss/:betId', isAuthenticate, getSessionProfitLoss);

module.exports = router;