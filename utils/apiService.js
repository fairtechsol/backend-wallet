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
    let query = ''
    if (ReqQuery && Object.keys(ReqQuery).length) {
      query = Object.keys(ReqQuery)
        .map(key => `${key}=${ReqQuery[key]}`)
        .join('&');
      url = url + '?' + query
    }
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
  changePassword: "/fairgameWallet/changePassword",
  setExposureLimit: "/fairgameWallet/update/exposure",
  setCreditReferrence: "/fairgameWallet/update/creditReference",
  updateUserBalance: "/fairgameWallet/update/balance",
  lockUnlockSuperAdmin: "/fairgameWallet/lockUnlock",
  deleteMultipleBet: "/bet/deleteMultipleBet",
  declareResultSession: "/fairgameWallet/declare/result/session",
  unDeclareResultSession: "/fairgameWallet/unDeclare/result/session",
  declareNoResultSession: "/fairgameWallet/declare/noResult/session",
  declareResultMatch: "/fairgameWallet/declare/result/match",
  unDeclareResultMatch: "/fairgameWallet/unDeclare/result/match",
  addMatch:"/match/add",
  profitLoss: "/fairgameWallet/total/profitLoss",
  matchWiseProfitLoss:"/fairgameWallet/total/matchWise/profitLoss",
  betWiseProfitLoss:"/fairgameWallet/total/bet/profitLoss",
  sessionBetProfitLoss:"/fairgameWallet/total/session/profitLoss",
  isUserExist:"/fairgameWallet/user/exist",
  commissionReportsMatches:"/fairgameWallet/commissionMatch/",
  commissionReportsBetPlaced:"/fairgameWallet/commissionBetPlaced/",
  userList:"/fairgameWallet/user/list/",
  EXPERTS: {
    add: "/user/add",
    update: "/user/update",
    changePassword: "/user/admin/password",
    expertList: "/user/list",
    notification: "/general/notification",
    getCompetitionList: "/match/competitionList",
    getDatesByCompetition: "/match/competition/dates",
    getMatchByCompetitionAndDate: "/match/competition/getMatch",
    lockUnlockUser: "/user/lockUnlockUser",
    isUserExist: "/user/exist",
  },
  MATCHES: {
    matchDetails: "/superAdmin/match/",
    matchList: "/superAdmin/match/list",
    MatchBettingDetail: "/superAdmin/matchBetting/",
  },
  bets: {
    placedBet: "/fairgameWallet/getBet",
    betCount:"/fairgameWallet/betCounts"
  }
};
