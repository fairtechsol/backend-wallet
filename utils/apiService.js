const axios = require('axios');
const { encryptWithAES, encryptAESKeyWithRSA, decryptAESKeyWithRSA, decryptWithAES } = require('./encryptDecrypt');
const crypto = require("crypto");

// create common api call function using axios to call external server http call for whole project GET <POST< PUT< DELETE
exports.apiMethod = {
  get: "get",
  post: "post",
  put: "put",
  delete: "delete"
}
exports.apiCall = async (method, url, data, headers, ReqQuery) => {
  try {
    // if (ReqQuery) {
    //   const aesKey = crypto.randomBytes(32); // Generate AES key
    //   const encryptedData = encryptWithAES(ReqQuery, aesKey);
    //   const encryptedKey = encryptAESKeyWithRSA(aesKey, true);
    //   ReqQuery = { encryptedData, encryptedKey }
    // }
    // if (data) {
    //   const aesKey = crypto.randomBytes(32); // Generate AES key
    //   const encryptedData = encryptWithAES(data, aesKey);
    //   const encryptedKey = encryptAESKeyWithRSA(aesKey, true);
    //   data = { encryptedData, encryptedKey }
    // }
    let response = await axios({
      method: method,
      url: url,
      data: data,
      headers: headers,
      params: ReqQuery
    });
    let resData = response.data;
    // if (resData?.encryptedData && resData?.encryptedKey) {
    //   const aesKey = decryptAESKeyWithRSA(resData.encryptedKey, true);
    //   resData = decryptWithAES(resData.encryptedData, aesKey);
    // }
    return resData;
  } catch (error) {
    throw error;
  }
};

exports.allApiRoutes = {
  MICROSERVICE : {
    casinoData:"/getdata/"
  }
};
