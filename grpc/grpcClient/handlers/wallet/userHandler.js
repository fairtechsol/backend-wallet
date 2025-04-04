const grpcReq = require("../../index");

exports.createExpertHandler = async (requestData) => {
    try {
        await grpcReq.expert.callMethod(
            "UserService",
            "CreateExpert",
            requestData
        );
    } catch (error) {
        throw error;
    }
};

exports.createSuperAdminHandler = async (requestData, address) => {
    try {
        await grpcReq.user(address).callMethod(
            "UserService",
            "CreateSuperAdmin",
            { data: JSON.stringify(requestData) }
        );
    } catch (error) {
        throw error;
    }
};

exports.updateSuperAdminHandler = async (requestData, address) => {
    try {
        await grpcReq.user(address).callMethod(
            "UserService",
            "UpdateSuperAdmin",
            { data: JSON.stringify(requestData) }
        );
    } catch (error) {
        throw error;
    }
};

exports.changePasswordHandler = async (requestData, address) => {
    try {
        await grpcReq.user(address).callMethod(
            "UserService",
            "ChangePassword",
            requestData
        );
    } catch (error) {
        throw error;
    }
};

exports.setExposureLimitHandler = async (requestData, address) => {
    try {
        await grpcReq.user(address).callMethod(
            "UserService",
            "SetExposureLimit",
            requestData
        );
    } catch (error) {
        throw error;
    }
};

exports.setCreditReferenceHandler = async (requestData, address) => {
    try {
        await grpcReq.user(address).callMethod(
            "UserService",
            "SetCreditReference",
            requestData
        );
    } catch (error) {
        throw error;
    }
};

exports.updateUserBalanceHandler = async (requestData, address) => {
    try {
        await grpcReq.user(address).callMethod(
            "UserService",
            "UpdateUserBalance",
            requestData
        );
    } catch (error) {
        throw error;
    }
};

exports.lockUnlockSuperAdminHandler = async (requestData, address) => {
    try {
        await grpcReq.user(address).callMethod(
            "UserService",
            "LockUnlockSuperAdmin",
            requestData
        );
    } catch (error) {
        throw error;
    }
};
