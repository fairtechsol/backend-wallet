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
