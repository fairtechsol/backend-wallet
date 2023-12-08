const express = require('express');
const router = express.Router();

const validator = require('../middleware/joi.validator')
const {CreateSuperAdmin,updateSuperAdminValid,setExposureLimitValid,setCreditReferValid} = require('../validators/superAdminValidator');
const {createSuperAdmin,updateSuperAdmin,setExposureLimit,setCreditReferrence} = require('../controllers/superAdminController');

const { isAuthenticate } = require('../middleware/auth');




router.post('/add',isAuthenticate,validator(CreateSuperAdmin),createSuperAdmin);
router.post('/updateUser',isAuthenticate,validator(updateSuperAdminValid),updateSuperAdmin);
// router.post('/lockUnlockUser', validator(LockUnlockUser), lockUnlockUser);
// router.post('/changePassword',isAuthenticate,validator(ChangePassword),changePassword);
router.post("/update/exposurelimit",isAuthenticate,validator(setExposureLimitValid),setExposureLimit)
router.post("/update/creditreferrence",isAuthenticate,validator(setCreditReferValid),setCreditReferrence)

module.exports = router;
//https://3100dev.fairgame.club/fair-game-wallet/getUserBalanceDetails
