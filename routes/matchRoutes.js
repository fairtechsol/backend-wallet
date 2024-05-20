const express = require('express');
const router = express.Router();

const { isAuthenticate, checkTransactionPassword } = require('../middleware/auth');
const { matchDetails, listMatch, addMatch, matchLock, otherMatchDetails, checkChildDeactivate, listRacingCountryCode, listRacingMatch } = require('../controllers/matchController');




router.get('/list',isAuthenticate,listMatch);

//racing list
router.get('/countryWiseList', isAuthenticate, listRacingCountryCode);
router.get('/racing/list', isAuthenticate, listRacingMatch);

router.get('/:id',isAuthenticate,matchDetails);
router.get('/other/:id', isAuthenticate, otherMatchDetails);
router.post('/lock', isAuthenticate, checkTransactionPassword, matchLock);
router.get("/checkChildDeactivate", isAuthenticate, checkChildDeactivate);
router.post('/add', addMatch);

module.exports = router;