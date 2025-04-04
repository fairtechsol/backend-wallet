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