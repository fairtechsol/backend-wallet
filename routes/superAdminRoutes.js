const express = require('express');
const router = express.Router();

const validator = require('../middleware/joi.validator')
const {CreateSuperAdmin,updateSuperAdminValid,setExposureLimitValid,setCreditReferValid, SetSuperAdminBalance} = require('../validators/superAdminValidator');
const {createSuperAdmin,updateSuperAdmin,setExposureLimit,setCreditReferrence, updateUserBalance} = require('../controllers/superAdminController');

const { isAuthenticate, checkTransactionPassword } = require('../middleware/auth');




router.post('/add',isAuthenticate,checkTransactionPassword,validator(CreateSuperAdmin),createSuperAdmin);
router.post('/updateUser',isAuthenticate,validator(updateSuperAdminValid),updateSuperAdmin);
// router.post('/lockUnlockUser', validator(LockUnlockUser), lockUnlockUser);
// router.post('/changePassword',isAuthenticate,validator(ChangePassword),changePassword);
router.post("/update/exposurelimit",isAuthenticate,checkTransactionPassword,validator(setExposureLimitValid),setExposureLimit)
router.post("/update/creditreferrence",isAuthenticate,checkTransactionPassword,validator(setCreditReferValid),setCreditReferrence)
router.post("/update/balance",isAuthenticate,checkTransactionPassword,validator(SetSuperAdminBalance),updateUserBalance)

module.exports = router;
//https://3100dev.fairgame.club/fair-game-wallet/getUserBalanceDetails
