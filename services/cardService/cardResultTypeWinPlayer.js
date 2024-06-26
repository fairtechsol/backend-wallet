const { cardGameType } = require("../../config/contants");

class CardResultTypeWin {
    constructor(type) {
        this.type = type;

    }

    getCardGameProfitLoss() {
        switch (this.type) {
            case cardGameType.abj:
                return this.andarBahar();
            case cardGameType.dt20:
            case cardGameType.dt202:
            case cardGameType.dt6:
                return this.dragonTiger();
            case cardGameType.teen20:
            case cardGameType.teen:
                return this.teen20();
            case cardGameType.lucky7:
            case cardGameType.lucky7eu:
                return this.lucky7();
            case cardGameType.card32:
                return this.card32();
            case cardGameType.dtl20:
                return this.dragonTigerLion();
            default:
                throw {
                    statusCode: 400,
                    message: {
                        msg: "bet.wrongCardBetType"
                    }
                };
        }
    }

    dragonTiger() {
        return `CASE
        WHEN "cardResult".result ->> 'win' = '1' THEN 'Dragon'
        WHEN "cardResult".result ->> 'win' = '2' THEN 'Tiger'
        WHEN "cardResult".result ->> 'win' = '3' THEN 'Tie'
    END as result`
    }

    dragonTigerLion() {
        return `CASE
        WHEN "cardResult".result ->> 'win' = '1' THEN 'Dragon'
        WHEN "cardResult".result ->> 'win' = '21' THEN 'Tiger'
        WHEN "cardResult".result ->> 'win' = '41' THEN 'Lion'
    END as result`
    }

    lucky7() {
        return `"cardResult".result ->> 'desc' as result`
    }

    card32() {
        return `CASE
        WHEN "cardResult".result ->> 'win' = '1' THEN 'Player 8'
        WHEN "cardResult".result ->> 'win' = '2' THEN 'Player 9'
        WHEN "cardResult".result ->> 'win' = '3' THEN 'Player 10'
        WHEN "cardResult".result ->> 'win' = '4' THEN 'Player 11'
    END as result`
    }

    andarBahar() {
        return `CASE
        WHEN "cardResult".result ->> 'win' = '1' THEN 'Andar'
        WHEN "cardResult".result ->> 'win' = '2' THEN 'Bahar'
    END as result`
    }

    teen20() {
        return `CASE
        WHEN "cardResult".result ->> 'win' = '1' THEN 'Player A'
        WHEN "cardResult".result ->> 'win' = '3' THEN 'Player B'
        WHEN "cardResult".result ->> 'win' = '0' THEN 'Tie'
    END as result`
    }


}

exports.CardResultTypeWin = CardResultTypeWin;