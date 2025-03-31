const grpcReq = require("../../index");

exports.declareSessionHandler = async (requestData, address) => {
  try {

    // Call the gRPC method and await the response
    const response = await grpcReq.user(address).callMethod(
      "DeclareProvider",
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