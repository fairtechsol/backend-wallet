const axios = require('axios');
// create common api call function using axios to call external server http call for whole project GET <POST< PUT< DELETE
exports.apiMethod = {
    get: "get",
    post: "post",
    put: "put",
    delete: "delete"
}
exports.apiCall = async (method, url, data, headers) => {
  console.log(url);
  try {
    let response = await axios({
      method: method,
      url: url,
      data: data,
      headers: headers
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

exports.allApiRoutes = {
    //user routes
    createSuperAdmin: "/fairgameWallet/add/user",
    updateSuperAdmin: "/fairgameWallet/update/user",
    lockUnlockUser: "/user/lockUnlockUser",
    changePassword: "/fairgameWallet/changePassword",
    setExposureLimit: "/fairgameWallet/update/exposure",
    setCreditReferrence: "/fairgameWallet/update/creditReference",
    updateUserBalance:"/fairgameWallet/update/balance"
}
