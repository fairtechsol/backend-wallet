const express = require('express');
const router = express.Router();

const validator = require('../middleware/joi.validator')

const { isAuthenticate, checkTransactionPassword } = require('../middleware/auth');
const { CreateExpertValidate, UpdateExpertValidate, changePasswordExpertValidate } = require('../validators/expertValidator');
const { createUser, updateUser, changePassword, expertList, getNotification, getMatchCompetitionsByType, getMatchDatesByCompetitionId, getMatchDatesByCompetitionIdAndDate, declareSessionResult, declareSessionNoResult, unDeclareSessionResult, declareMatchResult, unDeclareMatchResult, getWalletBetsData, lockUnlockExpert, declareOtherMatchResult, unDeclareOtherMatchResult, declareRacingMatchResult, unDeclareRaceMatchResult, declareCardMatchResult } = require('../controllers/expertController');
const { getPlacedBets } = require('../controllers/superAdminController');




router.post('/add',isAuthenticate,checkTransactionPassword,validator(CreateExpertValidate),createUser);
router.post('/update',isAuthenticate,checkTransactionPassword,validator(UpdateExpertValidate),updateUser);
router.post('/password',isAuthenticate,checkTransactionPassword,validator(changePasswordExpertValidate),changePassword);
router.get('/list',isAuthenticate,expertList);
router.get("/notification", isAuthenticate, getNotification);

router.post("/declare/result/session", declareSessionResult);
router.post("/declare/noResult/session", declareSessionNoResult);
router.post("/unDeclare/result/session", unDeclareSessionResult);

router.post("/declare/result/match", declareMatchResult);
router.post("/unDeclare/result/match", unDeclareMatchResult);

router.post("/declare/result/other/match", declareOtherMatchResult);
router.post("/unDeclare/result/other/match", unDeclareOtherMatchResult);

router.post("/declare/result/race/match", declareRacingMatchResult);
router.post("/unDeclare/result/race/match", unDeclareRaceMatchResult);

router.post("/declare/result/card/match", declareCardMatchResult);

router.get('/match/competitionList/:type',isAuthenticate,getMatchCompetitionsByType);
router.get('/match/competition/dates/:competitionId',isAuthenticate,getMatchDatesByCompetitionId);
router.get('/match/competition/getMatch/:competitionId/:date',isAuthenticate,getMatchDatesByCompetitionIdAndDate);
router.get("/bets", getPlacedBets);
router.get("/login/bet/data", getWalletBetsData);
router.post("/lockUnlockExpert", isAuthenticate, lockUnlockExpert)


module.exports = router;
