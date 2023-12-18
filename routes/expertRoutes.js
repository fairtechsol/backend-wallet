const express = require('express');
const router = express.Router();

const validator = require('../middleware/joi.validator')

const { isAuthenticate, checkTransactionPassword } = require('../middleware/auth');
const { CreateExpertValidate, UpdateExpertValidate, changePasswordExpertValidate } = require('../validators/expertValidator');
const { createUser, updateUser, changePassword, expertList } = require('../controllers/expertController');




router.post('/add',isAuthenticate,checkTransactionPassword,validator(CreateExpertValidate),createUser);
router.post('/update',isAuthenticate,checkTransactionPassword,validator(UpdateExpertValidate),updateUser);
router.post('/password',isAuthenticate,checkTransactionPassword,validator(changePasswordExpertValidate),changePassword);
router.get('/list',isAuthenticate,expertList);
// // router.post('/lockUnlockUser', validator(LockUnlockUser), lockUnlockUser);
// router.post('/changePassword',isAuthenticate,checkTransactionPassword,validator(ChangePassword),changePassword);
// router.post('/lockUnlockUser',isAuthenticate, checkTransactionPassword,validator(LockUnlockUser), lockUnlockSuperAdmin);
// // router.post('/changePassword',isAuthenticate,validator(ChangePassword),changePassword);
// router.post("/update/exposurelimit",isAuthenticate,checkTransactionPassword,validator(setExposureLimitValid),setExposureLimit)
// router.post("/update/creditreferrence",isAuthenticate,checkTransactionPassword,validator(setCreditReferValid),setCreditReferrence)
// router.post("/update/balance",isAuthenticate,checkTransactionPassword,validator(SetSuperAdminBalance),updateUserBalance)

module.exports = router;
//https://3100dev.fairgame.club/fair-game-wallet/getUserBalanceDetails
