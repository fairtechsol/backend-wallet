const express = require('express');
const router = express.Router();

const validator = require('../middleware/joi.validator')
const {CreateUser, ChangePassword, generateTransactionPass, LockUnlockUser,updateUserValid, SetExposureLimitValid, SetCreditReference} = require('../validators/userValidator');
const {createUser,lockUnlockUser,insertWallet,generateTransactionPassword, changePassword, updateUser,setExposureLimit, userList, userSearchList,userBalanceDetails, setCreditReferrence} = require('../controllers/userController');

const { isAuthenticate, checkTransactionPassword } = require('../middleware/auth');




router.post('/add',isAuthenticate,validator(CreateUser),createUser);
router.post('/updateUser',isAuthenticate,validator(updateUserValid),updateUser);
router.post('/lockUnlockUser',isAuthenticate,checkTransactionPassword, validator(LockUnlockUser), lockUnlockUser);
router.post('/changePassword',isAuthenticate,validator(ChangePassword),changePassword);
router.post("/update/exposurelimit",isAuthenticate,validator(SetExposureLimitValid),setExposureLimit)
router.get("/list",isAuthenticate,userList)
router.get("/searchlist",isAuthenticate,userSearchList)
router.get("/balance",isAuthenticate,userBalanceDetails)
router.post("/update/creditreferrence",isAuthenticate,validator(SetCreditReference),setCreditReferrence)
router.post("/generateTransactionPassword",isAuthenticate,validator(generateTransactionPass),generateTransactionPassword);

module.exports = router;
//https://3100dev.fairgame.club/fair-game-wallet/getUserBalanceDetails
