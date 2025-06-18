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

exports.updateExpertHandler = async (requestData) => {
    try {
        await grpcReq.expert.callMethod(
            "UserService",
            "UpdateExpert",
            requestData
        );
    } catch (error) {
        throw error;
    }
};

exports.changePasswordHandler = async (requestData) => {
    try {
        return await grpcReq.expert.callMethod(
            "UserService",
            "ChangePasswordExpert",
            requestData
        );
    } catch (error) {
        throw error;
    }
};

exports.getExpertListHandler = async (requestData) => {
    try {
        const response = await grpcReq.expert.callMethod(
            "UserService",
            "GetExpertList",
            requestData
        );
        return JSON.parse(response?.data || "{}");

    } catch (error) {
        throw error;
    }
};

exports.getNotificationHandler = async (requestData) => {
    try {
        const response = await grpcReq.expert.callMethod(
            "UserService",
            "GetNotification",
            requestData
        );
        return JSON.parse(response?.data || "{}");
    } catch (error) {
        throw error;
    }
};



exports.lockUnlockExpertHandler = async (requestData) => {
    try {
         await grpcReq.expert.callMethod(
            "UserService",
            "LockUnlockExpert",
            requestData
        );
    } catch (error) {
        throw error;
    }
};

exports.isUserExistHandler = async (requestData) => {
    try {
      const response = await grpcReq.expert.callMethod(
        "UserService",
        "IsUserExist",
        requestData
      );
      return response;
    } catch (error) {
      throw error;
    }
  };
  