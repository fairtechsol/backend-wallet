const grpcReq = require("../../index");

exports.getBets = async (requestData, address) => {
  try {
    // Call the gRPC method and await the response
    const response = await grpcReq.user(address).callMethod(
      "BetsProvider",
      "GetBets",
      requestData
    );

    return JSON.parse(response?.data||"{}");
  } catch (error) {
    throw error;
  }
};

exports.sessionProfitLossUserWiseData = async (requestData,address) => {
  try {
      // Call the gRPC method and await the response
      const response = await grpcReq.user(address).callMethod(
          "BetsProvider",
          "GetSessionProfitLossUserWise",
          requestData
      );

      return JSON.parse(response?.data || "{}");
  } catch (error) {
      throw error;
  }
};

exports.sessionProfitLossBetsData = async (requestData,address) => {
  try {
      // Call the gRPC method and await the response
      const response = await grpcReq.user(address).callMethod(
          "BetsProvider",
          "GetSessionProfitLossBet",
          requestData
      );

      return JSON.parse(response?.data || "{}");
  } catch (error) {
      throw error;
  }
};

exports.deleteMultipleBetHandler = async (requestData, address) => {
  try {
    // Call the gRPC method and await the response
     await grpcReq.user(address).callMethod(
      "BetsProvider",
      "DeleteMultipleBet",
      requestData
    );
  } catch (error) {
    throw error;
  }
};