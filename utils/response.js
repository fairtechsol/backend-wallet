const { __mf } = require("i18n");
const { logger } = require("../config/logger");

module.exports.ErrorResponse = (errorData, req, res) => {
  try {
    if(!errorData){
      res.status(500).json({ message: "Internal server error" });
      return
    }
    errorData.statusCode = errorData.statusCode || 500;
    errorData.status = "error";
    const errorMessage = errorData.msg ? errorData : errorData.message || "Internal Server Error";

    // Extracting message code and keys
    const { msg, keys } = errorMessage;

    let i18Code = msg ? msg : errorData?.message?.msg || errorData.message;

    const errorObj = {
      status: errorData.status,
      statusCode: errorData.statusCode,
      message: __mf(i18Code, keys || undefined), // Using i18n to get the translated message
      stack: errorData.stack,
    };
    res.status(errorData.statusCode).json(errorObj);
  } catch (err) {
    logger.error({
      message:"Error at error response.",
      stack: err.stack,
      message: err.message,
    });
    res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.SuccessResponse = (resData, req, res) => {
  resData.statusCode = resData.statusCode || 500;
  resData.status = "success";
  resData.meta = resData.meta || "PROJECT NAME";
  return res.status(resData.statusCode).json({
    status: resData.status,
    statusCode: resData.statusCode,
    message: resData?.message
      ? __mf(resData?.message?.msg, resData?.message?.keys)
      : null,
    data: resData.data,
    meta: resData.meta,
  });
};
