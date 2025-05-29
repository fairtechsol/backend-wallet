const grpc = require("@grpc/grpc-js");
const { __mf } = require("i18n");
const _ = require("lodash");
const { logger } = require("../../../config/logger");
const { getUserDomainWithFaId } = require("../../../services/domainDataService");
const { mergeBetsArray, settingBetsDataAtLogin } = require("../../../services/commonService");
const { getBets, sessionProfitLossUserWiseData, sessionProfitLossBetsData } = require("../../grpcClient/handlers/wallet/betsHandler");
const { userRoleConstant, redisKeys } = require("../../../config/contants");
const { getUser } = require("../../../services/userService");
const { getUserRedisData, getAllSessions } = require("../../../services/redis/commonFunctions");

exports.getPlacedBets = async (call) => {
  try {
    const { userId, roleName, domain, ...query } = JSON.parse(call?.request?.query || "{}");
    const domainData = await getUserDomainWithFaId();
    let result = [];
    const userData = await getUser({ roleName: userRoleConstant.fairGameWallet }, ["id", "roleName"]);

    let promiseArray = []
    if (domain) {
      let promise = getBets({ query: JSON.stringify({ ...query, roleName: roleName || userData.roleName, userId: userId || userData.id }) }, domain);
      promiseArray.push(promise);
    }
    else {
      for (let url of domainData) {
        let promise = getBets({ query: JSON.stringify({ ...query, roleName: roleName || userData.roleName, userId: userId || userData.id }) }, url?.domain);
        promiseArray.push(promise);
      }
    }
    await Promise.allSettled(promiseArray)
      .then(async results => {
        for (let item of results) {
          if (item?.status == "fulfilled") {
            result = await mergeBetsArray(result, item?.value?.rows);
          }
        }
      })
      .catch(error => {
        logger.error({
          error: `Error at get bet for the domain.`,
          stack: error.stack,
          message: error.message,
        });
      });


    return { data: JSON.stringify(result) }
  } catch (error) {
    logger.error({
      error: `Error at get bet.`,
      stack: error.stack,
      message: error.message,
    });
    throw {
      code: grpc.status.INTERNAL,
      message: error?.message || __mf("internalServerError"),
    };
  }
}

exports.getWalletLoginBetsData = async () => {
  try {
    const user = await getUser({
      roleName: userRoleConstant.fairGameWallet
    });

    let result = {};

    const betData = await getAllSessions(user.id);
    if (Object.values(betData).length > 0) {
      Object.entries(betData)?.forEach(([matchId, vals]) => {
        Object.entries(vals)?.forEach(([betId, betData]) => {
          const upperKey = `session:expert:${matchId}:${betId}:upperLimitOdds`;
          const lowerKey = `session:expert:${matchId}:${betId}:lowerLimitOdds`;
          const totalBetKey = `session:expert:${matchId}:${betId}:totalBet`;
          const profitLossKey = `session:expert:${matchId}:${betId}:profitLoss`;
          const maxLossKey = `session:expert:${matchId}:${betId}:maxLoss`;

          result[upperKey] = betData?.upperLimitOdds || 0;
          result[lowerKey] = betData?.lowerLimitOdds || 0;
          result[totalBetKey] = betData?.totalBet || 0;
          result[profitLossKey] = betData?.betPlaced?.reduce((prev, curr) => {
            prev[curr?.odds] = curr?.profitLoss || 0;
            return prev;
          }, {}) || {};
          result[maxLossKey] = betData?.maxLoss || 0;
        });
      });
    }
    else {
      const data = await settingBetsDataAtLogin(user);
      if (data?.plResult) {
        Object.entries(data?.plResult)?.forEach(([matchId, vals]) => {
          if (matchId.includes("profitLoss")&&!matchId.startsWith("match")) {
            vals = vals.reduce((acc, curr) => {
              acc[curr.odds] = curr.profitLoss || 0;
              return acc;
            }, {});
          }
          result[matchId?.replace(user.id, "expert")] = vals;
        })
      }
    }

    return { data: JSON.stringify(result) };
  }
  catch (error) {
    logger.error({
      error: `Error at getting bet data from wallet.`,
      stack: error.stack,
      message: error.message,
    });
    // Handle any errors and return an error response
    throw {
      code: grpc.status.INTERNAL,
      message: error?.message || __mf("internalServerError"),
    };
  }
}

exports.getUserWiseSessionBetProfitLossExpert = async (call) => {
  try {
    let { betId } = call.request;
    const domainData = await getUserDomainWithFaId();
    let result = [];

    for (let url of domainData) {

      let response = await sessionProfitLossUserWiseData({ betId: betId }, url.domain)
        .catch((err) => {
          logger.error({
            context: `error in ${url.domain} getting user list`,
            error: err.message,
            stake: err.stack,
          });
          throw err;
        });

      response = response?.map((item) => {
        return {
          ...item, url: url.domain
        }
      });
      result = [...result, ...response];
    }
    return { data: JSON.stringify(result) };


  } catch (error) {
    logger.error({
      context: `error in get all bets profit loss`,
      error: error.message,
      stake: error.stack,
    });
    throw {
      code: grpc.status.INTERNAL,
      message: error?.message || __mf("internalServerError"),
    };
  }
}

exports.getResultBetProfitLoss = async (call) => {
  try {
    let { matchId, betId, isSession, url, id, userId, roleName } = call.request;
    let data = [];

    let newUserTemp = {};
    newUserTemp.roleName = roleName;
    newUserTemp.id = userId;
    if (url) {

      let response = await sessionProfitLossBetsData({ user: newUserTemp, matchId: matchId, betId: betId, isSession: isSession, searchId: userId || id, partnerShipRoleName: userRoleConstant.fairGameWallet }, url)
        .catch((err) => {
          logger.error({
            context: `error in ${url} getting profit loss for all bets.`,
            process: `User ID : ${req.user.id} `,
            error: err.message,
            stake: err.stack,
          });
          throw err;
        });

      data = response;
    }
    else {
      let domainData = await getUserDomainWithFaId();

      for (let domain of domainData) {
        let response = await sessionProfitLossBetsData({ user: newUserTemp, matchId: matchId, betId: betId, isSession: isSession, searchId: id, partnerShipRoleName: userRoleConstant.fairGameWallet }, domain?.domain)
          .catch((err) => {
            logger.error({
              context: `error in ${domain?.domain} getting profit loss for all bets.`,
              process: `User ID : ${req.user.id} `,
              error: err.message,
              stake: err.stack,
            });
            throw err;
          });

        data?.push(...response);
      }
    }
    return { data: JSON.stringify(data) };

  } catch (error) {
    logger.error({
      context: `error in get all bets profit loss`,
      error: error.message,
      stake: error.stack,
    });
    throw {
      code: grpc.status.INTERNAL,
      message: error?.message || __mf("internalServerError"),
    };
  }
}