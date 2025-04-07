const grpcReq = require("../../index");

exports.getCommissionReportHandler = async (requestData, address) => {
    try {
        const response = await grpcReq.user(address).callMethod(
            "CommissionProvider",
            "GetCommissionReport",
            requestData
        );
        return JSON.parse(response?.data || "{}");
    } catch (error) {
        throw error;
    }
};

exports.getCommissionBetReportHandler = async (requestData, address) => {
    try {
        const response = await grpcReq.user(address).callMethod(
            "CommissionProvider",
            "GetCommissionBetReport",
            requestData
        );
        return JSON.parse(response?.data || "{}");
    } catch (error) {
        throw error;
    }
};
