const express = require('express');
const router = express.Router();

const validator = require('../middleware/joi.validator')
const { CreateSuperAdmin, updateSuperAdminValid, setExposureLimitValid, setCreditReferValid, SetSuperAdminBalance, ChangePassword, LockUnlockUser } = require('../validators/superAdminValidator');
const { createSuperAdmin, updateSuperAdmin, setExposureLimit, setCreditReferrence, updateUserBalance, changePassword, lockUnlockSuperAdmin,  getPlacedBets, getUserProfitLoss,declareVirtualCasinoResult } = require('../controllers/superAdminController');

const { isAuthenticate, checkTransactionPassword } = require('../middleware/auth');


router.post('/add', isAuthenticate, checkTransactionPassword, validator(CreateSuperAdmin), createSuperAdmin);
router.post('/updateUser', isAuthenticate, checkTransactionPassword, validator(updateSuperAdminValid), updateSuperAdmin);

router.post('/changePassword', isAuthenticate, checkTransactionPassword, validator(ChangePassword), changePassword);
router.post('/lockUnlockUser', isAuthenticate, checkTransactionPassword, validator(LockUnlockUser), lockUnlockSuperAdmin);

router.post("/update/exposurelimit", isAuthenticate, checkTransactionPassword, validator(setExposureLimitValid), setExposureLimit)
router.post("/update/creditreferrence", isAuthenticate, checkTransactionPassword, validator(setCreditReferValid), setCreditReferrence)
router.post("/update/balance", isAuthenticate, checkTransactionPassword, validator(SetSuperAdminBalance), updateUserBalance)
router.get("/user/profitLossData/:matchId", isAuthenticate, getUserProfitLoss);
router.get("/bets", isAuthenticate, getPlacedBets);


router.post("/virtual/casino/result", declareVirtualCasinoResult);

module.exports = router;
//https://3100dev.fairgame.club/fair-game-wallet/getUserBalanceDetails
