const express = require('express');
const router = express.Router();

const { isAuthenticate } = require('../middleware/auth');
const { matchDetails, listMatch } = require('../controllers/matchController');




router.get('/:id',isAuthenticate,matchDetails);
router.get('/list',isAuthenticate,listMatch);

module.exports = router;