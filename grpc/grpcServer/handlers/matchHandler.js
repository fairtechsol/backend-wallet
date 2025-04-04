const grpc = require("@grpc/grpc-js");
const { __mf } = require("i18n");
const { logger } = require("../../../config/logger");
const { getUserDomainWithFaId } = require("../../../services/domainDataService");
const { addMatchHandler, addRaceMatchHandler } = require("../../grpcClient/handlers/wallet/matchHandler");


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