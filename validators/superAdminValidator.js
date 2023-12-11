const Joi = require('joi')
const { userRoleConstant, blockType, matchComissionTypeConstant, passwordRegex } = require('../config/contants')


module.exports.CreateSuperAdmin = Joi.object({
    userName: Joi.string().trim().required(),
    fullName: Joi.string().min(3).max(255),
    password: Joi.string().pattern(passwordRegex).required().label('password').messages({
        'string.pattern.base': 'user.passwordMatch',
        'any.required': 'Password is required',
    }),
    phoneNumber: Joi.string().messages({
        'any.required': 'Phone number is required',
    }),
    city: Joi.string().max(255),
    roleName: Joi.string().valid(...Object.values(userRoleConstant)).required(),
    myPartnership: Joi.number().required(),
    creditRefrence: Joi.number(),
    exposureLimit: Joi.number(),
    maxBetLimit: Joi.number(),
    minBetLimit: Joi.number(),
    confirmPassword: Joi.string().required().valid(Joi.ref('password')).label('Confirm Password').messages({
        'string.base': 'Confirm Password must be a string',
        'any.required': 'Confirm Password is required',
        'any.only': 'Confirm Password must match Password',
    }),
    //domain,logo,sidebarColor,headerColor,footerColor
    domain: Joi.string().required(),
    logo: Joi.string().required(),
    sidebarColor: Joi.string().required(),
    headerColor: Joi.string().required(),
    footerColor: Joi.string().required(),
})


// module.exports.ChangePassword=Joi.object({
//   oldPassword:Joi.string(),
//   newPassword:Joi.string().pattern(passwordRegex).required().label('password').messages({
//       'string.pattern.base': 'user.passwordMatch',
//         'any.required': 'Password is required',
//     }),
//     userId:Joi.string().guid({ version: 'uuidv4' }),
//   transactionPassword: Joi.string()
//     ,
//   confirmPassword: Joi.string()
//     .required()
//     .valid(Joi.ref("newPassword"))
//     .label("Confirm Password")
//     .messages({
//       "string.base": "Confirm Password must be a string",
//       "any.required": "Confirm Password is required",
//       "any.only": "Confirm Password must match new password",
//     }),
// });

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
    sessionCommission: Joi.number(),
    matchComissionType: Joi.string().valid(...Object.values(matchComissionTypeConstant)),
    matchCommission: Joi.number(),
    id: Joi.string().guid({ version: 'uuidv4' }).required(),
    logo: Joi.string(),
    sidebarColor: Joi.string(),
    headerColor: Joi.string(),
    footerColor: Joi.string(),
})

module.exports.setExposureLimitValid = Joi.object({
  //sessionCommission,matchComissionType,matchCommission,id,createBy
  amount: Joi.number().required(),
  transPassword: Joi.string().required(),
  userId: Joi.string().guid({ version: 'uuidv4' }).required(),
})

module.exports.setCreditReferValid = Joi.object({
    //sessionCommission,matchComissionType,matchCommission,id,createBy
    amount: Joi.number().required(),
    transPassword: Joi.string().required(),
    userId: Joi.string().guid({ version: 'uuidv4' }).required(),
    remark : Joi.string().allow("")
  })
  
// module.exports.LockUnlockUser = Joi.object({
//   userId: Joi.string().guid({ version: 'uuidv4' }).required(),
//   transPassword: Joi.string().required().messages({
//     'string.base': '"Transaction Password" must be a string',
//     'any.required': '"Transaction Password" is required',
//     'string.empty': '"Transaction Password" can not be empty.'
//   }),
//   block: Joi.boolean().required(),
//   type: Joi.string().valid(...Object.values(blockType)).required()
// })