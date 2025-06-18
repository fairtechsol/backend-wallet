const { Not } = require("typeorm");
const { expertDomain, redisKeys, userRoleConstant, matchWiseBlockType, racingBettingType, casinoMicroServiceDomain, oddsSessionBetType } = require("../config/contants");
const { logger } = require("../config/logger");
const { getFaAdminDomain, getUserExposuresGameWise, getCasinoMatchDetailsExposure, getUserProfitLossMatch } = require("../services/commonService");
const { getUserDomainWithFaId } = require("../services/domainDataService");
const { getUserRedisKeys, getUserRedisKey, getHashKeysByPattern, getAllSessions, getAllTournament, getProfitLossDataTournament } = require("../services/redis/commonFunctions");
const { getUsersWithoutCount, getUserMatchLock, addUserMatchLock, deleteUserMatchLock, isAllChildDeactive, getUserById, getUser } = require("../services/userService");
const { apiCall, apiMethod, allApiRoutes } = require("../utils/apiService");
const { SuccessResponse, ErrorResponse } = require("../utils/response");
const { cardGames } = require("../config/contants");
const { matchLockHandler, userEventWiseExposureHandler, marketAnalysisHandler, virtualEventWiseExposureHandler } = require("../grpc/grpcClient/handlers/wallet/matchHandler");
const { getMatchDetailsHandler, getRaceDetailsHandler, getCardDetailsHandler, getMatchListHandler, getMatchRaceBettingHandler, getRaceListHandler, getRaceCountryCodeListHandler } = require("../grpc/grpcClient/handlers/expert/matchHandler");
const { getBetCountHandler } = require("../grpc/grpcClient/handlers/wallet/betsHandler");

exports.matchDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    let apiResponse = {};
    try {
      apiResponse = await getMatchDetailsHandler({ matchId: req.params.id })
    } catch (error) {
      throw error?.response?.data;
    }
    let matchId = req.params.id;
    if (apiResponse?.data) {
      if (Array.isArray(apiResponse?.data)) {
        for (let i = 0; i < apiResponse?.data?.length; i++) {
          const matchId = apiResponse?.data?.[i]?.id;

          let redisData = [];
          if (apiResponse?.data?.[i]?.sessionBettings?.length > 0) {
            redisData = await getAllSessions(userId, matchId);
          }

          let sessionResult = [];
          const matchResult = await getAllTournament(userId, matchId);
          Object.entries(redisData?.[matchId] || {})?.forEach(([betIdItem, betData]) => {
            if (betIdItem) {
              sessionResult.push({
                betId: betIdItem,
                maxLoss: betData?.maxLoss,
                totalBet: betData?.totalBet,
                profitLoss: oddsSessionBetType.includes(marketTypes?.[betIdItem]) ? betData?.betPlaced : betData?.betPlaced?.reduce((prev, curr) => {
                  prev[curr.odds] = curr?.profitLoss;
                  return prev;
                }, {})
              });
            }
          });

          apiResponse.data[i].profitLossDataSession = sessionResult;
          apiResponse.data[i].profitLossDataMatch = matchResult;
        }
      }
      else {

        let redisData = [];
        const marketTypes = apiResponse?.data?.sessionBettings?.reduce((prev, curr) => {
          const currData = JSON.parse(curr?.betData || "{}");
          prev[currData?.id] = currData?.marketType;
          return prev;
        }, {});

        if (apiResponse?.data?.sessionBettings?.length > 0) {
          redisData = await getAllSessions(userId, matchId);
        }
        let sessionResult = [];
        const matchResult = await getAllTournament(userId, matchId);
        Object.entries(redisData?.[matchId] || {})?.forEach(([betIdItem, betData]) => {
          if (betIdItem) {
            sessionResult.push({
              betId: betIdItem,
              maxLoss: betData?.maxLoss,
              totalBet: betData?.totalBet,
              profitLoss: oddsSessionBetType.includes(marketTypes?.[betIdItem]) ? betData?.betPlaced : betData?.betPlaced?.reduce((prev, curr) => {
                prev[curr.odds] = curr?.profitLoss;
                return prev;
              }, {})
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
    let apiResponse = {};
    try {
      apiResponse = await getRaceDetailsHandler({ matchId: req.params.id });
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
    let apiResponse = {};
    try {
      apiResponse = await getCardDetailsHandler({ type: req.params.type });
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

exports.listMatch = async (req, res) => {
  try {
    let user = req.user;
    let apiResponse = {};
    try {
      apiResponse = await getMatchListHandler({ query: JSON.stringify(req.query) });
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

    const betPromises = domainData.map((url) => {
      return getBetCountHandler(
        {
          ...(user.roleName === userRoleConstant.fairGameAdmin ? { parentId: user.id } : {})
        },
        url?.domain
      ).catch((err) => {
        logger.error({
          context: `error in ${url?.domain} setting bet placed redis`,
          process: `User ID : ${user.id} `,
          error: err.message,
          stake: err.stack,
        });
        return []; // fallback to empty array on failure
      });
    });

    const betResults = await Promise.all(betPromises);
    const bets = betResults.flat();


    for (let i = 0; i < apiResponse.data?.matches?.length; i++) {
      let matchDetail = apiResponse.data?.matches[i];
      apiResponse.data.matches[i].totalBet = bets?.reduce((prev, curr) => { return curr?.matchId == matchDetail.id ? prev + parseInt(curr?.count) : prev }, 0);

      let redisData = await getProfitLossDataTournament(user.id, matchDetail?.id, matchDetail?.matchOddTournament?.id);
      if (redisData) {
        const runners = matchDetail?.matchOddTournament?.runners?.sort((a, b) => a.sortPriority - b.sortPriority);
        apiResponse.data.matches[i].teamARate = redisData?.[runners?.[0]?.id] || 0;
        apiResponse.data.matches[i].teamBRate = redisData?.[runners?.[1]?.id];
      }
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

    await Promise.all(domainData.map(url => {
      return matchLockHandler({
        userId: reqUser.id,
        matchId: matchId,
        type: type,
        block: block,
        roleName: reqUser.roleName,
        operationToAll: true
      }, url?.domain).catch((err) => {
        logger.error({
          context: `error in ${url?.domain} setting match lock`,
          process: `User ID : ${req.user.id} `,
          error: err.message,
          stake: err.stack,
        });
        throw err;
      });
    }));


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
    let apiResponse = {};
    try {
      apiResponse = await getRaceListHandler({ query: JSON.stringify(req.query) });
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
    let apiResponse = {};
    try {
      apiResponse = await getRaceCountryCodeListHandler({ matchType: req.query.matchType });
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

exports.raceMarketAnalysis = async (req, res) => {
  try {
    let user = req.user;
    const matchId = req.query.matchId;
    let apiResponse = {};
    try {
      apiResponse = await getMatchRaceBettingHandler({ matchId: matchId, name: racingBettingType.matchOdd });
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

    const betPromises = domainData.map((url) => {
      return getBetCountHandler(
        {
          ...(user.roleName === userRoleConstant.fairGameAdmin ? { parentId: user.id } : {}),
          matchId: matchId,
        },
        url?.domain
      )
        .catch((err) => {
          logger.error({
            context: `error in ${url?.domain} setting bet placed redis`,
            process: `User ID : ${user.id} `,
            error: err.message,
            stake: err.stack,
          });
          return []; // return empty array on error to keep structure
        });
    });

    const betResults = await Promise.all(betPromises);
    const bets = betResults.flat(); // flatten array of arrays

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
      try {
        result = await userEventWiseExposureHandler({ userId: userId }, domain);
      } catch (error) {
        throw error?.response?.data;
      }
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
        apiResponse = await getMatchListHandler({ query: JSON.stringify({ stopAt: "isNull" }) });
      } catch (error) {
        throw error?.response?.data;
      }

      const matchList = apiResponse?.data?.matches;

      for (let item of matchList) {
        eventNameByMatchId[item.id] = { type: item.matchType, name: item.title };
      }

      let gamesExposure = await getUserExposuresGameWise(user);

      const allMatchBetData = gamesExposure || {};

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
      let virtualExposureData = { exposure: 0, match: {} };
      let domainData = await getFaAdminDomain(user);

      for (let url of domainData) {
        let data = await virtualEventWiseExposureHandler({ roleName: user.roleName, userId: user.id }, url?.domain).catch((err) => {
          logger.error({
            context: `error in ${url?.domain} user wise exposure`,
            process: `User ID : ${user.id} `,
            error: err.message,
            stake: err.stack,
          });
        });
        if (data) {
          virtualExposureData = {
            exposure: Math.abs(virtualExposureData.exposure || 0) + Math.abs(data?.exposure || 0),
            match: virtualExposureData.match
          }
          Object.keys(data?.match || {}).forEach((curr) => {
            virtualExposureData.match[curr] = { name: data?.match[curr]?.gameName, type: data?.match[curr]?.providerName, exposure: Math.abs(virtualExposureData?.match?.[curr]?.exposure || 0) + Math.abs(data?.match[curr]?.totalAmount) }
          })
        }
      }
      result.virtual = { exposure: virtualExposureData.exposure, match: Object.values(virtualExposureData.match || {}) };
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
      let data = await marketAnalysisHandler({ matchId: matchId, userId: userId }, domain).catch((err) => {
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
          data: data
        },
        req,
        res
      );
    }

    const user = await getUser({ id: userId });
    const matchData = await getUserProfitLossMatch(user, matchId);
    let matchDetails;

    try {
      matchDetails = await getMatchDetailsHandler({ matchId: matchId });
    } catch (error) {
      throw error?.response?.data;
    }
    let result = [];
    result.push({
      title: matchDetails?.data?.title,
      matchId: matchDetails?.data?.id,
      startAt: matchDetails?.data?.startAt,
      eventType: matchDetails?.data?.matchType,
      betType: {}
    });
    for (let item of Object.values(matchData.session)) {
      let { betDetails, ...profitLoss } = item;
      if (!result[0].betType["session"]) {
        result[0].betType["session"] = [];
      }
      result[0].betType = {
        session: [...result[0].betType?.["session"], {
          betId: betDetails?.betId,
          eventName: betDetails?.eventName,
          type: betDetails?.marketType,
          profitLoss: profitLoss
        }]
      }
    }

    for (let item of Object.values(matchData.match)) {
      let { betDetails, data } = item;
      let currRedisData = {}, teams;
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
