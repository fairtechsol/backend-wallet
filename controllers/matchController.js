const { expertDomain, redisKeys, marketBetType, userRoleConstant, betResultStatus } = require("../config/contants");
const { logger } = require("../config/logger");
const { getFaAdminDomain } = require("../services/commonService");
const { getUserDomainWithFaId, getDomainDataByFaId } = require("../services/domainDataService");
const { getUserRedisKeys } = require("../services/redis/commonFunctions");
const { apiCall, apiMethod, allApiRoutes } = require("../utils/apiService");
const { SuccessResponse, ErrorResponse } = require("../utils/response");

exports.matchDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    let domain = expertDomain;
    let apiResponse = {};
    try {
      apiResponse = await apiCall(
        apiMethod.get,
        domain + allApiRoutes.MATCHES.matchDetails + req.params.id
      );
    } catch (error) {
      throw error?.response?.data;
    }
    let matchId = req.params.id;
    if (apiResponse?.data) {
      if (Array.isArray(apiResponse?.data)) {
        for (let i = 0; i < apiResponse?.data?.length; i++) {
          const matchId = apiResponse?.data?.[i]?.id;
          const redisIds = apiResponse?.data?.[i]?.sessionBettings?.map((item) => JSON.parse(item)?.id + redisKeys.profitLoss);
          redisIds.push(...[`${redisKeys.userTeamARate}${matchId}`, `${redisKeys.userTeamBRate}${matchId}`, `${redisKeys.userTeamCRate}${matchId}`, `${redisKeys.yesRateComplete}${matchId}`, `${redisKeys.noRateComplete}${matchId}`, `${redisKeys.yesRateTie}${matchId}`, `${redisKeys.noRateTie}${matchId}`]);

          let redisData = await getUserRedisKeys(userId, redisIds);
          let sessionResult = [];
          let matchResult = {};
          redisData?.forEach((item, index) => {
            if (item) {
              if (index >= redisData?.length - 7) {
                matchResult[redisIds?.[index]?.split("_")[0]] = item;
              } else {
                sessionResult.push({
                  betId: redisIds?.[index]?.split("_")[0],
                  maxLoss: JSON.parse(item)?.maxLoss,
                  totalBet: JSON.parse(item)?.totalBet
                });
              }
            }
          });
          apiResponse.data[i].profitLossDataSession = sessionResult;
          apiResponse.data[i].profitLossDataMatch = matchResult;
        }
      }
      else {
        const redisIds = apiResponse?.data?.sessionBettings?.map((item) => JSON.parse(item)?.id + redisKeys.profitLoss);
        redisIds.push(...[`${redisKeys.userTeamARate}${matchId}`, `${redisKeys.userTeamBRate}${matchId}`, `${redisKeys.userTeamCRate}${matchId}`, `${redisKeys.yesRateComplete}${matchId}`, `${redisKeys.noRateComplete}${matchId}`, `${redisKeys.yesRateTie}${matchId}`, `${redisKeys.noRateTie}${matchId}`]);

        let redisData = await getUserRedisKeys(userId, redisIds);
        let sessionResult = [];
        let matchResult = {};
        redisData?.forEach((item, index) => {
          if (item) {
            if (index >= redisData?.length - 7) {
              matchResult[redisIds?.[index]?.split("_")[0]] = item;
            } else {
              sessionResult.push({
                betId: redisIds?.[index]?.split("_")[0],
                maxLoss: JSON.parse(item)?.maxLoss,
                totalBet: JSON.parse(item)?.totalBet

              });
            }
          }
        });
        apiResponse.data.profitLossDataSession = sessionResult;
        apiResponse.data.profitLossDataMatch = matchResult;
      }
    }

    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "match details", keys: { name: "Match" } },
        data: apiResponse.data
      },
      req,
      res
    );
  } catch (err) {
    return ErrorResponse(err, req, res);
  }
};

exports.listMatch = async (req, res) => {
  try {
    let user = req.user;
    let domain = expertDomain;
    let apiResponse = {};
    try {
      apiResponse = await apiCall(
        apiMethod.get,
        domain + allApiRoutes.MATCHES.matchList,
        null,
        null,
        req.query
      );
    } catch (error) {
      throw error?.response?.data;
    }

    let domainData;
    if (user.roleName == userRoleConstant.fairGameAdmin) {
      domainData = await getFaAdminDomain(user);
    }
    else {
      domainData = await getUserDomainWithFaId();
    }

    let bets = [];
    
    for (let url of domainData) {
      let data = await apiCall(apiMethod.get, url?.domain + allApiRoutes.bets.betCount, null, {}, { ...(user.roleName == userRoleConstant.fairGameAdmin ? { parentId: user.id } : {}) }).then((data) => data).catch((err) => {
        logger.error({
          context: `error in ${url?.domain} setting bet placed redis`,
          process: `User ID : ${user.id} `,
          error: err.message,
          stake: err.stack,
        });
      });
      bets.push(...(data?.data ?? []));
    }

    for (let i = 0; i < apiResponse.data?.matches?.length; i++) {
      let matchDetail = apiResponse.data?.matches[i];
      apiResponse.data.matches[i].totalBet = bets?.reduce((prev, curr) => { return curr?.matchId == matchDetail.id ? prev + parseInt(curr?.count): prev }, 0);

      const redisIds = [`${redisKeys.userTeamARate}${matchDetail?.id}`, `${redisKeys.userTeamBRate}${matchDetail?.id}`];

      let redisData = await getUserRedisKeys(user.id, redisIds);

      apiResponse.data.matches[i].teamARate = redisData?.[0];
      apiResponse.data.matches[i].teamBRate = redisData?.[1];
    }

    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "fetched", keys: { name: "Match list" } },
        data: apiResponse.data,
      },
      req,
      res
    );
  } catch (err) {
    return ErrorResponse(err, req, res);
  }
};


exports.addMatch = async (req, res) => {
  try {
    const domainData = await getUserDomainWithFaId();

    let promiseArray = []

    for (let url of domainData) {
      const promise = apiCall(apiMethod.post, url?.domain + allApiRoutes.addMatch, req.body).then();
      promiseArray.push(promise);
    }

    await Promise.allSettled(promiseArray)
      .catch(error => {
        throw error;
      });

    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "add", keys: { name: "Match" } },
      },
      req,
      res
    );
  } catch (err) {
    logger.error({
      context: "Error in add match user side.",
      message: err.message,
      stake: err.stack
    });
    return ErrorResponse(err, req, res);
  }
};


exports.matchLock=async (req,res)=>{
  try {
    let { domain } = req.body;

    try {
      const response = await apiCall(apiMethod.post, domain + allApiRoutes.matchLock, req.body);
      return SuccessResponse(
        response,
        req,
        res
      );
    } catch (error) {
      throw error?.response?.data
    }

    
  } catch (error) {
    logger.error({
      message: "Error at matchLock",
      context: error.message,
      stake: error.stack
    });

    return ErrorResponse(error, req, res);
  }
}