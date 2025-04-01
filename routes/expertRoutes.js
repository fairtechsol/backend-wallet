const express = require('express');
const router = express.Router();

const validator = require('../middleware/joi.validator')

const { isAuthenticate, checkTransactionPassword } = require('../middleware/auth');
const { CreateExpertValidate, UpdateExpertValidate, changePasswordExpertValidate } = require('../validators/expertValidator');
const { createUser, updateUser, changePassword, expertList, getNotification, getMatchCompetitionsByType, getMatchDatesByCompetitionId, getMatchDatesByCompetitionIdAndDate, getWalletBetsData, lockUnlockExpert, declareCardMatchResult, declareFinalMatchResult, unDeclareFinalMatchResult } = require('../controllers/expertController');
const { getPlacedBets } = require('../controllers/superAdminController');
const apiLimiter = require('../middleware/casinoApiHitLimiter');
const { expertToWalletAuth } = require('../middleware/expertAsWallet');
const { getUserWiseSessionBetProfitLossExpert, getResultBetProfitLoss } = require('../controllers/userController');

router.post('/add', isAuthenticate, checkTransactionPassword, validator(CreateExpertValidate), createUser);
router.post('/update', isAuthenticate, checkTransactionPassword, validator(UpdateExpertValidate), updateUser);
router.post('/password', isAuthenticate, checkTransactionPassword, validator(changePasswordExpertValidate), changePassword);
router.get('/list', isAuthenticate, expertList);
router.get("/notification", isAuthenticate, getNotification);

router.post("/declare/result/final/match", declareFinalMatchResult);
router.post("/unDeclare/result/final/match", unDeclareFinalMatchResult);

router.post("/declare/result/card/match", apiLimiter, declareCardMatchResult);

router.get('/match/competitionList/:type',isAuthenticate,getMatchCompetitionsByType);
router.get('/match/competition/dates/:competitionId',isAuthenticate,getMatchDatesByCompetitionId);
router.get('/match/competition/getMatch/:competitionId/:date',isAuthenticate,getMatchDatesByCompetitionIdAndDate);
router.get("/bets", expertToWalletAuth, getPlacedBets);
router.get("/login/bet/data", getWalletBetsData);
router.post("/lockUnlockExpert", isAuthenticate, lockUnlockExpert)
router.post("/userwise/session/profitLoss/expert", getUserWiseSessionBetProfitLossExpert);
router.get("/total/bet/profitLoss", getResultBetProfitLoss);


module.exports = router;
