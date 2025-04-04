const express = require('express');
const router = express.Router();

const { isAuthenticate, checkTransactionPassword } = require('../middleware/auth');
const { matchDetails, listMatch, matchLock, checkChildDeactivate, listRacingCountryCode, listRacingMatch, checkMatchLock, raceDetails, raceMarketAnalysis, cardDetails, userEventWiseExposure, marketAnalysis } = require('../controllers/matchController');

router.get('/list', isAuthenticate, listMatch);

//racing list
router.get('/countryWiseList', isAuthenticate, listRacingCountryCode);
router.get('/racing/list', isAuthenticate, listRacingMatch);
router.get('/racing/:id', isAuthenticate, raceDetails);
router.get('/card/:type', isAuthenticate, cardDetails);

router.get('/marketAnalysis', isAuthenticate, marketAnalysis);
router.get('/:id', isAuthenticate, matchDetails);
router.post('/lock', isAuthenticate, checkTransactionPassword, matchLock);
router.get("/check/lock", isAuthenticate, checkMatchLock);

router.get("/checkChildDeactivate", isAuthenticate, checkChildDeactivate);
router.get("/race/marketAnalysis", isAuthenticate, raceMarketAnalysis);
router.get('/eventWise/exposure/:userId', isAuthenticate, userEventWiseExposure);

module.exports = router;