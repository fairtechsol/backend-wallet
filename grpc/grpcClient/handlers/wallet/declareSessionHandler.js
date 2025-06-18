const grpcReq = require("../../index");

exports.declareSessionHandler = async (requestData, address) => {
  try {

    // Call the gRPC method and await the response
    const response = await grpcReq.user(address).callMethod(
      "DeclareSessionProvider",
      "DeclareSession",
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

exports.declareSessionNoResultHandler = async (requestData, address) => {
  try {

    // Call the gRPC method and await the response
    const response = await grpcReq.user(address).callMethod(
      "DeclareSessionProvider",
      "DeclareSessionNoResult",
      requestData,
    );

    const responseData = {
      faAdminCal: JSON.parse(response?.data?.faAdminCal),
      superAdminData: JSON.parse(response?.data?.superAdminData),
    };

    return responseData;
  } catch (error) {
    throw error;
  }
};

exports.unDeclareSessionHandler = async (requestData, address) => {
  try {

    // Call the gRPC method and await the response
    const response = await grpcReq.user(address).callMethod(
      "DeclareSessionProvider",
      "UnDeclareSession",
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