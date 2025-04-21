const axios = require('axios');

// create common api call function using axios to call external server http call for whole project GET <POST< PUT< DELETE
exports.apiMethod = {
  get: "get",
  post: "post",
  put: "put",
  delete: "delete"
}
exports.apiCall = async (method, url, data, headers, ReqQuery) => {
  try {
    let response = await axios({
      method: method,
      url: url,
      data: data,
      headers: headers,
      params: ReqQuery
    });
    let resData = response.data;
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
