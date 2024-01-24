const { expertDomain, redisKeys } = require("../config/contants");
const { logger } = require("../config/logger");
const { getUserDomainWithFaId } = require("../services/domainDataService");
const { getUserRedisKeys } = require("../services/redis/commonFunctions");
const { apiCall, apiMethod, allApiRoutes } = require("../utils/apiService");
const { SuccessResponse, ErrorResponse } = require("../utils/response");

exports.matchDetails = async (req, res) => {
  try {
    const userId=req.user.id;
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
    const redisIds = apiResponse?.data?.sessionBettings?.map((item)=> JSON.parse(item)?.id+redisKeys.profitLoss );
    redisIds.push(...[`${redisKeys.userTeamARate}${matchId}`,`${redisKeys.userTeamBRate}${matchId}`,`${redisKeys.userTeamCRate}${matchId}`,`${redisKeys.yesRateComplete}${matchId}`,`${redisKeys.noRateComplete}${matchId}`,`${redisKeys.yesRateTie}${matchId}`,`${redisKeys.noRateTie}${matchId}`]);

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
            profitLossData: JSON.parse(item),
          });
        }
      }
    });

    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "match details", keys: { name: "Match" } },
        data: {
          ...apiResponse.data,
          profitLossDataSession: sessionResult,
          profitLossDataMatch: matchResult,
        },
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
     const promise= apiCall(apiMethod.post, url?.domain + allApiRoutes.addMatch, req.body).then();
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
      context:"Error in add match user side.",
      message: err.message,
      stake: err.stack
    });
    return ErrorResponse(err, req, res);
  }
};
