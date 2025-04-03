const grpcReq = require("../../index");

exports.declareMatchHandler = async (requestData, address) => {
  try {

    // Call the gRPC method and await the response
    const response = await grpcReq.user(address).callMethod(
      "DeclareMatchProvider",
      "DeclareTournament",
      requestData,
    );

    const responseData = {
      fwProfitLoss: response?.data?.fwProfitLoss,
      faAdminCal: JSON.parse(response?.data?.faAdminCal),
      superAdminData: JSON.parse(response?.data?.superAdminData),
      bulkCommission: JSON.parse(response?.data?.bulkCommission),
    };

    return responseData;
  } catch (error) {
    throw error;
  }
};


exports.unDeclareMatchHandler = async (requestData, address) => {
  try {

    // Call the gRPC method and await the response
    const response = await grpcReq.user(address).callMethod(
      "DeclareMatchProvider",
      "UnDeclareTournament",
      requestData,
    );

    const responseData = {
      fwProfitLoss: response?.data?.fwProfitLoss,
      faAdminCal: JSON.parse(response?.data?.faAdminCal),
      superAdminData: JSON.parse(response?.data?.superAdminData),
    };

    return responseData;
  } catch (error) {
    throw error;
  }
};


exports.declareFinalMatchHandler = async (requestData) => {
  try {
    // Call the gRPC method and await the response
    await grpcReq.wallet.callMethod(
      "DeclareMatchProvider",
      "DeclareFinalMatch",
      requestData
    );

    return {};
  } catch (error) {
    throw error;
  }
};

exports.unDeclareFinalMatchHandler = async (requestData) => {
  try {
    // Call the gRPC method and await the response
    await grpcReq.wallet.callMethod(
      "DeclareMatchProvider",
      "UnDeclareFinalMatch",
      requestData
    );

    return {};
  } catch (error) {
    throw error;
  }
};

