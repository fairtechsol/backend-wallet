const Joi = require('joi')
const { transType } = require('../config/contants')

module.exports.SetUserBalance = Joi.object({
    userId: Joi.string().guid({ version: 'uuidv4' }).required(),
    transactionType: Joi.string().valid(...Object.values(transType)).required(),
    amount : Joi.number().required(),
    remark: Joi.string().trim().allow(null, undefined, ""),
    createBy: Joi.string().guid({ version: 'uuidv4' }),
    transactionPassword: Joi.string().required(),
})

module.exports.SetWalletBalance = Joi.object({
    transactionType: Joi.string().valid(...Object.values(transType)).required(),
    amount : Joi.number().required(),
    remark: Joi.string().trim().allow(null, undefined, ""),
    transactionPassword: Joi.string().required(),
})

module.exports.SetWalletExposureLimit = Joi.object({
    amount : Joi.number().required(),
    transactionPassword: Joi.string().required(),
})


module.exports.SetWalletCreditRefrence = Joi.object({
    amount : Joi.number().required(),
    remark: Joi.string().trim().allow(null, undefined, ""),
    transactionPassword: Joi.string().required(),
})

