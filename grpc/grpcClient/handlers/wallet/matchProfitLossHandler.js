const grpcReq = require("../../index");

exports.getTotalProfitLossHandler = async (requestData, address) => {
    try {
        const response = await grpcReq.user(address).callMethod(
            "MatchProfitLossService",
            "GetTotalProfitLoss",
            requestData
        );
        return JSON.parse(response?.data || "{}");
    } catch (error) {
        throw error;
    }
};

exports.getDomainProfitLossHandler = async (requestData, address) => {
    try {
        const response = await grpcReq.user(address).callMethod(
            "MatchProfitLossService",
            "GetDomainProfitLoss",
            requestData
        );
        return JSON.parse(response?.data || "{}");
    } catch (error) {
        throw error;
    }
};

exports.getUserWiseBetProfitLossHandler = async (requestData, address) => {
    try {
        const response = await grpcReq.user(address).callMethod(
            "MatchProfitLossService",
            "GetUserWiseBetProfitLoss",
            requestData
        );
        return JSON.parse(response?.data || "{}");
    } catch (error) {
        throw error;
    }
};

exports.getSessionBetProfitLossHandler = async (requestData, address) => {
    try {
        const response = await grpcReq.user(address).callMethod(
            "MatchProfitLossService", 
            "GetSessionBetProfitLoss",
            requestData
        );
        return JSON.parse(response?.data || "{}");
    } catch (error) {
        throw error;
    }
};

