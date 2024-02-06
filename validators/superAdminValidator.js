const Joi = require('joi')
const { userRoleConstant, blockType, matchComissionTypeConstant, passwordRegex, transType } = require('../config/contants')


module.exports.CreateSuperAdmin = Joi.object({
    userName: Joi.string().trim().required(),
    fullName: Joi.string().allow("").min(3).max(255),
    password: Joi.string().pattern(passwordRegex).required().label('password').messages({
        'string.pattern.base': 'user.passwordMatch',
        'any.required': 'Password is required',
    }),
    phoneNumber: Joi.string().allow("").messages({
        'any.required': 'Phone number is required',
    }),
    city: Joi.string().allow("").max(255),
  remark:Joi.string().allow("").trim(),
  roleName: Joi.string().valid(...Object.values(userRoleConstant)).required(),
    myPartnership: Joi.number().required(),
    creditRefrence: Joi.number().allow(""),
    exposureLimit: Joi.number().allow(""),
    maxBetLimit: Joi.number().allow(""),
    minBetLimit: Joi.number().allow(""),
    confirmPassword: Joi.string().required().valid(Joi.ref('password')).label('Confirm Password').messages({
        'string.base': 'Confirm Password must be a string',
        'any.required': 'Confirm Password is required',
        'any.only': 'Confirm Password must match Password',
    }),
    isOldFairGame: Joi.boolean(),
    domain: Joi.string().when('isOldFairGame', {
        is: Joi.valid(false),
        then: Joi.required(),
    }),
    logo: Joi.string().when('isOldFairGame', {
        is: Joi.valid(false),
        then: Joi.required(),
    }),
    sidebarColor: Joi.string().when('isOldFairGame', {
        is: Joi.valid(false),
        then: Joi.required(),
    }),
    headerColor: Joi.string().when('isOldFairGame', {
        is: Joi.valid(false),
        then: Joi.required(),
    }),
    footerColor: Joi.string().when('isOldFairGame', {
        is: Joi.valid(false),
        then: Joi.required(),
    }),
    transactionPassword: Joi.string().required(),
    sessionCommission: Joi.number(),
    matchComissionType: Joi.string().valid(...Object.values(matchComissionTypeConstant)).allow(null),
    matchCommission: Joi.number(),
})


module.exports.ChangePassword = Joi.object({
    newPassword: Joi.string().pattern(passwordRegex).required().label('password').messages({
        'string.pattern.base': 'user.passwordMatch',
        'any.required': 'Password is required',
    }),
    userId: Joi.string().guid({ version: 'uuidv4' }),
    transactionPassword: Joi.string()
});

// module.exports.generateTransactionPass = Joi.object({
//   transPassword: Joi.string()
//     .required()
//     .label("Transaction password")
//     .length(6)
//     .message("Transaction password must be 6 characters long"),
//   confirmTransPassword: Joi.string()
//     .required()
//     .valid(Joi.ref("transPassword"))
//     .label("Confirm transaction password")
//     .messages({
//       "string.base": "Confirm transaction Password must be a string",
//       "any.required": "Confirm transaction password is required",
//       "any.only": "Confirm Transaction Password must match transaction password",
//     }),
// });




module.exports.updateSuperAdminValid = Joi.object({
    //sessionCommission,matchComissionType,matchCommission,id,createBy
    id: Joi.string().guid({ version: 'uuidv4' }).required(),
    fullName: Joi.string().allow("").min(3).max(255),
    phoneNumber: Joi.string().allow("").messages({
        'any.required': 'Phone number is required',
    }),
    city: Joi.string().allow("").max(255),
  remark:Joi.string().allow("").trim(),
  logo: Joi.string().allow(""),
    sidebarColor: Joi.string().allow(""),
    headerColor: Joi.string().allow(""),
    footerColor: Joi.string().allow(""),
    transactionPassword: Joi.string().required(),
    isOldFairGame: Joi.boolean(),
    sessionCommission: Joi.number(),
    matchComissionType: Joi.string().valid(...Object.values(matchComissionTypeConstant)).allow(null),
    matchCommission: Joi.number(),
})

module.exports.setExposureLimitValid = Joi.object({
    //sessionCommission,matchComissionType,matchCommission,id,createBy
    amount: Joi.number().required(),
    transactionPassword: Joi.string().required(),
    userId: Joi.string().guid({ version: 'uuidv4' }).required(),
})

module.exports.setCreditReferValid = Joi.object({
    //sessionCommission,matchComissionType,matchCommission,id,createBy
    amount: Joi.number().required(),
    transactionPassword: Joi.string().required(),
    userId: Joi.string().guid({ version: 'uuidv4' }).required(),
    remark: Joi.string().allow("")
})

module.exports.SetSuperAdminBalance = Joi.object({
    userId: Joi.string().guid({ version: 'uuidv4' }).required(),
    transactionType: Joi.string().valid(...Object.values(transType)).required(),
    amount: Joi.number().required(),
    remark: Joi.string().trim().allow(""),
    transactionPassword: Joi.string().required(),
})
module.exports.LockUnlockUser = Joi.object({
  userId: Joi.string().guid({ version: 'uuidv4' }).required(),
  transactionPassword: Joi.string().required().messages({
    'string.base': '"Transaction Password" must be a string',
    'any.required': '"Transaction Password" is required',
    'string.empty': '"Transaction Password" can not be empty.'
  }),
  userBlock: Joi.boolean().required(),
  betBlock: Joi.boolean().required()
})
