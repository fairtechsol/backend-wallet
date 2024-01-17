const express = require('express');
const router = express.Router();

const validator = require('../middleware/joi.validator')
const {CreateSuperAdmin,updateSuperAdminValid,setExposureLimitValid,setCreditReferValid, SetSuperAdminBalance, ChangePassword,LockUnlockUser} = require('../validators/superAdminValidator');
const {createSuperAdmin,updateSuperAdmin,setExposureLimit,setCreditReferrence, updateUserBalance, changePassword,lockUnlockSuperAdmin, getPartnershipId, getPlacedBets} = require('../controllers/superAdminController');

const { isAuthenticate, checkTransactionPassword } = require('../middleware/auth');




router.post('/add',isAuthenticate,checkTransactionPassword,validator(CreateSuperAdmin),createSuperAdmin);
router.post('/updateUser',isAuthenticate,checkTransactionPassword,validator(updateSuperAdminValid),updateSuperAdmin);
// router.post('/lockUnlockUser', validator(LockUnlockUser), lockUnlockUser);
router.post('/changePassword',isAuthenticate,checkTransactionPassword,validator(ChangePassword),changePassword);
router.post('/lockUnlockUser',isAuthenticate, checkTransactionPassword,validator(LockUnlockUser), lockUnlockSuperAdmin);
// router.post('/changePassword',isAuthenticate,validator(ChangePassword),changePassword);
router.post("/update/exposurelimit",isAuthenticate,checkTransactionPassword,validator(setExposureLimitValid),setExposureLimit)
router.post("/update/creditreferrence",isAuthenticate,checkTransactionPassword,validator(setCreditReferValid),setCreditReferrence)
router.post("/update/balance",isAuthenticate,checkTransactionPassword,validator(SetSuperAdminBalance),updateUserBalance)
router.get("/partnershipId/:userId", getPartnershipId);
router.get("/bets",isAuthenticate, getPlacedBets);

module.exports = router;
//https://3100dev.fairgame.club/fair-game-wallet/getUserBalanceDetails
