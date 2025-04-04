const grpc = require("@grpc/grpc-js");
const { __mf } = require("i18n");
const _ = require("lodash");
const { logger } = require("../../../config/logger");
const { getUserDomainWithFaId } = require("../../../services/domainDataService");
const { mergeBetsArray, settingBetsDataAtLogin, settingTournamentMatchBetsDataAtLogin } = require("../../../services/commonService");
const { getBets } = require("../../grpcClient/handlers/wallet/betsHandler");
const { userRoleConstant } = require("../../../config/contants");
const { getUser } = require("../../../services/userService");
const { getUserRedisData } = require("../../../services/redis/commonFunctions");

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

    const betData = await getUserRedisData(user.id);
    if (betData) {
      Object.keys(betData)?.forEach((item) => {
        if (item?.includes(redisKeys.profitLoss)) {
          result[item] = betData[item];
        }
      });
    }
    else {
      result = await settingBetsDataAtLogin(user);
      let tournamentMatchBetData = await settingTournamentMatchBetsDataAtLogin(user);
      result = { ...result, ...tournamentMatchBetData }
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