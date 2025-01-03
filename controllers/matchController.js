const { Not } = require("typeorm");
const { expertDomain, redisKeys, userRoleConstant, redisKeysMatchWise, matchWiseBlockType, racingBettingType, casinoMicroServiceDomain, redisKeysMarketWise, tieCompleteBetType, matchBettingType, betResultStatus, marketBetType } = require("../config/contants");
const { logger } = require("../config/logger");
const { getFaAdminDomain, getUserExposuresGameWise, getUserExposuresTournament, getCasinoMatchDetailsExposure, getUserProfitLossMatch, getUserProfitLossTournament, getRedisKeys } = require("../services/commonService");
const { getUserDomainWithFaId } = require("../services/domainDataService");
const { getUserRedisKeys, getUserRedisKey, getHashKeysByPattern, getUserRedisData } = require("../services/redis/commonFunctions");
const { getUsersWithoutCount, getUserMatchLock, addUserMatchLock, deleteUserMatchLock, isAllChildDeactive, getUserById, getUser } = require("../services/userService");
const { apiCall, apiMethod, allApiRoutes } = require("../utils/apiService");
const { SuccessResponse, ErrorResponse } = require("../utils/response");
const { cardGames } = require("../../betFairBackend/config/contants");

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
          // redisIds.push(...[`${redisKeys.userTeamARate}${matchId}`, `${redisKeys.userTeamBRate}${matchId}`, `${redisKeys.userTeamCRate}${matchId}`, `${redisKeys.yesRateComplete}${matchId}`, `${redisKeys.noRateComplete}${matchId}`, `${redisKeys.yesRateTie}${matchId}`, `${redisKeys.noRateTie}${matchId}`]);

          let redisData = [];
          if (redisIds?.length > 0) {
            redisData = await getUserRedisKeys(userId, redisIds);
          }
          let sessionResult = [];
          let matchResult = await getHashKeysByPattern(userId, `*_${matchId}`);
          redisData?.forEach((item, index) => {
            if (item) {
                sessionResult.push({
                  betId: redisIds?.[index]?.split("_")[0],
                  maxLoss: JSON.parse(item)?.maxLoss,
                  totalBet: JSON.parse(item)?.totalBet,
                  profitLoss: JSON.parse(item)?.betPlaced,
              });
            }
          });
          apiResponse.data[i].profitLossDataSession = sessionResult;
          apiResponse.data[i].profitLossDataMatch = matchResult;
        }
      }
      else {
        const redisIds = apiResponse?.data?.sessionBettings?.map((item) => JSON.parse(item)?.id + redisKeys.profitLoss);
        // redisIds.push(...[`${redisKeys.userTeamARate}${matchId}`, `${redisKeys.userTeamBRate}${matchId}`, `${redisKeys.userTeamCRate}${matchId}`, `${redisKeys.yesRateComplete}${matchId}`, `${redisKeys.noRateComplete}${matchId}`, `${redisKeys.yesRateTie}${matchId}`, `${redisKeys.noRateTie}${matchId}`]);

        let redisData = [];
          if (redisIds?.length > 0) {
            redisData = await getUserRedisKeys(userId, redisIds);
          }
          let sessionResult = [];
          let matchResult = await getHashKeysByPattern(userId, `*_${matchId}`);
        redisData?.forEach((item, index) => {
          if (item) {
              sessionResult.push({
                betId: redisIds?.[index]?.split("_")[0],
                maxLoss: JSON.parse(item)?.maxLoss,
                totalBet: JSON.parse(item)?.totalBet,
                profitLoss: JSON.parse(item)?.betPlaced,

              });
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
exports.raceDetails = async (req, res) => {
  try {
    let userId = req.user.id;
    let domain = expertDomain;
    let apiResponse = {};
    try {
      apiResponse = await apiCall(
        apiMethod.get,
        domain + allApiRoutes.MATCHES.raceDetails + req.params.id
      );
    } catch (error) {
      throw error?.response?.data;
    }

    if (apiResponse?.data) {
      if (Array.isArray(apiResponse?.data)) {
        for (let [index, matchData] of apiResponse?.data?.entries() || []) {
          const matchId = matchData?.id;

          let redisData = await getUserRedisKey(userId, `${matchId}${redisKeys.profitLoss}`);
          if (redisData) {
            redisData = JSON.parse(redisData);
          }
          apiResponse.data[index].profitLossDataMatch = redisData;
        }
      }
      else {
        const matchId = apiResponse?.data?.id;
        let redisData = await getUserRedisKey(userId, `${matchId}${redisKeys.profitLoss}`);
        
        if (redisData) {
          redisData = JSON.parse(redisData);
        }
        apiResponse.data.profitLossDataMatch = redisData;
      }
    }
    return SuccessResponse(
      {
        statusCode: 200,
        data: apiResponse.data
      },
      req,
      res
    );
  } catch (err) {
    return ErrorResponse(err, req, res);
  }
};

exports.cardDetails = async (req, res) => {
  try {
    let userId = req.user.id;
    let domain = expertDomain;
    let apiResponse = {};
    try {
      apiResponse = await apiCall(
        apiMethod.get,
        domain + allApiRoutes.MATCHES.cardDetails + req.params.type
      );
    } catch (error) {
      throw error?.response?.data;
    }

    if (apiResponse?.data) {
      let roundData = null;
    try {
      const url = casinoMicroServiceDomain + allApiRoutes.MICROSERVICE.casinoData + type

      let data = await apiCall(apiMethod.get, url);
      roundData = data?.data;
    }
    catch (error) {
      throw {
        message: {
          msg: "bet.notLive"
        }
      };
    }

      let cardRedisKeys = Object.keys(roundData?.t2)?.map((item) => `${roundData?.t1?.mid}_${item?.sid}${redisKeys.card}`);

      let redisData = await getUserRedisKeys(userId, cardRedisKeys);
      apiResponse.data.profitLoss = {};
      redisData?.forEach((item, index) => {
        if (item) {
          apiResponse.data.profitLoss[cardRedisKeys[index]] = item;
        }
      });
    }
    return SuccessResponse(
      {
        statusCode: 200,
        data: apiResponse.data
      },
      req,
      res
    );
  } catch (err) {
    return ErrorResponse(err, req, res);
  }
};

exports.otherMatchDetails = async (req, res) => {
  const matchType = req.query.matchType;
  try {
    const userId = req.user.id;
    let domain = expertDomain;
    let apiResponse = {};
    try {
      apiResponse = await apiCall(
        apiMethod.get,
        domain + allApiRoutes.MATCHES.otherMatchDetails + req.params.id
      );
    } catch (error) {
      throw error?.response?.data;
    }
    let matchId = req.params.id;
    if (apiResponse?.data) {
      if (Array.isArray(apiResponse?.data)) {
        for (let i = 0; i < apiResponse?.data?.length; i++) {
          const matchId = apiResponse?.data?.[i]?.id;
          let matchResult = await getHashKeysByPattern(userId, `*_${matchId}`);

          apiResponse.data[i].profitLossDataMatch = matchResult;
        }
      }
      else {
          const matchId = apiResponse?.data?.id;
          let matchResult = await getHashKeysByPattern(userId, `*_${matchId}`);
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
    logger.error({
      error: `Error at get match details for ${matchType}`,
      stack: err.stack,
      message: err.message,
    });
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

exports.matchLock = async (req, res) => {
  try {
    const { matchId, type, block } = req.body;
    let reqUser = req.user;

    const childUsers = await getUsersWithoutCount(reqUser.roleName == userRoleConstant.fairGameWallet ? { id: Not(reqUser?.id) } : { createBy: reqUser.id }, ["id", "userName"]);
    const allChildUserIds = [...childUsers.map(obj => obj.id), reqUser.id];

    let returnData;
    for (const blockUserId of allChildUserIds) {
      returnData = await userBlockUnlockMatch(blockUserId, matchId, reqUser, block, type);
    }

    let allChildMatchDeactive = true;
    let allChildSessionDeactive = true;

    const allDeactive = await isAllChildDeactive({ createBy: reqUser.id, id: Not(reqUser.id) }, ['userMatchLock.id'], matchId);
    allDeactive.forEach(ob => {
      if (!ob.userMatchLock_id || !ob.userMatchLock_matchLock) {
        allChildMatchDeactive = false;
      }
      if (!ob.userMatchLock_id || !ob.userMatchLock_sessionLock) {
        allChildSessionDeactive = false;
      }
    });

    let domainData;


    if (reqUser.roleName == userRoleConstant.fairGameAdmin) {
      domainData = await getFaAdminDomain(req.user, null, {});
    }
    else {
      domainData = await getUserDomainWithFaId({});
    }

    for (let url of domainData) {
      await apiCall(apiMethod.post, url?.domain + allApiRoutes.matchLock, {
        userId: reqUser.id, matchId: matchId, type: type, block: block, roleName: reqUser.roleName, operationToAll: true
      }, {})
        .then((data) => data)
        .catch((err) => {
          logger.error({
            context: `error in ${url?.domain} setting match lock`,
            process: `User ID : ${req.user.id} `,
            error: err.message,
            stake: err.stack,
          });
          throw err;
        });
    }

    return SuccessResponse({
      statusCode: 200,
      message: { msg: "updated", keys: { name: "User" } },
      data: { returnData, allChildMatchDeactive, allChildSessionDeactive },
    }, req, res);
  } catch (error) {
    return ErrorResponse(error, req, res);
  }
  
  async function userBlockUnlockMatch(userId, matchId, reqUser, block, type) {
    let userAlreadyBlockExit = await getUserMatchLock({ userId, matchId, blockBy: reqUser.id });

    if (!userAlreadyBlockExit) {
      if (!block) {
        throw { message: { msg: "notUnblockFirst" } };
      }

      const object = {
        userId,
        matchId,
        blockBy: reqUser.id,
        matchLock: type == matchWiseBlockType.match && block,
        sessionLock: type != matchWiseBlockType.match && block
      };

      addUserMatchLock(object);
      return object;
    }

    if (type == matchWiseBlockType.match) {
      userAlreadyBlockExit.matchLock = block;
    } else {
      userAlreadyBlockExit.sessionLock = block;
    }

    if (!block && !(userAlreadyBlockExit.matchLock || userAlreadyBlockExit.sessionLock)) {
      await deleteUserMatchLock({ id: userAlreadyBlockExit.id });
      return userAlreadyBlockExit;
    }

    addUserMatchLock(userAlreadyBlockExit);
    return userAlreadyBlockExit;
  }

}

exports.checkMatchLock = async (req, res) => {
  try {
    const { matchId } = req.query;
    const { id, roleName } = req.user;

    let blockObj = {
      match: {
        parentBlock: false,
        selfBlock: false
      },
      session: {
        parentBlock: false,
        selfBlock: false
      }
    };

    if (roleName == userRoleConstant.fairGameAdmin) {
      const userData = await getUserById(id, ["createBy"]);

      blockObj.match.parentBlock = !!(await getUserMatchLock({ userId: id, matchId, blockBy: userData.createBy, sessionLock: false }));
      blockObj.match.selfBlock = !!(await getUserMatchLock({ userId: id, matchId, blockBy: id, sessionLock: false }));

      blockObj.session.parentBlock = !!(await getUserMatchLock({ userId: id, matchId, blockBy: userData.createBy, sessionLock: true }));
      blockObj.session.selfBlock = !!(await getUserMatchLock({ userId: id, matchId, blockBy: id, sessionLock: true }));
    }
    else {
      blockObj.match.selfBlock = !!(await getUserMatchLock({ userId: id, matchId, blockBy: id, sessionLock: false }));

      blockObj.session.selfBlock = !!(await getUserMatchLock({ userId: id, matchId, blockBy: id, sessionLock: true }));
    }

    return SuccessResponse({ statusCode: 200, data: blockObj }, req, res);

  } catch (error) {
    logger.error({ message: "Error in check match lock.", stack: error?.stack, context: error?.message });
    return ErrorResponse(error, req, res);
  }
}

exports.checkChildDeactivate = async (req, res) => {
  const { matchId } = req.query;
  let reqUser = req.user;
  let allChildMatchDeactive = true;
  let allChildSessionDeactive = true;
  let allDeactive = await isAllChildDeactive({ createBy: reqUser.id, id: Not(reqUser.id) }, ['userMatchLock.id', 'userMatchLock.matchLock', 'userMatchLock.sessionLock'], matchId);
  allDeactive.forEach(ob => {
    if (!ob.userMatchLock_id) {
      allChildMatchDeactive = false;
      allChildSessionDeactive = false;
    } else {
      if (!ob.userMatchLock_matchLock) {
        allChildMatchDeactive = false;
      }
      if (!ob.userMatchLock_sessionLock) {
        allChildSessionDeactive = false;
      }
    }
  })

  return SuccessResponse({
    statusCode: 200,
    message: { msg: "updated", keys: { name: "User unlock" } },
    data: { allChildMatchDeactive, allChildSessionDeactive },
  }, req, res);
}

exports.listRacingMatch = async (req, res) => {
  try {
    // let user = req.user;
    let domain = expertDomain;
    let apiResponse = {};
    try {
      apiResponse = await apiCall(
        apiMethod.get,
        domain + allApiRoutes.MATCHES.racingMatchList,
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
        message: { msg: "match details", keys: { name: "Match" } },
        data: apiResponse.data,
      },
      req,
      res
    );
  } catch (err) {
    return ErrorResponse(err, req, res);
  }
};

exports.listRacingCountryCode = async (req, res) => {
  try {
    let domain = expertDomain;
    let apiResponse = {};
    try {
      apiResponse = await apiCall(
        apiMethod.get,
        domain + allApiRoutes.MATCHES.racingMatchCountryCodeList,
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
        message: { msg: "match details", keys: { name: "Match" } },
        data: apiResponse.data,
      },
      req,
      res
    );
  } catch (err) {
    return ErrorResponse(err, req, res);
  }
};

exports.raceAdd = async (req, res) => {
  try {
    const domainData = await getUserDomainWithFaId();

    let promiseArray = []

    for (let url of domainData) {
      const promise = apiCall(apiMethod.post, url?.domain + allApiRoutes.addRace, req.body).then();
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

exports.raceMarketAnalysis = async (req, res) => {
  try {
    let user = req.user;
    const matchId = req.query.matchId;
    let apiResponse = {};
    try {
      let url = expertDomain + allApiRoutes.MATCHES.raceBettingDetail + matchId + "?type=" + racingBettingType.matchOdd;
      apiResponse = await apiCall(apiMethod.get, url);
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
      let data = await apiCall(apiMethod.get, url?.domain + allApiRoutes.bets.betCount, null, {}, { ...(user.roleName == userRoleConstant.fairGameAdmin ? { parentId: user.id } : {}), matchId: matchId }).then((data) => data).catch((err) => {
        logger.error({
          context: `error in ${url?.domain} setting bet placed redis`,
          process: `User ID : ${user.id} `,
          error: err.message,
          stake: err.stack,
        });
      });
      bets.push(...(data?.data ?? []));
    }


    let runners = apiResponse.data?.runners;
    let totalBet = bets?.reduce((prev, curr) => { return curr?.matchId == matchId ? prev + parseInt(curr?.count) : prev }, 0);

    let redisData = await getUserRedisKey(user.id, `${matchId}${redisKeys.profitLoss}`);
    redisData = JSON.parse(redisData);
    runners = runners?.map((item) => (
      {
        name: item?.runnerName,
        id: item?.id,
        profitLoss: redisData?.[item?.id]
      }
    ));    

    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "fetched", keys: { name: "Market analysis" } },
        data: {
          profitLoss: runners,
          totalBet: totalBet
        },
      },
      req,
      res
    );
  } catch (err) {
    return ErrorResponse(err, req, res);
  }
};

exports.userEventWiseExposure = async (req, res) => {
  try {
    const { userId } = req.params;
    const { domain } = req.query;
    let result = {};
    if (domain) {
      let apiResponse = {};
      try {
        apiResponse = await apiCall(
          apiMethod.get,
          domain + allApiRoutes.getEventWiseExposure + userId,
          null,
          null,
          {
            stopAt: "isNull"
          }
        );
      } catch (error) {
        throw error?.response?.data;
      }
      result = apiResponse?.data;
    }
    else {
      const user = await getUser({ id: userId });
      if (!user) {
        return ErrorResponse(
          {
            statusCode: 404,
            message: {
              msg: "notFound",
              keys: { name: "User" },
            },
          },
          req,
          res
        );
      }
      const eventNameByMatchId = {};
      let apiResponse = {};
      try {
        apiResponse = await apiCall(
          apiMethod.get,
          expertDomain + allApiRoutes.MATCHES.matchList,
          null,
          null,
          {
            stopAt: "isNull"
          }
        );
      } catch (error) {
        throw error?.response?.data;
      }

      const matchList = apiResponse?.data?.matches;

      for (let item of matchList) {
        eventNameByMatchId[item.id] = { type: item.matchType, name: item.title };
      }

      let gamesExposure = await getUserExposuresGameWise(user);
      let tournamentExposure = await getUserExposuresTournament(user);

      const allMatchBetData = { ...(gamesExposure || {}), ...(tournamentExposure || {}) };

      if (Object.keys(allMatchBetData || {}).length) {
        for (let item of Object.keys(allMatchBetData)) {
          if (eventNameByMatchId[item]) {
            if (!result[eventNameByMatchId[item]?.type]) {
              result[eventNameByMatchId[item].type] = { exposure: 0, match: {} };
            }
            result[eventNameByMatchId[item].type].exposure = (result[eventNameByMatchId[item].type].exposure || 0) + allMatchBetData[item];
            if (!result[eventNameByMatchId[item].type].match[item]) {
              result[eventNameByMatchId[item].type].match[item] = { name: eventNameByMatchId[item].name, exposure: allMatchBetData[item] };
            }
            else {
              result[eventNameByMatchId[item].type].match[item] = { name: eventNameByMatchId[item].name, exposure: (result[eventNameByMatchId[item].type].match[item]?.exposure || 0) + allMatchBetData[item] };
            }
          }
        }
      }

      const cardData = await getCasinoMatchDetailsExposure(user);
      result.card = {
        exposure: cardData.totalExposure,
        match: Object.keys(cardData.cardWiseExposure || {}).map((item) => {
          return { name: cardGames.find((items) => items.type == item)?.name, type: item, exposure: cardData.cardWiseExposure[item] }
        })
      };
    }
    return SuccessResponse(
      {
        statusCode: 200,
        data: result
      },
      req,
      res
    );

  } catch (err) {
    return ErrorResponse(err, req, res);
  }
};


exports.marketAnalysis = async (req, res) => {
  try {
    const { matchId, domain } = req.query;
    const userId = req.query.userId || req.user.id;

    if (domain) {
      let data = await apiCall(apiMethod.get, domain + allApiRoutes.marketAnalysis, null, {}, {
        matchId: matchId,
        userId: userId
      }).then((data) => data).catch((err) => {
        logger.error({
          context: `error in ${domain} getting market analysis`,
          process: `User ID : ${userId} `,
          error: err.message,
          stake: err.stack,
        });
        throw err;
      });
      return SuccessResponse(
        {
          statusCode: 200,
          data: data?.data
        },
        req,
        res
      );
    }

    // let redisData = await getUserRedisData(userId);
    const result = [];

    // if (redisData) {
    //   // const user = await getUser({ id: userId });
    //   // let domainData = await getFaAdminDomain({ id: userId });
    //   //   let matchesBetsByUsers = [];
    //   //   for (let url of domainData) {
    //   //     let data = await apiCall(apiMethod.get, url?.domain + allApiRoutes.bets.placedBet, null, {}, {
    //   //       deleteReason: "isNull",
    //   //       result: `inArr${JSON.stringify([betResultStatus.PENDING])}`,
    //   //       ...(user.roleName == userRoleConstant.fairGameAdmin ? { userId: user.id, roleName: userRoleConstant.fairGameAdmin } : {}),
    //   //       ...(matchId ? { matchId: `eq${matchId}` } : {}),
    //   //       isTeamNameAllow: false,
    //   //     }).then((data) => data).catch((err) => {
    //   //       logger.error({
    //   //         context: `error in ${url?.domain} setting bet placed redis`,
    //   //         process: `User ID : ${user.id} `,
    //   //         error: err.message,
    //   //         stake: err.stack,
    //   //       });
    //   //     });
    //   //     matchesBetsByUsers.push(...(data?.data?.rows ?? []));
    //   //   }

    //   // let matchIds = new Set();

    //   // for (let item of matchesBetsByUsers) {
    //   //   matchIds.add(item.matchId);
    //   // }
    //   // let matchDetails;

    //   // if (matchesBetsByUsers?.length) {
    //   //   try {
    //   //     matchDetails = await apiCall(
    //   //       apiMethod.get,
    //   //       expertDomain + allApiRoutes.MATCHES.matchDetails + Array.from(matchIds).join(",")
    //   //     );
    //   //     if (!Array.isArray(matchDetails?.data)) {
    //   //       matchDetails.data = [matchDetails?.data];
    //   //     }
    //   //   } catch (error) {
    //   //     throw error?.response?.data;
    //   //   }
    //   //   for (let item of matchesBetsByUsers) {
    //   //     const currMatchDetail = result.findIndex((items) => items?.matchId == item?.matchId);
    //   //     const currMatchData = matchDetails?.data?.find((items) => items?.id == item?.matchId);

    //   //     if (item?.marketBetType == marketBetType.SESSION) {
    //   //       const currRedisData = JSON.parse(redisData?.[item?.betId + redisKeys.profitLoss]);
    //   //       if (currMatchDetail == -1) {
    //   //         result.push({
    //   //           title: currMatchData?.title,
    //   //           matchId: item?.matchId,
    //   //           startAt: currMatchData?.startAt,
    //   //           eventType: item?.eventType,
    //   //           betType: {
    //   //             [item?.marketType]: [{
    //   //               betId: item?.betId,
    //   //               eventName: item?.eventName,
    //   //               profitLoss: currRedisData
    //   //             }]
    //   //           }
    //   //         })
    //   //       }
    //   //       else {
    //   //         if (!result[currMatchDetail].betType[item?.marketType]) {
    //   //           result[currMatchDetail].betType[item?.marketType] = [];
    //   //         }
    //   //         result[currMatchDetail].betType[item?.marketType].push({
    //   //           betId: item?.betId,
    //   //           eventName: item?.eventName,
    //   //           profitLoss: currRedisData
    //   //         });
    //   //       }
    //   //     }
    //   //     else {
    //   //       const currMatchData = matchDetails?.data?.find((items) => items?.id == item?.matchId);
    //   //       let teams, currRedisData;
    //   //       if (Object.values(tieCompleteBetType).includes(item?.marketType)) {
    //   //         teams = ["YES", "NO"];
    //   //         let redisDataKey = getRedisKeys(item?.marketType, item?.matchId, redisKeys, item?.betId);
    //   //         currRedisData = {
    //   //           a: redisData[redisDataKey.teamArateRedisKey],
    //   //           b: redisData[redisDataKey.teamBrateRedisKey],
    //   //           c: isNaN(redisData[redisDataKey.teamCrateRedisKey]) ? 0 : redisData[redisDataKey.teamCrateRedisKey],
    //   //         };
    //   //       }
    //   //       else if (item?.marketType == matchBettingType.tournament) {
    //   //         currRedisData = {};
    //   //         let currBetPL = JSON.parse(redisData[item?.betId + redisKeys.profitLoss + "_" + item?.matchId]);
    //   //         teams = currMatchData?.tournament?.find((items) => items?.id == item?.betId)?.runners?.sort((a, b) => a.sortPriority - b.sortPriority)?.map((items, i) => {
    //   //           currRedisData[String.fromCharCode(97 + i)] = currBetPL[items?.id];
    //   //           return items?.runnerName
    //   //         });
    //   //       }
    //   //       else if (item?.marketType == matchBettingType.other) {
    //   //         const currBet = currMatchData?.other?.find((items) => items?.id == item?.betId)?.metaData;
    //   //         teams = [currBet?.teamA, currBet?.teamB, ...(currBet?.teamC ? [currBet?.teamC] : [])]
    //   //         let redisDataKey = getRedisKeys(item?.marketType, item?.matchId, redisKeys, item?.betId);
    //   //         currRedisData = {
    //   //           a: redisData[redisDataKey.teamArateRedisKey],
    //   //           b: redisData[redisDataKey.teamBrateRedisKey],
    //   //           c: isNaN(redisData[redisDataKey.teamCrateRedisKey]) ? 0 : redisData[redisDataKey.teamCrateRedisKey],
    //   //         };
    //   //       }
    //   //       else {
    //   //         teams = [currMatchData?.teamA, currMatchData?.teamB, ...(currMatchData?.teamC ? [currMatchData?.teamC] : [])]
    //   //         currRedisData = redisKeysMarketWise[item?.marketType]?.map((items) => redisData[items + item?.betId]);
    //   //         let redisDataKey = getRedisKeys(item?.marketType, item?.matchId, redisKeys, item?.betId);
    //   //         currRedisData = {
    //   //           a: redisData[redisDataKey.teamArateRedisKey],
    //   //           b: redisData[redisDataKey.teamBrateRedisKey],
    //   //           c: isNaN(redisData[redisDataKey.teamCrateRedisKey]) ? 0 : redisData[redisDataKey.teamCrateRedisKey],
    //   //         };
    //   //       }

    //   //       if (currMatchDetail == -1) {
    //   //         result.push({
    //   //           title: currMatchData?.title,
    //   //           matchId: item?.matchId,
    //   //           startAt: currMatchData?.startAt,
    //   //           eventType: item?.eventType,
    //   //           betType: {
    //   //             match: [{
    //   //               marketName: item?.bettingName,
    //   //               betId: item?.betId,
    //   //               eventName: item?.eventName,
    //   //               profitLoss: currRedisData,
    //   //               marketType: item?.marketType,
    //   //               teams: teams
    //   //             }]
    //   //           }
    //   //         })
    //   //       }
    //   //       else {
    //   //         if (!result[currMatchDetail].betType.match) {
    //   //           result[currMatchDetail].betType.match = [];
    //   //         }
    //   //         result[currMatchDetail].betType.match.push({
    //   //           marketName: item?.bettingName,
    //   //           betId: item?.betId,
    //   //           eventName: item?.eventName,
    //   //           profitLoss: currRedisData,
    //   //           marketType: item?.marketType,
    //   //           teams: teams
    //   //         });
    //   //       }
    //   //     }
    //   //   }
    //   // }
    // }
    // else {
      const user = await getUser({ id: userId });
      const [matchData, tournamentData] = await Promise.all([getUserProfitLossMatch(user, matchId), getUserProfitLossTournament(user, matchId)]);
      let matchDetails;

      try {
        matchDetails = await apiCall(
          apiMethod.get,
          expertDomain + allApiRoutes.MATCHES.matchDetails + matchId
        );
      } catch (error) {
        throw error?.response?.data;
      }

      result.push({
        title: matchDetails?.data?.title,
        matchId: matchDetails?.data?.id,
        startAt: matchDetails?.data?.startAt,
        eventType: matchDetails?.data?.matchType,
        betType: {}
      });
      for (let item of Object.values(matchData.session)) {
        let { betDetails, ...profitLoss } = item;
        if (!result[0].betType[betDetails?.marketType]) {
          result[0].betType[betDetails?.marketType] = [];
        }
        result[0].betType = {
          [betDetails?.marketType]: [...result[0].betType?.[betDetails?.marketType], {
            betId: betDetails?.betId,
            eventName: betDetails?.eventName,
            type:betDetails?.marketType,
            profitLoss: profitLoss
          }]
        }
      }
      for (let item of Object.values(matchData.match)) {
        let { betDetails, ...profitLoss } = item;
        let currRedisData, teams;
        if (Object.values(tieCompleteBetType).includes(betDetails?.marketType)) {
          teams = ["YES", "NO"];
          let redisDataKey = getRedisKeys(betDetails?.marketType, betDetails?.matchId, redisKeys, betDetails?.betId);
          currRedisData = {
            a: profitLoss.data[redisDataKey.teamArateRedisKey],
            b: profitLoss.data[redisDataKey.teamBrateRedisKey],
            c: isNaN(profitLoss.data[redisDataKey.teamCrateRedisKey]) ? 0 : profitLoss.data[redisDataKey.teamCrateRedisKey],
          };
        }
        else if (item?.marketType == matchBettingType.other) {
          const currBet = matchDetails?.data?.other?.find((items) => items?.id == betDetails?.betId)?.metaData;
          teams = [currBet?.teamA, currBet?.teamB, ...(currBet?.teamC ? [currBet?.teamC] : [])]
          let redisDataKey = getRedisKeys(betDetails?.marketType, betDetails?.matchId, redisKeys, betDetails?.betId);
          currRedisData = {
            a: profitLoss.data[redisDataKey.teamArateRedisKey],
            b: profitLoss.data[redisDataKey.teamBrateRedisKey],
            c: isNaN(profitLoss.data[redisDataKey.teamCrateRedisKey]) ? 0 : profitLoss.data[redisDataKey.teamCrateRedisKey],
          };
        }
        else {
          teams = [matchDetails?.data?.teamA, matchDetails?.data?.teamB, ...(matchDetails?.data?.teamC ? [matchDetails?.data?.teamC] : [])]
          currRedisData = redisKeysMarketWise[betDetails?.marketType]?.map((items) => profitLoss.data[items + betDetails?.betId]);
          let redisDataKey = getRedisKeys(betDetails?.marketType, betDetails?.matchId, redisKeys, betDetails?.betId);
          currRedisData = {
            a: profitLoss.data[redisDataKey.teamArateRedisKey],
            b: profitLoss.data[redisDataKey.teamBrateRedisKey],
            c: isNaN(profitLoss.data[redisDataKey.teamCrateRedisKey]) ? 0 : profitLoss.data[redisDataKey.teamCrateRedisKey],
          };
        }

        if (!result[0].betType.match) {
          result[0].betType.match = [];
        }
        result[0].betType.match.push({
          marketName: betDetails?.bettingName,
          betId: betDetails?.betId,
          eventName: betDetails?.eventName,
          profitLoss: currRedisData,
          marketType: betDetails?.marketType,
          teams: teams
        });
      }
      for (let item of Object.values(tournamentData)) {
        let { betDetails, data } = item;
        let currRedisData={}, teams;
        let currBetPL = data[betDetails?.betId + redisKeys.profitLoss + "_" + betDetails?.matchId];
        teams = matchDetails.data?.tournament?.find((items) => items?.id == betDetails?.betId)?.runners?.sort((a, b) => a.sortPriority - b.sortPriority)?.map((items, i) => {
          currRedisData[String.fromCharCode(97 + i)] = currBetPL[items?.id];
          return items?.runnerName
        });

        if (!result[0].betType.match) {
          result[0].betType.match = [];
        }
        result[0].betType.match.push({
          marketName: betDetails?.bettingName,
          betId: betDetails?.betId,
          eventName: betDetails?.eventName,
          profitLoss: currRedisData,
          marketType: betDetails?.marketType,
          teams: teams
        });
      }
    // }

    return SuccessResponse(
      {
        statusCode: 200,
        data: result
      },
      req,
      res
    );

  } catch (err) {
    return ErrorResponse(err, req, res);
  }
};