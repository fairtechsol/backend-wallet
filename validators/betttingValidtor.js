const Joi = require('joi')

module.exports.MatchBetPlacedValidator = Joi.object({
    matchId: Joi.guid({ version: "uuidv4" }).required(),
    deleteReason: Joi.string().required(),
    urlData: Joi.object.pattern(
        Joi.string().required(),
        Joi.array().items(
            Joi.object({
                userId: Joi.string().guid({ version: 'uuidv4' }).required(),
                betId: Joi.string().guid({ version: 'uuidv4' }).required(),
                placeBetId: Joi.string().guid({ version: 'uuidv4' }).required()
            })
        )
    )
})
