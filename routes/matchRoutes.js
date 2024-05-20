const express = require('express');
const router = express.Router();

<<<<<<< Updated upstream
const { isAuthenticate, checkTransactionPassword } = require('../middleware/auth');
const { matchDetails, listMatch, addMatch, matchLock, otherMatchDetails, checkChildDeactivate } = require('../controllers/matchController');
=======
const { isAuthenticate } = require('../middleware/auth');
const { matchDetails, listMatch, addMatch, matchLock, otherMatchDetails, raceAdd } = require('../controllers/matchController');
>>>>>>> Stashed changes




router.get('/list',isAuthenticate,listMatch);
router.get('/:id',isAuthenticate,matchDetails);
router.get('/other/:id', isAuthenticate, otherMatchDetails);
router.post('/lock', isAuthenticate, checkTransactionPassword, matchLock);
router.get("/checkChildDeactivate", isAuthenticate, checkChildDeactivate);
router.post('/add', addMatch);
router.post('/raceAdd', raceAdd);

module.exports = router;