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
    createUser: "/user/add",
    createSuperAdmin: "/fairgameWallet/add/user",
    updateUser: "/user/updateUser",
    updateSuperAdmin: "/fairgameWallet/update/user",
    lockUnlockUser: "/user/lockUnlockUser",
    insertWallet: "/user/insert/wallet",
    changePassword: "/user/changePassword",
    setExposureLimit: "/fairgameWallet/update/exposure",
    userList: "/user/list",
    userSearchList: "/user/searchlist",
    userBalanceDetails: "/user/balance",
    setCreditReferrence: "/fairgameWallet/update/creditReference",
    generateTransactionPassword: "/user/generateTransactionPassword",
    updateUserBalance:"/fairgameWallet/update/balance",
    lockUnlockSuperAdmin:"/fairgameWallet/lockUnlock"
}
