const grpc = require("@grpc/grpc-js");
const { __mf } = require("i18n");
const { logger } = require("../../../config/logger");
const { getUserDomainWithFaId } = require("../../../services/domainDataService");
const { addMatchHandler, addRaceMatchHandler } = require("../../grpcClient/handlers/wallet/matchHandler");
const { CardResultTypeWin } = require("../../../services/cardService/cardResultTypeWinPlayer");
const { getCasinoCardResult, getCardResultData } = require("../../../services/cardService");
const { getUser } = require("../../../services/userService");
const { userRoleConstant } = require("../../../config/contants");
const { updateSuperAdminData } = require("../../../services/commonService");
const { updateUserBalanceData } = require("../../../services/userBalanceService");
const { getUserRedisData, incrementValuesRedis } = require("../../../services/redis/commonFunctions");


exports.addMatch = async (call) => {
  try {
    const domainData = await getUserDomainWithFaId();

    let promiseArray = []

    for (let url of domainData) {
      const promise = addMatchHandler(call.request, url?.domain);
      promiseArray.push(promise);
    }

    await Promise.allSettled(promiseArray)
      .catch(error => {
        throw error;
      });

    return {}
  } catch (err) {
    logger.error({
      context: "Error in add match user side.",
      message: err.message,
      stake: err.stack
    });
    throw {
      code: grpc.status.INTERNAL,
      message: err?.message || __mf("internalServerError"),
    };
  }
};

exports.raceAdd = async (call) => {
  try {
    const domainData = await getUserDomainWithFaId();

    let promiseArray = []

    for (let url of domainData) {
      const promise = addRaceMatchHandler(call.request, url?.domain);
      promiseArray.push(promise);
    }

    await Promise.allSettled(promiseArray)
      .catch(error => {
        throw error;
      });

    return {}
  } catch (err) {
    logger.error({
      context: "Error in add match user side.",
      message: err.message,
      stake: err.stack
    });
    throw {
      code: grpc.status.INTERNAL,
      message: err?.message || __mf("internalServerError"),
    };
  }
};


exports.getCardResult = async (call) => {
  try {

    const { type,...query } = JSON.parse(call.request?.query||"{}");
    const currGameWinner = new CardResultTypeWin(type).getCardGameProfitLoss();
    const select = ['cardResult.gameType as "gameType"', "cardResult.id as id", 'cardResult.createdAt as "createdAt"', currGameWinner, `"cardResult".result ->> 'mid' as mid`]

    let result = await getCasinoCardResult(query, { gameType: type }, select);

    return {data:JSON.stringify(result)};
    
  } catch (error) {
    logger.error({
      error: `Error while getting card results.`,
      stack: error.stack,
      message: error.message,
    });
    throw {
      code: grpc.status.INTERNAL,
      message: err?.message || __mf("internalServerError"),
    };
  }
}

exports.getCardResultDetail = async (call) => {
  try {
    const { id } = call.result;
    const result = await getCardResultData(`result ->> 'mid' = '${id}' `);

    return {data:JSON.stringify(result)};

  } catch (error) {
    logger.error({
      error: `Error while getting card result detail.`,
      stack: error.stack,
      message: error.message,
    });
    throw {
      code: grpc.status.INTERNAL,
      message: err?.message || __mf("internalServerError"),
    };
  }
}

exports.declareVirtualCasinoResult = async (call) => {
  try {

    const { profitLoss, fairgameAdminPL, fairgameWalletPL, superAdminData } = JSON.parse(call.request?.data || "{}");

    const fgWallet = await getUser({
      roleName: userRoleConstant?.fairGameWallet
    }, ["id"]);

    await updateSuperAdminData({ superAdminData }, "Virtual casino");
    if (fairgameAdminPL) {
      await updateUserBalanceData(fairgameAdminPL.id, {
        profitLoss: profitLoss,
        myProfitLoss: fairgameAdminPL?.myProfitLoss,
        balance: 0
      });
      let parentUserRedisData = await getUserRedisData(fairgameAdminPL.id);
      if (parentUserRedisData?.exposure) {
        await incrementValuesRedis(fairgameAdminPL.id, {
          profitLoss: profitLoss,
          myProfitLoss: fairgameAdminPL?.myProfitLoss,
        });
      }
    }
    // updating Parent user balance
    await updateUserBalanceData(fgWallet.id, {
      profitLoss: profitLoss,
      myProfitLoss: fairgameWalletPL,
      balance: 0
    });
    let parentUserRedisData = await getUserRedisData(fgWallet.id);
    if (parentUserRedisData?.exposure) {
      await incrementValuesRedis(fgWallet.id, {
        profitLoss: profitLoss,
        myProfitLoss: fairgameWalletPL,
      });
    }
    return {}
  } catch (error) {
    logger.error({
      error: `Error at declare virtual casino match result for the expert.`,
      stack: error?.stack,
      message: error?.message,
    });
    // Handle any errors and return an error response
    throw {
      code: grpc.status.INTERNAL,
      message: err?.message || __mf("internalServerError"),
    };
  }
}

