const grpcReq = require("../../index");

exports.addMatchHandler = async (requestData, address) => {
    try {
        await grpcReq.user(address).callMethod(
            "MatchProvider",
            "AddMatch",
            requestData
        );

    } catch (error) {
        throw error;
    }
};

exports.updateMatchHandler = async (requestData, address) => {
    try {
        await grpcReq.user(address).callMethod(
            "MatchProvider",
            "UpdateMatch",
            requestData
        );

    } catch (error) {
        throw error;
    }
};

exports.addRaceMatchHandler = async (requestData, address) => {
    try {
        await grpcReq.user(address).callMethod(
            "MatchProvider",
            "AddRaceMatch",
            requestData
        );

    } catch (error) {
        throw error;
    }
};

exports.matchLockHandler = async (requestData, address) => {
    try {
        await grpcReq.user(address).callMethod(
            "MatchProvider",
            "MatchLock",
            requestData
        );
    } catch (error) {
        throw error;
    }
};

exports.userEventWiseExposureHandler = async (requestData, address) => {
    try {
        const response = await grpcReq.user(address).callMethod(
            "MatchProvider",
            "UserEventWiseExposure",
            requestData
        );
        return JSON.parse(response?.data || "{}");
    } catch (error) {
        throw error;
    }
};

exports.marketAnalysisHandler = async (requestData, address) => {
    try {
        const response = await grpcReq.user(address).callMethod(
            "MatchProvider",
            "MarketAnalysis",
            requestData
        );
        return JSON.parse(response?.data || "{}");
    } catch (error) {
        throw error;
    }
};

exports.virtualEventWiseExposureHandler = async (requestData, address) => {
    try {
        const response = await grpcReq.user(address).callMethod(
            "MatchProvider",
            "VirtualEventWiseExposure",
            requestData
        );
        return JSON.parse(response?.data || "{}");
    } catch (error) {
        throw error;
    }
};
