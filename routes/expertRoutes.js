const express = require('express');
const router = express.Router();

const validator = require('../middleware/joi.validator')

const { isAuthenticate, checkTransactionPassword } = require('../middleware/auth');
const { CreateExpertValidate, UpdateExpertValidate, changePasswordExpertValidate } = require('../validators/expertValidator');
const { createUser, updateUser, changePassword } = require('../controllers/expertController');




router.post('/add',isAuthenticate,checkTransactionPassword,validator(CreateExpertValidate),createUser);
router.post('/update',isAuthenticate,checkTransactionPassword,validator(UpdateExpertValidate),updateUser);
router.post('/password',isAuthenticate,checkTransactionPassword,validator(changePasswordExpertValidate),changePassword);

module.exports = router;
