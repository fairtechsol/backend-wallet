const express = require('express');
const router = express.Router();

const validator = require('../middleware/joi.validator')

const { isAuthenticate, checkTransactionPassword } = require('../middleware/auth');
const { CreateExpertValidate, UpdateExpertValidate, changePasswordExpertValidate } = require('../validators/expertValidator');
const { createUser, updateUser, changePassword, expertList, getNotification, getMatchCompetitionsByType, getMatchDatesByCompetitionId, getMatchDatesByCompetitionIdAndDate } = require('../controllers/expertController');




router.post('/add',isAuthenticate,checkTransactionPassword,validator(CreateExpertValidate),createUser);
router.post('/update',isAuthenticate,checkTransactionPassword,validator(UpdateExpertValidate),updateUser);
router.post('/password',isAuthenticate,checkTransactionPassword,validator(changePasswordExpertValidate),changePassword);
router.get('/list',isAuthenticate,expertList);
router.get("/notification", isAuthenticate, getNotification);

router.get('/match/competitionList/:type',isAuthenticate,getMatchCompetitionsByType);
router.get('/match/competition/dates/:competitionId',isAuthenticate,getMatchDatesByCompetitionId);
router.get('/match/competition/getMatch/:competitionId/:date',isAuthenticate,getMatchDatesByCompetitionIdAndDate);


module.exports = router;
