const { commonGetMatchDetailsFromRedis } = require("../../../../services/matchCacheService");
const { getTournamentBettingDetailsFromCache } = require("../../../../services/matchCacheService");
const grpcReq = require("../../index");

exports.getMatchCompetitionsHandler = async (requestData) => {
    try {
        const response = await grpcReq.expert.callMethod(
            "MatchProvider",
            "GetMatchCompetitions",
            requestData
        );
        return JSON.parse(response?.data || "{}");
    } catch (error) {
        throw error;
    }
};

exports.getMatchDatesHandler = async (requestData) => {
    try {
        const response = await grpcReq.expert.callMethod(
            "MatchProvider",
            "GetMatchDates",
            requestData
        );
        return JSON.parse(response?.data || "{}");
    } catch (error) {
        throw error;
    }
};

exports.getMatchesByDateHandler = async (requestData) => {
    try {
        const response = await grpcReq.expert.callMethod(
            "MatchProvider",
            "GetMatchesByDate",
            requestData
        );
        return JSON.parse(response?.data || "{}");
    } catch (error) {
        throw error;
    }
};

exports.deleteReasonChangeHandler = async (requestData) => {
    try {
        await grpcReq.expert.callMethod(
            "BetsProvider",
            "ChangeBetsDeleteReason",
            requestData
        );

    } catch (error) {
        throw error;
    }
};

exports.getMatchDetailsHandler = async (requestData) => {
    try {
        const redisMatch = await commonGetMatchDetailsFromRedis(requestData?.matchId);
        if (redisMatch?.data) {
            return redisMatch;
        }
        const response = await grpcReq.expert.callMethod(
            "MatchProvider",
            "MatchDetail",
            requestData
        );
        return { data: JSON.parse(response?.data || "{}") };
    } catch (error) {
        throw error;
    }
};

exports.getRaceDetailsHandler = async (requestData) => {
    try {
        const response = await grpcReq.expert.callMethod(
            "MatchProvider",
            "RaceDetail",
            requestData
        );
        return { data: JSON.parse(response?.data || "{}") };
    } catch (error) {
        throw error;
    }
};

exports.getCardDetailsHandler = async (requestData) => {
    try {
        const response = await grpcReq.expert.callMethod(
            "MatchProvider",
            "CardDetail",
            requestData
        );
        return { data: JSON.parse(response?.data || "{}") };
    } catch (error) {
        throw error;
    }
};


exports.getMatchListHandler = async (requestData) => {
    try {
        const response = await grpcReq.expert.callMethod(
            "MatchProvider",
            "MatchList",
            requestData
        );
        return { data: JSON.parse(response?.data || "{}") };
    } catch (error) {
        throw error;
    }
};

exports.getMatchRaceBettingHandler = async (requestData) => {
    try {
        const response = await grpcReq.expert.callMethod(
            "MatchProvider",
            "RaceBetting",
            requestData
        );
        return { data: JSON.parse(response?.data || "{}") };
    } catch (error) {
        throw error;
    }
};

exports.getRaceListHandler = async (requestData) => {
    try {
        const response = await grpcReq.expert.callMethod(
            "MatchProvider",
            "RaceList",
            requestData
        );
        return { data: JSON.parse(response?.data || "{}") };
    } catch (error) {
        throw error;
    }
};


exports.getRaceCountryCodeListHandler = async (requestData) => {
    try {
        const response = await grpcReq.expert.callMethod(
            "MatchProvider",
            "RaceCountryCodeList",
            requestData
        );
        return { data: JSON.parse(response?.data || "{}") };
    } catch (error) {
        throw error;
    }
};

exports.getTournamentBettingHandler = async (requestData) => {
    try {
        const data = await getTournamentBettingDetailsFromCache(requestData?.id, requestData?.matchId);
        if (data) {
            return data;
        }
        const response = await grpcReq.expert.callMethod(
            "MatchProvider",
            "GetTournamentBetting",
            requestData
        );
        return { data: JSON.parse(response?.data || "{}") };
    } catch (error) {
        throw error;
    }
};