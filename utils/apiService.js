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
  //user routes
  createSuperAdmin: "/fairgameWallet/add/user",
  updateSuperAdmin: "/fairgameWallet/update/user",
  changePassword: "/fairgameWallet/changePassword",
  setExposureLimit: "/fairgameWallet/update/exposure",
  setCreditReferrence: "/fairgameWallet/update/creditReference",
  updateUserBalance: "/fairgameWallet/update/balance",
  lockUnlockSuperAdmin: "/fairgameWallet/lockUnlock",
  deleteMultipleBet: "/bet/deleteMultipleBet",
  deleteMultipleBetForOther:"/bet/deleteMultipleBetForOther",
  deleteMultipleBetForRace:"/bet/deleteMultipleBetForRace",
  deleteMultipleBetForTournament:"/bet/deleteMultipleBetForTournament",
  declareResultSession: "/fairgameWallet/declare/result/session",
  unDeclareResultSession: "/fairgameWallet/unDeclare/result/session",
  declareNoResultSession: "/fairgameWallet/declare/noResult/session",
  declareResultMatch: "/fairgameWallet/declare/result/match",
  declareResultOtherMatch: "/fairgameWallet/declare/result/other/match",
  declareResultOtherMarket: "/fairgameWallet/declare/result/other/market",
  declareResultTournametMatch: "/fairgameWallet/declare/result/tournament/match",
  declareResultRaceMatch: "/fairgameWallet/declare/result/race/match",
  declareResultCardMatch: "/fairgameWallet/declare/result/card/match",
  unDeclareResultMatch: "/fairgameWallet/unDeclare/result/match",
  unDeclareResultOtherMatch: "/fairgameWallet/unDeclare/result/other/match",
  unDeclareResultOtherMarket: "/fairgameWallet/unDeclare/result/other/market",
  unDeclareResultRaceMatch: "/fairgameWallet/unDeclare/result/race/match",
  unDeclareResultTournamentMatch: "/fairgameWallet/unDeclare/result/tournament/match",
  addMatch:"/match/add",
  addRace: "/match/raceAdd",
  cardProfitLoss: "/fairgameWallet/card/total/profitLoss",
  cardMatchWiseProfitLoss:"/fairgameWallet/card/total/matchWise/profitLoss",
  cardBetWiseProfitLoss:"/fairgameWallet/card/total/bet/profitLoss",
  profitLoss: "/fairgameWallet/total/profitLoss",
  matchWiseProfitLoss:"/fairgameWallet/total/matchWise/profitLoss",
  userWiseProfitLoss:"/fairgameWallet/userwise/profitLoss",
  betWiseProfitLoss:"/fairgameWallet/total/bet/profitLoss",
  sessionBetProfitLoss:"/fairgameWallet/total/session/profitLoss",
  isUserExist:"/fairgameWallet/user/exist",
  commissionReportsMatches:"/fairgameWallet/commissionMatch/",
  commissionReportsBetPlaced:"/fairgameWallet/commissionBetPlaced/",
  userList:"/fairgameWallet/user/list/",
  userTotalBalance:"/fairgameWallet/child/totalBalance",
  userBalanceSum:"/fairgameWallet/users/balanceSum/",
  commissionSettled:"/fairgameWallet/settle/commission",
  matchLock:"/fairgameWallet/userMatchLock",
  userProfitLoss:"/fairgameWallet/user/profitLossData/",
  userProfitLossRacing:"/fairgameWallet/user/profitLossData/race/",
  checkExposureLimit: "/fairgameWallet/user/exposureLimitCheck",
  deleteUser: "/fairgameWallet/user/delete/",
  checkUserBalance: "/fairgameWallet/check/userBalance",
  getSearchList: "/fairgameWallet/user/searchList",
  changeDeleteBetReason: "/fairgameWallet/bet/change/deleteReason",
  getEventWiseExposure: "/fairgameWallet/eventWise/exposure/",
  marketAnalysis: "/fairgameWallet/marketAnalysis",
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
    updateDeleteReason: "/superAdmin/update/deleteReason",
  },
  MATCHES: {
    matchDetails: "/superAdmin/match/",
    raceDetails: "/superAdmin/match/racing/",
    cardDetails: "/superAdmin/match/card/",
    otherMatchDetails: "/superAdmin/otherMatch/",
    matchList: "/superAdmin/match/list",
    MatchBettingDetail: "/superAdmin/matchBetting/",
    raceBettingDetail : "/superAdmin/raceBetting/",
    racingMatchList: "/superAdmin/match/racing/list",
    racingMatchCountryCodeList: "/superAdmin/match/racing/countryCode",
    tournamentBettingDetail : "/superAdmin/tournamentBetting/",
  },
  bets: {
    placedBet: "/fairgameWallet/getBet",
    betCount:"/fairgameWallet/betCounts"
  },
  MICROSERVICE : {
    casinoData:"/getdata/"
  }
};
