const Joi = require('joi')

module.exports.deleteMultipleBetValidator = Joi.object({
    matchId: Joi.string().guid({ version: "uuidv4" }).required(),
    deleteReason: Joi.string().required(),
    urlData: Joi.object().pattern(
        Joi.string().required(),
        Joi.array().items(
            Joi.object({
                userId: Joi.string().guid({ version: 'uuidv4' }).required(),
                betId: Joi.string().guid({ version: 'uuidv4' }).required(),
                placeBetId: Joi.string().guid({ version: 'uuidv4' }).required()
            })
        )
    )
});

module.exports.deleteMultipleBetPermanentValidator = Joi.object({
    matchId: Joi.string().guid({ version: "uuidv4" }).required(),
    urlData: Joi.object().pattern(
        Joi.string().required(),
        Joi.array().items(
            Joi.object({
                userId: Joi.string().guid({ version: 'uuidv4' }).required(),
                betId: Joi.string().guid({ version: 'uuidv4' }).required(),
                placeBetId: Joi.string().guid({ version: 'uuidv4' }).required()
            })
        )
    ),
    password: Joi.string().required()
});

module.exports.changeBetsDeleteReasonValidator = Joi.object({
    deleteReason: Joi.string().required(),
    betData: Joi.object().pattern(
        Joi.string().required(),
        Joi.array().items(
            Joi.string().guid({ version: 'uuidv4' })
        ).min(1)
    ),
    matchId: Joi.string().guid({ version: 'uuidv4' }).required().messages({
        'any.required': 'Match id is required',
    })
});