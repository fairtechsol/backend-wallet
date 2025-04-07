const grpcReq = require("../../index");

exports.declareCardHandler = async (requestData, address) => {
    try {
        // Call the gRPC method and await the response
        const response = await grpcReq.user(address).callMethod(
            "CardService",
            "DeclareCard",
            requestData
        );

        return JSON.parse(response?.data || "{}");
    } catch (error) {
        throw error;
    }
};

exports.getCardTotalProfitLossHandler = async (requestData, address) => {
    try {
        // Call the gRPC method and await the response
        const response = await grpcReq.user(address).callMethod(
            "CardService",
            "GetCardTotalProfitLoss",
            requestData
        );

        return JSON.parse(response?.data || "{}");
    } catch (error) {
        throw error;
    }
};

exports.getCardDomainProfitLossHandler = async (requestData, address) => {
    try {
        // Call the gRPC method and await the response
        const response = await grpcReq.user(address).callMethod(
            "CardService",
            "GetCardDomainProfitLoss",
            requestData
        );

        return JSON.parse(response?.data || "{}");
    } catch (error) {
        throw error;
    }
};

exports.getCardResultBetProfitLossHandler = async (requestData, address) => {
    try {
        // Call the gRPC method and await the response
        const response = await grpcReq.user(address).callMethod(
            "CardService",
            "GetCardResultBetProfitLoss",
            requestData
        );

        return JSON.parse(response?.data || "{}");
    } catch (error) {
        throw error;
    }
};