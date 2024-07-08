const { cardGameType } = require("../../config/contants");

class CardResultTypeWin {
    constructor(type) {
        this.type = type;

    }

    getCardGameProfitLoss() {
        switch (this.type) {
            case cardGameType.abj:
                return this.andarBahar2();
            case cardGameType.dt20:
            case cardGameType.dt202:
            case cardGameType.dt6:
                return this.dragonTiger();
            case cardGameType.teen20:
                return this.teen20();
            case cardGameType.teen:
                return this.teenOneDay();
            case cardGameType.teen9:
                return this.teenTest();
            case cardGameType.lucky7:
            case cardGameType.lucky7eu:
                return this.lucky7();
            case cardGameType.card32:
                return this.card32();
            case cardGameType.dtl20:
                return this.dragonTigerLion();
            case cardGameType.teen8:
                return this.teenOpen();
            case cardGameType.poker20:
            case cardGameType.poker:
                return this.poker2020();
            case cardGameType.poker6:
                return this.poker6Player();
            case cardGameType.ab20:
                return this.andarBahar();
            case cardGameType.war:
                return this.casinoWar();
            case cardGameType.race20:
                return this.race20();
            case cardGameType.superover:
                return this.superOver();
            case cardGameType.cricketv3:
                return this.cricket55();
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

    andarBahar2() {
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

    teenOneDay() {
        return `CASE
        WHEN "cardResult".result ->> 'win' = '1' THEN 'Player A'
        WHEN "cardResult".result ->> 'win' = '2' THEN 'Player B'
        WHEN "cardResult".result ->> 'win' = '0' THEN 'Tie'
    END as result`
    }

    teenOpen() {
        return `concat( 'Player',' ',(string_to_array("cardResult".result ->> 'sid','|'))[1]) as result`
    }
    poker2020() {
        return `CASE
        WHEN "cardResult".result ->> 'win' = '11' THEN 'Player A'
        WHEN "cardResult".result ->> 'win' = '21' THEN 'Player B'
        WHEN "cardResult".result ->> 'win' = '0' THEN 'Player Abandoned'
    END as result`
    }
    poker6Player() {
        return `CASE
        WHEN "cardResult".result ->> 'win' = '11' THEN 'Player 1'
        WHEN "cardResult".result ->> 'win' = '12' THEN 'Player 2'
        WHEN "cardResult".result ->> 'win' = '13' THEN 'Player 3'
        WHEN "cardResult".result ->> 'win' = '14' THEN 'Player 4'
        WHEN "cardResult".result ->> 'win' = '15' THEN 'Player 5'
        WHEN "cardResult".result ->> 'win' = '16' THEN 'Player 6'
        WHEN "cardResult".result ->> 'win' = '17' THEN 'Player 7'
        WHEN "cardResult".result ->> 'win' = '0' THEN 'Player Abandoned'
    END as result`
    }
    andarBahar() {
        return `'Player ab20' as result`
    }
    casinoWar() {
        return `'Player abandoned' as result`
    }
    race20() {
        return `CASE
        WHEN "cardResult".result ->> 'win' = '1' THEN 'K Spade'
        WHEN "cardResult".result ->> 'win' = '2' THEN 'K Heart'
        WHEN "cardResult".result ->> 'win' = '3' THEN 'K Club'
        WHEN "cardResult".result ->> 'win' = '4' THEN 'K Diamond'
    END as result`
    }
    superOver() {
        return `CASE
        WHEN "cardResult".result ->> 'win' = '1' THEN 'Player E'
        WHEN "cardResult".result ->> 'win' = '2' THEN 'Player R'
        WHEN "cardResult".result ->> 'win' = '0' THEN 'Player abandoned'
    END as result`
    }

    cricket55() {
        return `CASE
        WHEN "cardResult".result ->> 'win' = '1' THEN 'Player A'
        WHEN "cardResult".result ->> 'win' = '2' THEN 'Player I'
        WHEN "cardResult".result ->> 'win' = '0' THEN 'Player abandoned'
    END as result`
    }
    teenTest() {
        return `CASE
        WHEN "cardResult".result ->> 'win' = '11' THEN 'Dragon'
        WHEN "cardResult".result ->> 'win' = '21' THEN 'Tiger'
        WHEN "cardResult".result ->> 'win' = '31' THEN 'Lion'
    END as result`
    }
}

exports.CardResultTypeWin = CardResultTypeWin;