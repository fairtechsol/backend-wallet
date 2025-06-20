const express = require('express');
const router = express.Router();

const validator = require('../middleware/joi.validator')
const {CreateUser, ChangePassword, generateTransactionPass, LockUnlockUser,updateUserValid, SetExposureLimitValid, SetCreditReference, CheckOldPassword, parmanetDelPassUpdate} = require('../validators/userValidator');
const {createUser,lockUnlockUser,generateTransactionPassword, changePassword, updateUser,setExposureLimit, userList, userSearchList,userBalanceDetails, setCreditReferrence, getProfile, getTotalProfitLoss, getDomainProfitLoss, getResultBetProfitLoss, getSessionBetProfitLoss, isUserExist, getCommissionMatchReports, getCommissionBetPlaced, getTotalUserListBalance, deleteUser, getUserWiseBetProfitLoss, checkOldPasswordData, getCardTotalProfitLoss, getCardDomainProfitLoss, getCardResultBetProfitLoss, generateParmanentDelete} = require('../controllers/userController');

const { isAuthenticate, checkTransactionPassword } = require('../middleware/auth');


router.post('/add',isAuthenticate,checkTransactionPassword,validator(CreateUser),createUser);
router.post('/updateUser',isAuthenticate,checkTransactionPassword,validator(updateUserValid),updateUser);
router.post('/lockUnlockUser',isAuthenticate,checkTransactionPassword, validator(LockUnlockUser), lockUnlockUser);
router.post('/changePassword',isAuthenticate,validator(ChangePassword),changePassword);
router.post("/update/exposurelimit",isAuthenticate,checkTransactionPassword,validator(SetExposureLimitValid),setExposureLimit);
router.get("/list",isAuthenticate,userList);
router.get("/child/totalBalance", isAuthenticate, getTotalUserListBalance);

router.get("/exist", isAuthenticate, isUserExist);
router.get("/searchlist",isAuthenticate,userSearchList)
router.get("/balance",isAuthenticate,userBalanceDetails)
router.post("/update/creditreferrence",isAuthenticate,checkTransactionPassword,validator(SetCreditReference),setCreditReferrence)
router.post("/generateTransactionPassword",isAuthenticate,validator(generateTransactionPass),generateTransactionPassword);
router.get("/profile",isAuthenticate,getProfile);

router.get("/total/profitLoss", isAuthenticate, getTotalProfitLoss);
router.get("/total/domain/profitLoss", isAuthenticate, getDomainProfitLoss);
router.get("/total/bet/profitLoss", isAuthenticate, getResultBetProfitLoss);
router.get("/total/session/profitLoss", isAuthenticate, getSessionBetProfitLoss);
router.get("/userwise/profitLoss", isAuthenticate, getUserWiseBetProfitLoss);

router.get("/card/total/profitLoss", isAuthenticate, getCardTotalProfitLoss);
router.get("/card/total/domain/profitLoss", isAuthenticate, getCardDomainProfitLoss);
router.get("/card/total/bet/profitLoss", isAuthenticate, getCardResultBetProfitLoss);

router.get("/commissionMatch/:userId", isAuthenticate, getCommissionMatchReports);
router.get("/commissionBetPlaced/:userId", isAuthenticate, getCommissionBetPlaced);
router.delete("/delete/:id", isAuthenticate, deleteUser);
router.post("/check/oldPassword", isAuthenticate, validator(CheckOldPassword), checkOldPasswordData);
router.post("/generate/permanentDelete", isAuthenticate, validator(parmanetDelPassUpdate), generateParmanentDelete);

module.exports = router;
//https://3100dev.fairgame.club/fair-game-wallet/getUserBalanceDetails
