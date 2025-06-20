const Joi = require('joi')
const { userRoleConstant, blockType, matchComissionTypeConstant, passwordRegex, maxAmount } = require('../config/contants')


module.exports.CreateUser = Joi.object({
  userName: Joi.string().trim().required(),
  fullName: Joi.string().trim().allow("").min(3).max(255),
  password: Joi.string().pattern(passwordRegex).required().label('password').messages({
    'string.pattern.base': 'user.passwordMatch',
    'any.required': 'Password is required',
  }),
  remark:Joi.string().allow("").trim(),
  phoneNumber: Joi.string().trim().allow(""),
  city: Joi.string().max(255).trim().allow(""),
  roleName: Joi.string().valid(...Object.values(userRoleConstant)).required(),
  myPartnership: Joi.number().required(),
  creditRefrence: Joi.number().max(maxAmount),
  exposureLimit: Joi.number().max(maxAmount),
  maxBetLimit: Joi.number(),
  minBetLimit: Joi.number(),
  confirmPassword: Joi.string().required().valid(Joi.ref('password')).label('Confirm Password').messages({
    'string.base': 'Confirm Password must be a string',
    'any.required': 'Confirm Password is required',
    'any.only': 'Confirm Password must match Password',
  }),
  transactionPassword: Joi.string().required().messages({
    'string.base': '"Transaction Password" must be a string',
    'any.required': '"Transaction Password" is required',
    'string.empty': '"Transaction Password" can not be empty.'
  }),
  matchComissionType: Joi.string().valid(...Object.values(matchComissionTypeConstant)).allow(null),
  sessionCommission: Joi.number(),
  matchCommission: Joi.number(),
});


module.exports.ChangePassword = Joi.object({
  oldPassword: Joi.string(),
  newPassword: Joi.string().pattern(passwordRegex).required().label('password').messages({
    'string.pattern.base': 'user.passwordMatch',
    'any.required': 'Password is required',
  }),
  userId: Joi.string().guid({ version: 'uuidv4' }),
  transactionPassword: Joi.string(),
  confirmPassword: Joi.string()
    .valid(Joi.ref("newPassword"))
    .label("Confirm Password")
    .messages({
      "string.base": "Confirm Password must be a string",
      "any.required": "Confirm Password is required",
      "any.only": "Confirm Password must match new password",
    }),
});

module.exports.generateTransactionPass = Joi.object({
  transactionPassword: Joi.string()
    .required()
    .label("Transaction password")
    .length(6)
    .message("Transaction password must be 6 characters long"),
  confirmTransPassword: Joi.string()
    .required()
    .valid(Joi.ref("transactionPassword"))
    .label("Confirm transaction password")
    .messages({
      "string.base": "Confirm transaction Password must be a string",
      "any.required": "Confirm transaction password is required",
      "any.only": "Confirm Transaction Password must match transaction password",
    }),
});

module.exports.updateUserValid = Joi.object({
  //matchComissionType,matchCommission,id,createBy
  matchComissionType: Joi.string().valid(...Object.values(matchComissionTypeConstant)).allow(null),
  matchCommission: Joi.number(),
  sessionCommission: Joi.number(),
  remark:Joi.string().allow("").trim(),
  id: Joi.string().guid({ version: 'uuidv4' }).required(),
  transactionPassword: Joi.string().required().messages({
    'string.base': '"Transaction Password" must be a string',
    'any.required': '"Transaction Password" is required',
    'string.empty': '"Transaction Password" can not be empty.'
  }),
  fullName: Joi.string().trim().allow("").min(3).max(255),
  phoneNumber: Joi.string().trim().allow(""),
  city: Joi.string().max(255).trim().allow(""),
})

module.exports.SetExposureLimitValid = Joi.object({
  //matchComissionType,matchCommission,id,createBy
  amount: Joi.number().max(maxAmount).required(),
  transactionPassword: Joi.string().required(),
  userId: Joi.string().guid({ version: 'uuidv4' }).required(),
})

module.exports.SetCreditReference = Joi.object({
  //matchComissionType,matchCommission,id,createBy
  amount: Joi.number().max(maxAmount).required(),
  transactionPassword: Joi.string().required(),
  userId: Joi.string().guid({ version: 'uuidv4' }).required(),
  remark: Joi.string().trim().allow("")
})

module.exports.LockUnlockUser = Joi.object({
  userId: Joi.string().guid({ version: 'uuidv4' }).required(),
  transactionPassword: Joi.string().required().messages({
    'string.base': '"Transaction Password" must be a string',
    'any.required': '"Transaction Password" is required',
    'string.empty': '"Transaction Password" can not be empty.'
  }),
  betBlock: Joi.boolean().required(),
  userBlock: Joi.boolean().required()
});

module.exports.CheckOldPassword = Joi.object({
  oldPassword: Joi.string().required().label('password').messages({
    'any.required': 'Password is required',
  })
});

module.exports.parmanetDelPassUpdate = Joi.object({
  password: Joi.string().pattern(passwordRegex).required().label('password').messages({
    'string.pattern.base': 'user.passwordMatch',
    'any.required': 'Password is required',
  }),
  code: Joi.string().required(),
  confirmPassword: Joi.string()
    .valid(Joi.ref("password"))
    .label("Confirm Password")
    .messages({
      "string.base": "Confirm Password must be a string",
      "any.required": "Confirm Password is required",
      "any.only": "Confirm Password must match new password",
    }),
});