const Joi = require('joi')
const { passwordRegex } = require('../config/contants')
// const { userRoleConstant, blockType, matchComissionTypeConstant, passwordRegex, transType } = require('../config/contants')

exports.CreateExpertValidate = Joi.object({
    userName: Joi.string().trim().required(),
    fullName: Joi.string().trim().allow("").min(3).max(255),
    password: Joi.string().pattern(passwordRegex).required().label('password').messages({
        'string.pattern.base': 'user.passwordMatch',
        'any.required': 'Password is required',
    }),
    phoneNumber: Joi.string().allow(""),
    city: Joi.string().trim().allow("").max(255),
  remark:Joi.string().allow("").trim(),
  allPrivilege: Joi.boolean(),
    addMatchPrivilege: Joi.boolean(),
    betFairMatchPrivilege: Joi.boolean(),
    bookmakerMatchPrivilege: Joi.boolean(),
    sessionMatchPrivilege: Joi.boolean(),
    confirmPassword: Joi.string().required().valid(Joi.ref('password')).label('Confirm Password').messages({
        'string.base': 'Confirm Password must be a string',
        'any.required': 'Confirm Password is required',
        'any.only': 'Confirm Password must match Password',
    }),
    transactionPassword : Joi.string().required()
})

exports.UpdateExpertValidate = Joi.object({
    id:Joi.string().guid({ version: 'uuidv4' }).required(),
    fullName: Joi.string().trim().allow("").min(3).max(255),
    phoneNumber: Joi.string().trim().allow(""),
  remark:Joi.string().allow("").trim(),
  city: Joi.string().trim().allow("").max(255),
    allPrivilege: Joi.boolean(),
    addMatchPrivilege: Joi.boolean(),
    betFairMatchPrivilege: Joi.boolean(),
    bookmakerMatchPrivilege: Joi.boolean(),
    sessionMatchPrivilege: Joi.boolean(),
    transactionPassword : Joi.string().required()
})
exports.changePasswordExpertValidate = Joi.object({
    id:Joi.string().guid({ version: 'uuidv4' }).required(),
    password  : Joi.string().pattern(passwordRegex).required().label('password').messages({
        'string.pattern.base': 'user.passwordMatch',
        'any.required': 'Password is required',
    }),
    transactionPassword : Joi.string().required()
})