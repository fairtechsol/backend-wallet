const express = require('express');
const router = express.Router();

const { isAuthenticate } = require('../middleware/auth');
const { matchDetails, listMatch, addMatch, matchLock } = require('../controllers/matchController');




router.get('/list',isAuthenticate,listMatch);
router.get('/:id',isAuthenticate,matchDetails);
router.post('/lock',isAuthenticate,matchLock);
router.post('/add', addMatch);

module.exports = router;