const Joi = require('joi')
const { transType, maxAmount } = require('../config/contants')

module.exports.SetUserBalance = Joi.object({
    userId: Joi.string().guid({ version: 'uuidv4' }).required(),
    transactionType: Joi.string().valid(...Object.values(transType)).required(),
    amount : Joi.number().max(maxAmount).required(),
    remark: Joi.string().trim().allow(""),
    createBy: Joi.string().guid({ version: 'uuidv4' }),
    transactionPassword: Joi.string().required(),
})

module.exports.SetWalletBalance = Joi.object({
    transactionType: Joi.string().valid(...Object.values(transType)).required(),
    amount : Joi.number().max(maxAmount).required(),
    remark: Joi.string().trim().allow(""),
    transactionPassword: Joi.string().required(),
})

module.exports.SetWalletExposureLimit = Joi.object({
    amount : Joi.number().max(maxAmount).required(),
    transactionPassword: Joi.string().required(),
})


module.exports.SetWalletCreditRefrence = Joi.object({
    amount : Joi.number().max(maxAmount).required(),
    remark: Joi.string().trim().allow(""),
    transactionPassword: Joi.string().required(),
})

module.exports.settleCommission = Joi.object({
    userId: Joi.string().guid({ version: 'uuidv4' }).required(),
    domain: Joi.string()
});
