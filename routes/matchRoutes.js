const express = require('express');
const router = express.Router();

const { isAuthenticate, checkTransactionPassword } = require('../middleware/auth');
const { matchDetails, listMatch, addMatch, matchLock, otherMatchDetails, checkChildDeactivate , raceAdd,listRacingCountryCode, listRacingMatch, checkMatchLock} = require('../controllers/matchController');

router.get('/list',isAuthenticate,listMatch);

//racing list
router.get('/countryWiseList', isAuthenticate, listRacingCountryCode);
router.get('/racing/list', isAuthenticate, listRacingMatch);

router.get('/:id',isAuthenticate,matchDetails);
router.get('/other/:id', isAuthenticate, otherMatchDetails);
router.post('/lock', isAuthenticate, checkTransactionPassword, matchLock);
router.get("/check/lock", isAuthenticate, checkMatchLock);

router.get("/checkChildDeactivate", isAuthenticate, checkChildDeactivate);
router.post('/add', addMatch);
router.post('/raceAdd', raceAdd);

module.exports = router;