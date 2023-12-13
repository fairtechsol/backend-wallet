
const express = require('express');
const router = express.Router();

const validator = require('../middleware/joi.validator')
const { isAuthenticate } = require('../middleware/auth');
const { insertWallet, updateBalance ,setExposureLimit, setCreditReferrence} = require('../controllers/walletController');
const {  SetWalletBalance, SetWalletExposureLimit, SetWalletCreditRefrence } = require('../validators/userBalanceValidator');

router.post('/insert',insertWallet)
router.post('/update/balance',isAuthenticate,validator(SetWalletBalance),updateBalance)
router.post('/update/exposurelimit',isAuthenticate,validator(SetWalletExposureLimit),setExposureLimit)
router.post('/update/creditreference',isAuthenticate,validator(SetWalletCreditRefrence),setCreditReferrence)
module.exports = router;