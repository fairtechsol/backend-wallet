
const express = require('express');
const router = express.Router();

const validator = require('../middleware/joi.validator')
const { isAuthenticate } = require('../middleware/auth');
const { insertWallet, updateBalance } = require('../controllers/walletController');
const {  SetWalletBalance } = require('../validators/userBalanceValidator');

router.post('/insert',insertWallet)
router.post('/update/balance',isAuthenticate,validator(SetWalletBalance),updateBalance)

module.exports = router;