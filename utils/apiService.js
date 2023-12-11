const axios = require('axios');
// create common api call function using axios to call external server http call for whole project GET <POST< PUT< DELETE
exports.apiMethod = {
    get: "get",
    post: "post",
    put: "put",
    delete: "delete"
}
exports.apiCall = async (method, url, data, headers) => {
  try {
    let response = await axios({
      method: method,
      url: url,
      data: data,
      headers: headers
    });
    return response.data;
  } catch (error) {
    console.log(error);
    throw new error;
  }
};

exports.allApiRoutes = {
    //user routes
    createUser: "/user/add",
    createSuperAdmin: "/user/create/superadmin",
    updateUser: "/user/updateUser",
    updateSuperAdmin: "/user/update/superadmin",
    lockUnlockUser: "/user/lockUnlockUser",
    insertWallet: "/user/insert/wallet",
    changePassword: "/user/changePassword",
    setExposureLimit: "/user/update/exposurelimit",
    userList: "/user/list",
    userSearchList: "/user/searchlist",
    userBalanceDetails: "/user/balance",
    setCreditReferrence: "/user/update/creditreferrence",
    generateTransactionPassword: "/user/generateTransactionPassword",
}
