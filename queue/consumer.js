const Queue = require('bee-queue');
const lodash = require('lodash');
const { getUserRedisData, incrementValuesRedis } = require('../services/redis/commonFunctions');
const { updateUserBalanceExposure } = require('../services/userBalanceService');
const { calculateExpertRate, calculateProfitLossSession, mergeProfitLoss, calculateRacingExpertRate, parseRedisData, calculateProfitLossSessionOddEven, calculateProfitLossSessionCasinoCricket, calculateProfitLossSessionFancy1, calculateProfitLossKhado, calculateProfitLossMeter } = require('../services/commonService');
const { logger } = require('../config/logger');
const { redisKeys, partnershipPrefixByRole, userRoleConstant, socketData, sessionBettingType } = require('../config/contants');
const { sendMessageToUser } = require('../sockets/socketManager');
const { getUsersWithoutCount } = require('../services/userService');
const { In } = require('typeorm');
const { CardProfitLoss } = require('../services/cardService/cardProfitLossCalc');
const walletRedisOption = {
  removeOnSuccess: true,
  redis: {
    port: process.env.EXTERNAL_REDIS_PORT,
    host: process.env.EXTERNAL_REDIS_HOST
  }
}

const WalletMatchBetQueue = new Queue('walletMatchBetQueue', walletRedisOption);
const WalletSessionBetQueue = new Queue('walletSessionBetQueue', walletRedisOption);
const WalletMatchRacingBetQueue = new Queue('walletMatchRacingBetQueue', walletRedisOption);
const WalletCardMatchBetQueue = new Queue('walletCardMatchBetQueue', walletRedisOption);
const walletSessionBetDeleteQueue = new Queue('walletSessionBetDeleteQueue', walletRedisOption);
const walletMatchBetDeleteQueue = new Queue('walletMatchBetDeleteQueue', walletRedisOption);
const walletRaceMatchBetDeleteQueue = new Queue('walletRaceMatchBetDeleteQueue', walletRedisOption);
const walletTournamentMatchBetDeleteQueue = new Queue('walletTournamentMatchBetDeleteQueue', walletRedisOption);
const WalletMatchTournamentBetQueue = new Queue('walletMatchTournamentBetQueue', walletRedisOption);

WalletMatchBetQueue.process(async function (job, done) {
  let jobData = job.data;
  let userId = jobData.userId;
  try {
    await calculateRateAmount(jobData, userId);
    return done(null, {});
  } catch (error) {
    logger.info({
      file: `error in bet Queue for User id : ${userId}`,
      error: error.message
    })
    return done(null, {});
  }
});

let calculateRateAmount = async (jobData, userId) => {
  let partnershipObj = JSON.parse(jobData.partnerships);
  let userCurrentExposure = jobData.newUserExposure;
  let userOldExposure = jobData.userPreviousExposure
  let obj = {
    teamA: jobData.teamA,
    teamB: jobData.teamB,
    teamC: jobData.teamC,
    winAmount: jobData.winAmount,
    lossAmount: jobData.lossAmount,
    bettingType: jobData.bettingType,
    betOnTeam: jobData.betOnTeam
  }

  const partnerShipIds = [userId];
  Object.keys(partnershipObj)?.forEach((item) => {
    if (item.includes("PartnershipId")) {
      partnerShipIds.push(partnershipObj[item]);
    }
  });

  const usersData = await getUsersWithoutCount({
    id: In(partnerShipIds)
  }, ["id"]);

  const userIds = usersData?.map((item) => item.id);

  updateUserBalanceExposure(userIds, {
    exposure: -userOldExposure + userCurrentExposure
  });

  Object.keys(partnershipPrefixByRole)
    ?.filter(
      (item) =>
        item == userRoleConstant.fairGameAdmin ||
        item == userRoleConstant.fairGameWallet
    )
    ?.map(async (item) => {
      let partnerShipKey = `${partnershipPrefixByRole[item]}`;
      // Check if partnershipId exists in partnershipObj
      if (partnershipObj[`${partnerShipKey}PartnershipId`]) {
        let partnershipId = partnershipObj[`${partnerShipKey}PartnershipId`];
        let partnership = partnershipObj[`${partnerShipKey}Partnership`];
        try {
          // Get user data from Redis or balance data by userId
          let masterRedisData = await getUserRedisData(partnershipId);
          if (!lodash.isEmpty(masterRedisData)) {

            let masterExposure = masterRedisData.exposure ? masterRedisData.exposure : 0;
            let partnerExposure = (parseFloat(masterExposure) || 0) - userOldExposure + userCurrentExposure;

            let teamRates = {
              teamA: parseFloat((parseFloat(masterRedisData[jobData.teamArateRedisKey]) || 0.0).toFixed(2)),
              teamB: parseFloat((parseFloat(masterRedisData[jobData.teamBrateRedisKey]) || 0.0).toFixed(2)),
              teamC: jobData.teamCrateRedisKey ? parseFloat((parseFloat(masterRedisData[jobData.teamCrateRedisKey]) || 0.0).toFixed(2)) : 0.0
            }
            let teamData = await calculateExpertRate(teamRates, obj, partnership);
            let userRedisObj = {
              [jobData.teamArateRedisKey]: teamData.teamA,
              [jobData.teamBrateRedisKey]: teamData.teamB,
              ...(jobData.teamCrateRedisKey ? { [jobData.teamCrateRedisKey]: teamData.teamC } : {})
            }
            await incrementValuesRedis(partnershipId, { [redisKeys.userAllExposure]: parseFloat(parseFloat(-parseFloat(userOldExposure) + parseFloat(userCurrentExposure)).toFixed(2)) }, userRedisObj);
            jobData.myStake = Number(((jobData.stake / 100) * partnership).toFixed(2));
            logger.info({
              context: "User team rates",
              process: `User ID : ${userId} ${item} id ${partnershipId} ${jobData?.newBet?.matchId}`,
              data: { teamData, jobData, oldTeamRates: teamRates }
            });
            sendMessageToUser(partnershipId, socketData.MatchBetPlaced, { userRedisObj, jobData });
            // Log information about exposure and stake update
            logger.info({
              context: "Update User Exposure and Stake at the match bet",
              process: `User ID : ${userId} ${item} id ${partnershipId}`,
              data: `My Stake : ${jobData.myStake} exposure: ${partnerExposure}`
            });

          }
        } catch (error) {
          logger.error({
            context: `error in ${item} exposure update`,
            process: `User ID : ${userId} and ${item} id ${partnershipId}`,
            error: error.message,
            stake: error.stack
          })
        }
      }
    }
    );
}

WalletMatchRacingBetQueue.process(async function (job, done) {
  let jobData = job.data;
  let userId = jobData.userId;
  try {
    await calculateRacingRateAmount(jobData, userId);
    return done(null, {});
  } catch (error) {
    logger.info({
      file: `error in bet Queue for User id : ${userId}`,
      error: error.message,
      jobData
    })
    return done(null, {});
  }
});

let calculateRacingRateAmount = async (jobData, userId) => {
  let partnershipObj = JSON.parse(jobData.partnerships);
  let userCurrentExposure = jobData.newUserExposure;
  let userOldExposure = jobData.userPreviousExposure
  let obj = {
    runners: jobData.runners,
    winAmount: jobData.winAmount,
    lossAmount: jobData.lossAmount,
    bettingType: jobData.bettingType,
    runnerId: jobData.runnerId
  }

  const partnerShipIds = [userId];
  Object.keys(partnershipObj)?.forEach((item) => {
    if (item.includes("PartnershipId")) {
      partnerShipIds.push(partnershipObj[item]);
    }
  });

  const usersData = await getUsersWithoutCount({
    id: In(partnerShipIds)
  }, ["id"]);

  const userIds = usersData?.map((item) => item.id);

  updateUserBalanceExposure(userIds, {
    exposure: -userOldExposure + userCurrentExposure
  });

  Object.keys(partnershipPrefixByRole)
    ?.filter(
      (item) =>
        item == userRoleConstant.fairGameAdmin ||
        item == userRoleConstant.fairGameWallet
    )
    ?.map(async (item) => {
      let partnerShipKey = `${partnershipPrefixByRole[item]}`;
      // Check if partnershipId exists in partnershipObj
      if (partnershipObj[`${partnerShipKey}PartnershipId`]) {
        let partnershipId = partnershipObj[`${partnerShipKey}PartnershipId`];
        let partnership = partnershipObj[`${partnerShipKey}Partnership`];
        try {
          // Get user data from Redis or balance data by userId
          let masterRedisData = await getUserRedisData(partnershipId);
          if (!lodash.isEmpty(masterRedisData)) {

            let masterExposure = masterRedisData.exposure ? masterRedisData.exposure : 0;
            let partnerExposure = (parseFloat(masterExposure) || 0) - userOldExposure + userCurrentExposure;

            let teamRates = masterRedisData?.[`${jobData?.matchId}${redisKeys.profitLoss}`];

            if (teamRates) {
              teamRates = JSON.parse(teamRates);
            }

            if (!teamRates) {
              teamRates = jobData?.runners?.reduce((acc, key) => {
                acc[key?.id] = 0;
                return acc;
              }, {});
            }

            teamRates = Object.keys(teamRates).reduce((acc, key) => {
              acc[key] = parseRedisData(key, teamRates);
              return acc;
            }, {});

            let teamData = await calculateRacingExpertRate(teamRates, obj, partnership);
            let userRedisObj = {
              [`${jobData?.matchId}${redisKeys.profitLoss}`]: JSON.stringify(teamData)
            }
            await incrementValuesRedis(partnershipId, { [redisKeys.userAllExposure]: parseFloat(parseFloat(-parseFloat(userOldExposure) + parseFloat(userCurrentExposure)).toFixed(2)) }, userRedisObj);
            jobData.myStake = Number(((jobData.stake / 100) * partnership).toFixed(2));
            sendMessageToUser(partnershipId, socketData.MatchBetPlaced, { userRedisObj: teamData, jobData })
            // Log information about exposure and stake update
            logger.info({
              context: "Update User Exposure and Stake at the match bet",
              process: `User ID : ${userId} ${item} id ${partnershipId}`,
              data: `My Stake : ${jobData.myStake} exposure: ${partnerExposure}`
            });

          }
        } catch (error) {
          logger.error({
            context: `error in ${item} exposure update`,
            process: `User ID : ${userId} and ${item} id ${partnershipId}`,
            error: error.message,
            stake: error.stack
          })
        }
      }
    }
    );
}

WalletMatchTournamentBetQueue.process(async function (job, done) {
  let jobData = job.data;
  let userId = jobData.userId;
  try {
    await calculateTournamentRateAmount(jobData, userId);
    return done(null, {});
  } catch (error) {
    logger.info({
      file: `error in bet Queue for User id : ${userId}`,
      error: error.message,
      jobData
    })
    return done(null, {});
  }
});

let calculateTournamentRateAmount = async (jobData, userId) => {
  let partnershipObj = JSON.parse(jobData.partnerships);
  let userCurrentExposure = jobData.newUserExposure;
  let userOldExposure = jobData.userPreviousExposure
  let obj = {
    runners: jobData.runners,
    winAmount: jobData.winAmount,
    lossAmount: jobData.lossAmount,
    bettingType: jobData.bettingType,
    runnerId: jobData.runnerId
  }

  const partnerShipIds = [userId];
  Object.keys(partnershipObj)?.forEach((item) => {
    if (item.includes("PartnershipId")) {
      partnerShipIds.push(partnershipObj[item]);
    }
  });

  const usersData = await getUsersWithoutCount({
    id: In(partnerShipIds)
  }, ["id"]);

  const userIds = usersData?.map((item) => item.id);

  updateUserBalanceExposure(userIds, {
    exposure: -userOldExposure + userCurrentExposure
  });

  Object.keys(partnershipPrefixByRole)
    ?.filter(
      (item) =>
        item == userRoleConstant.fairGameAdmin ||
        item == userRoleConstant.fairGameWallet
    )
    ?.map(async (item) => {
      let partnerShipKey = `${partnershipPrefixByRole[item]}`;
      // Check if partnershipId exists in partnershipObj
      if (partnershipObj[`${partnerShipKey}PartnershipId`]) {
        let partnershipId = partnershipObj[`${partnerShipKey}PartnershipId`];
        let partnership = partnershipObj[`${partnerShipKey}Partnership`];
        try {
          // Get user data from Redis or balance data by userId
          let masterRedisData = await getUserRedisData(partnershipId);
          if (!lodash.isEmpty(masterRedisData)) {

            let masterExposure = masterRedisData.exposure ? masterRedisData.exposure : 0;
            let partnerExposure = (parseFloat(masterExposure) || 0) - userOldExposure + userCurrentExposure;

            let teamRates = masterRedisData?.[`${jobData?.betId}${redisKeys.profitLoss}_${jobData?.matchId}`];

            if (teamRates) {
              teamRates = JSON.parse(teamRates);
            }

            if (!teamRates) {
              teamRates = jobData?.runners?.reduce((acc, key) => {
                acc[key?.id] = 0;
                return acc;
              }, {});
            }

            teamRates = Object.keys(teamRates).reduce((acc, key) => {
              acc[key] = parseRedisData(key, teamRates);
              return acc;
            }, {});

            let teamData = await calculateRacingExpertRate(teamRates, obj, partnership);
            let userRedisObj = {
              [`${jobData?.betId}${redisKeys.profitLoss}_${jobData?.matchId}`]: JSON.stringify(teamData)
            }
            await incrementValuesRedis(partnershipId, { [redisKeys.userAllExposure]: parseFloat(parseFloat(-parseFloat(userOldExposure) + parseFloat(userCurrentExposure)).toFixed(2)) }, userRedisObj);
            jobData.myStake = Number(((jobData.stake / 100) * partnership).toFixed(2));
            sendMessageToUser(partnershipId, socketData.MatchBetPlaced, { userRedisObj: teamData, jobData })
            // Log information about exposure and stake update
            logger.info({
              context: "Update User Exposure and Stake at the match bet",
              process: `User ID : ${userId} ${item} id ${partnershipId}`,
              data: `My Stake : ${jobData.myStake} exposure: ${partnerExposure}`
            });

          }
        } catch (error) {
          logger.error({
            context: `error in ${item} exposure update`,
            process: `User ID : ${userId} and ${item} id ${partnershipId}`,
            error: error.message,
            stake: error.stack
          })
        }
      }
    }
    );
}

WalletCardMatchBetQueue.process(async function (job, done) {
  let jobData = job.data;
  let userId = jobData.userId;
  try {
    await calculateCardMatchRateAmount(jobData, userId);
    return done(null, {});
  } catch (error) {
    logger.info({
      file: `error in card bet Queue for User id : ${userId}`,
      error: error.message,
      jobData
    })
    return done(null, {});
  }
});

let calculateCardMatchRateAmount = async (jobData, userId) => {
  let partnershipObj = JSON.parse(jobData.partnerships);
  let userCurrentExposure = jobData.newUserExposure;
  let userOldExposure = jobData.userPreviousExposure

  const partnerShipIds = [userId];
  Object.keys(partnershipObj)?.forEach((item) => {
    if (item.includes("PartnershipId")) {
      partnerShipIds.push(partnershipObj[item]);
    }
  });

  const usersData = await getUsersWithoutCount({
    id: In(partnerShipIds)
  }, ["id"]);

  const userIds = usersData?.map((item) => item.id);

  updateUserBalanceExposure(userIds, {
    exposure: -userOldExposure + userCurrentExposure
  });

  Object.keys(partnershipPrefixByRole)
    ?.filter(
      (item) =>
        item == userRoleConstant.fairGameAdmin ||
        item == userRoleConstant.fairGameWallet
    )
    ?.map(async (item) => {
      let partnerShipKey = `${partnershipPrefixByRole[item]}`;
      // Check if partnershipId exists in partnershipObj
      if (partnershipObj[`${partnerShipKey}PartnershipId`]) {
        let partnershipId = partnershipObj[`${partnerShipKey}PartnershipId`];
        let partnership = partnershipObj[`${partnerShipKey}Partnership`];
        try {
          // Get user data from Redis or balance data by userId
          let masterRedisData = await getUserRedisData(partnershipId);
          if (!lodash.isEmpty(masterRedisData)) {

            let masterExposure = masterRedisData.exposure ? masterRedisData.exposure : 0;
            let partnerExposure = (parseFloat(masterExposure) || 0) - userOldExposure + userCurrentExposure;

            let teamRates = masterRedisData?.[`${jobData?.mid}_${jobData?.selectionId}${redisKeys.card}`];

            let cardProfitLossAndExposure = new CardProfitLoss(jobData?.matchType, teamRates, { bettingType: jobData?.bettingType, winAmount: jobData?.winAmount, lossAmount: jobData?.lossAmount, playerName: jobData?.betOnTeam, partnership: partnership, sid: jobData?.selectionId }, userOldExposure).getCardGameProfitLoss()

            let userRedisObj = {
              [`${jobData?.mid}_${jobData?.selectionId}${redisKeys.card}`]: cardProfitLossAndExposure?.profitLoss
            }
            await incrementValuesRedis(partnershipId, { [redisKeys.userAllExposure]: parseFloat(parseFloat(-parseFloat(userOldExposure) + parseFloat(userCurrentExposure)).toFixed(2)) }, userRedisObj);
            jobData.myStake = Number(((jobData.stake / 100) * partnership).toFixed(2));
            sendMessageToUser(partnershipId, socketData.CardBetPlaced, { userRedisObj: userRedisObj, jobData })
            // Log information about exposure and stake update
            logger.info({
              context: "Update User Exposure and Stake at the match bet",
              process: `User ID : ${userId} ${item} id ${partnershipId}`,
              data: `My Stake : ${jobData.myStake} exposure: ${partnerExposure}`
            });

          }
        } catch (error) {
          logger.error({
            context: `error in ${item} exposure update`,
            process: `User ID : ${userId} and ${item} id ${partnershipId}`,
            error: error.message,
            stake: error.stack
          })
        }
      }
    }
    );
}



WalletSessionBetQueue.process(async function (job, done) {
  let jobData = job.data;
  let userId = jobData.userId;
  try {
    await calculateSessionRateAmount(jobData, userId);
    return done(null, {});
  } catch (error) {
    logger.info({
      file: "error in session bet Queue",
      info: `process job for user id ${userId}`,

      jobData,
    });
    return done(null, {});
  }
});

const calculateSessionRateAmount = async (jobData, userId) => {
  // Parse partnerships from userRedisData
  let partnershipObj = JSON.parse(jobData.partnership);

  // Extract relevant data from jobData
  const placedBetObject = jobData.betPlaceObject;
  let partnerSessionExposure = placedBetObject.diffSessionExp;
  let stake = placedBetObject?.betPlacedData?.stake;


  const partnerShipIds = [userId];
  Object.keys(partnershipObj)?.forEach((item) => {
    if (item.includes("PartnershipId")) {
      partnerShipIds.push(partnershipObj[item]);
    }
  });

  const usersData = await getUsersWithoutCount({
    id: In(partnerShipIds)
  }, ["id"]);

  const userIds = usersData?.map((item) => item.id);

  updateUserBalanceExposure(userIds, {
    exposure: partnerSessionExposure
  });

  // Iterate through partnerships based on role and update exposure
  Object.keys(partnershipPrefixByRole)
    ?.filter(
      (item) =>
        item == userRoleConstant.fairGameAdmin ||
        item == userRoleConstant.fairGameWallet
    )
    ?.map(async (item) => {
      let partnerShipKey = `${partnershipPrefixByRole[item]}`;

      // Check if partnershipId exists in partnershipObj
      if (partnershipObj[`${partnerShipKey}PartnershipId`]) {
        let partnershipId = partnershipObj[`${partnerShipKey}PartnershipId`];
        let partnership = partnershipObj[`${partnerShipKey}Partnership`];

        try {
          // Get user data from Redis or balance data by userId
          let masterRedisData = await getUserRedisData(partnershipId);

          if (!lodash.isEmpty(masterRedisData)) {

            // If masterRedisData exists, update partner exposure and session data
            let masterExposure = parseFloat(masterRedisData.exposure) ?? 0;
            let partnerExposure = (parseFloat(masterExposure) || 0) + partnerSessionExposure;


            // Calculate profit loss session and update Redis data
            const redisBetData = masterRedisData[
              `${placedBetObject?.betPlacedData?.betId}_profitLoss`
            ]
              ? JSON.parse(
                masterRedisData[
                `${placedBetObject?.betPlacedData?.betId}_profitLoss`
                ]
              )
              : null;

            let redisData;

            switch (jobData?.placedBet?.marketType) {
              case sessionBettingType.session:
              case sessionBettingType.overByOver:
              case sessionBettingType.ballByBall:
                redisData = await calculateProfitLossSession(
                  redisBetData,
                  placedBetObject,
                  partnership
                );
                break;
              case sessionBettingType.khado:
                redisData = await calculateProfitLossKhado(
                  redisBetData,
                  placedBetObject,
                  partnership
                );
                break;
              case sessionBettingType.meter:
                redisData = await calculateProfitLossMeter(
                  redisBetData,
                  placedBetObject,
                  partnership
                );
                break;
              case sessionBettingType.oddEven:
                redisData = await calculateProfitLossSessionOddEven(redisBetData, { ...placedBetObject, winAmount: -placedBetObject?.winAmount, lossAmount: -placedBetObject?.lossAmount }, partnership);
                break;
              case sessionBettingType.cricketCasino:
                redisData = await calculateProfitLossSessionCasinoCricket(redisBetData, { ...placedBetObject, winAmount: -placedBetObject?.winAmount, lossAmount: -placedBetObject?.lossAmount }, partnership);
                break;
              case sessionBettingType.fancy1:
                redisData = await calculateProfitLossSessionFancy1(redisBetData, { ...placedBetObject, winAmount: -placedBetObject?.winAmount, lossAmount: -placedBetObject?.lossAmount }, partnership);
                break;
              default:
                break;
            }

            await incrementValuesRedis(partnershipId, { [redisKeys.userAllExposure]: parseFloat(parseFloat(partnerSessionExposure).toFixed(2)), [`${redisKeys.userSessionExposure}${placedBetObject?.betPlacedData?.matchId}`]: parseFloat(redisData?.maxLoss || 0.0) - parseFloat(redisBetData?.maxLoss || 0.0) }, {
              [`${placedBetObject?.betPlacedData?.betId}_profitLoss`]:
                JSON.stringify(redisData)
            });

            // Log information about exposure and stake update
            logger.info({
              context: "Update User Exposure and Stake",
              process: `User ID : ${userId} ${item} id ${partnershipId}`,
              data: `My Stake : ${(
                (stake * parseFloat(partnership)) /
                100
              ).toFixed(2)} exposure: ${partnerExposure}`,
            });

            // Update jobData with calculated stake
            jobData.betPlaceObject.myStack = (
              (stake * parseFloat(partnership)) /
              100
            ).toFixed(2);

            // Send data to socket for session bet placement
            sendMessageToUser(partnershipId, socketData.SessionBetPlaced, {
              jobData,
              profitLoss: redisData
            });
          }

        } catch (error) {
          // Log error if any during exposure update
          logger.error({
            context: `error in ${item} exposure update`,
            process: `User ID : ${userId} and ${item} id ${partnershipId}`,
            error: error.message,
            stake: error.stack,
          });
        }
      }
    });
};

walletSessionBetDeleteQueue.process(async (job, done) => {
  let jobData = job.data;
  let userId = jobData.userId;
  try {
    // Parse partnerships from userRedisData
    let partnershipObj = {};
    try {
      partnershipObj = JSON.parse(jobData.partnership);
    } catch {
      partnershipObj = jobData.partnership;
    }

    // Extract relevant data from jobData
    const userDeleteProfitLoss = jobData.userDeleteProfitLoss;
    let exposureDiff = jobData.exposureDiff;
    let betId = jobData.betId;
    let matchId = jobData.matchId;
    let deleteReason = jobData.deleteReason;
    let domainUrl = jobData.domainUrl;
    let betPlacedId = jobData.betPlacedId;
    let redisName = `${betId}_profitLoss`;
    let redisSesionExposureName = redisKeys.userSessionExposure + matchId;
    let sessionType = jobData.sessionType;
    const partnerShipIds = [userId];
    Object.keys(partnershipObj)?.forEach((item) => {
      if (item.includes("PartnershipId")) {
        partnerShipIds.push(partnershipObj[item]);
      }
    });

    const usersData = await getUsersWithoutCount({
      id: In(partnerShipIds)
    }, ["id"]);

    const userIds = usersData?.map((item) => item.id);

    await updateUserBalanceExposure(userIds, {
      exposure: -exposureDiff
    });

    // Iterate through partnerships based on role and update exposure
    Object.keys(partnershipPrefixByRole)
      ?.filter(
        (item) =>
          item == userRoleConstant.fairGameAdmin ||
          item == userRoleConstant.fairGameWallet
      )
      ?.map(async (item) => {
        let partnerShipKey = `${partnershipPrefixByRole[item]}`;

        // Check if partnershipId exists in partnershipObj
        if (partnershipObj[`${partnerShipKey}PartnershipId`]) {
          let partnershipId = partnershipObj[`${partnerShipKey}PartnershipId`];
          let partnership = partnershipObj[`${partnerShipKey}Partnership`];

          try {
            // Get user data from Redis or balance data by userId
            let masterRedisData = await getUserRedisData(partnershipId);

            if (!lodash.isEmpty(masterRedisData)) {

              // If masterRedisData exists, update partner exposure and session data
              let masterExposure = parseFloat(masterRedisData.exposure) ?? 0;
              let partnerExposure = (masterExposure || 0) - exposureDiff;

              let oldProfitLossParent = JSON.parse(masterRedisData[redisName]);
              let parentPLbetPlaced = oldProfitLossParent?.betPlaced || [];
              let oldMaxLossParent = oldProfitLossParent?.maxLoss;
              let newMaxLossParent = 0;

              if (![sessionBettingType.oddEven, sessionBettingType.fancy1, sessionBettingType.cricketCasino].includes(sessionType)) {
                await mergeProfitLoss(userDeleteProfitLoss.betData, parentPLbetPlaced);
              }

              if ([sessionBettingType.oddEven, sessionBettingType.fancy1, sessionBettingType.cricketCasino].includes(sessionType)) {
                Object.keys(userDeleteProfitLoss.betData).forEach((ob) => {
                  let partnershipData = (userDeleteProfitLoss.betData[ob] * partnership) / 100;
                  parentPLbetPlaced[ob] = parentPLbetPlaced[ob] + partnershipData;
                  if (newMaxLossParent < Math.abs(parentPLbetPlaced[ob]) && parentPLbetPlaced[ob] < 0) {
                    newMaxLossParent = Math.abs(parentPLbetPlaced[ob]);
                  }
                });
              }
              else {
                userDeleteProfitLoss.betData.map((ob, index) => {
                  let partnershipData = (ob.profitLoss * partnership) / 100;
                  if (ob.odds == parentPLbetPlaced[index].odds) {
                    parentPLbetPlaced[index].profitLoss = parseFloat(parentPLbetPlaced[index].profitLoss) + partnershipData;
                    if (newMaxLossParent < Math.abs(parentPLbetPlaced[index].profitLoss) && parentPLbetPlaced[index].profitLoss < 0) {
                      newMaxLossParent = Math.abs(parentPLbetPlaced[index].profitLoss);
                    }
                  }
                });
              }

              oldProfitLossParent.betPlaced = parentPLbetPlaced;
              oldProfitLossParent.maxLoss = newMaxLossParent;
              oldProfitLossParent.totalBet = oldProfitLossParent.totalBet - userDeleteProfitLoss.total_bet;
              let sessionExposure = parseFloat(masterRedisData[redisSesionExposureName]) - oldMaxLossParent + newMaxLossParent;
              let redisObj = {
                [redisName]: JSON.stringify(oldProfitLossParent),
                exposure: partnerExposure,
                [redisSesionExposureName]: sessionExposure
              };

              await incrementValuesRedis(partnershipId, {
                exposure: -exposureDiff,
                [redisSesionExposureName]: - oldMaxLossParent + newMaxLossParent,
              }, {
                [redisName]: JSON.stringify(oldProfitLossParent)
              });

              // Log information about exposure and stake update
              logger.info({
                context: "Update User Exposure and Stake at the delete session bet",
                process: `User ID : ${userId} ${item} id ${partnershipId}`,
                data: `My Stake : ${JSON.stringify(redisObj)}`,
              });

              // Send data to socket for session bet placement
              sendMessageToUser(partnershipId, socketData.sessionDeleteBet, {
                exposure: redisObj?.exposure,
                sessionExposure: redisObj[redisSesionExposureName],
                profitLoss: oldProfitLossParent,
                matchId: matchId,
                betPlacedId: betPlacedId,
                deleteReason: deleteReason,
                domainUrl: domainUrl,
                betId
              });
            }

          } catch (error) {
            // Log error if any during exposure update
            logger.error({
              context: `error in ${item} exposure update`,
              process: `User ID : ${userId} and ${item} id ${partnershipId}`,
              error: error.message,
              stake: error.stack,
            });
          }
        }
      });

    return done(null, {});
  } catch (error) {
    logger.error({
      file: "error in session bet delete Queue",
      info: `process job for user id ${userId}`,
      jobData,
    });
    return done(null, {});
  }
});

walletMatchBetDeleteQueue.process(async (job, done) => {
  let jobData = job.data;
  let userId = jobData.userId;
  try {
    // Parse partnerships from userRedisData
    let partnershipObj = {};
    try {
      partnershipObj = JSON.parse(jobData.partnership);
    } catch {
      partnershipObj = jobData.partnership;
    }

    // Extract relevant data from jobData
    let exposureDiff = jobData.exposureDiff;
    let betId = jobData.betId;
    let matchId = jobData.matchId;
    let deleteReason = jobData.deleteReason;
    let domainUrl = jobData.domainUrl;
    let betPlacedId = jobData.betPlacedId;
    let matchBetType = jobData.matchBetType;
    let newTeamRate = jobData.newTeamRate;
    let teamArateRedisKey = jobData.teamArateRedisKey;
    let teamBrateRedisKey = jobData.teamBrateRedisKey;
    let teamCrateRedisKey = jobData.teamCrateRedisKey;

    const partnerShipIds = [userId];
    Object.keys(partnershipObj)?.forEach((item) => {
      if (item.includes("PartnershipId")) {
        partnerShipIds.push(partnershipObj[item]);
      }
    });

    const usersData = await getUsersWithoutCount({
      id: In(partnerShipIds)
    }, ["id"]);

    const userIds = usersData?.map((item) => item.id);

    await updateUserBalanceExposure(userIds, {
      exposure: -exposureDiff
    });


    // Iterate through partnerships based on role and update exposure
    Object.keys(partnershipPrefixByRole)
      ?.filter(
        (item) =>
          item == userRoleConstant.fairGameAdmin ||
          item == userRoleConstant.fairGameWallet
      )
      ?.map(async (item) => {
        let partnerShipKey = `${partnershipPrefixByRole[item]}`;

        // Check if partnershipId exists in partnershipObj
        if (partnershipObj[`${partnerShipKey}PartnershipId`]) {
          let partnershipId = partnershipObj[`${partnerShipKey}PartnershipId`];
          let partnership = partnershipObj[`${partnerShipKey}Partnership`];

          try {
            // Get user data from Redis or balance data by userId
            let masterRedisData = await getUserRedisData(partnershipId);

            if (!lodash.isEmpty(masterRedisData)) {

              // If masterRedisData exists, update partner exposure and session data
              let masterExposure = parseFloat(masterRedisData.exposure) ?? 0;
              let partnerExposure = (masterExposure || 0) - exposureDiff;


              let masterTeamRates = {
                teamA: Number(masterRedisData[teamArateRedisKey]) || 0,
                teamB: Number(masterRedisData[teamBrateRedisKey]) || 0,
                teamC: teamCrateRedisKey ? Number(masterRedisData[teamCrateRedisKey]) || 0 : 0
              };
              masterTeamRates.teamA = masterTeamRates.teamA + ((newTeamRate.teamA * partnership) / 100);
              masterTeamRates.teamB = masterTeamRates.teamB + ((newTeamRate.teamB * partnership) / 100);
              masterTeamRates.teamC = masterTeamRates.teamC + ((newTeamRate.teamC * partnership) / 100);

              masterTeamRates.teamA = parseFloat((masterTeamRates.teamA).toFixed(2));
              masterTeamRates.teamB = parseFloat((masterTeamRates.teamB).toFixed(2));
              masterTeamRates.teamC = parseFloat((masterTeamRates.teamC).toFixed(2));

              let redisObj = {
                [redisKeys.userAllExposure]: partnerExposure,
                [teamArateRedisKey]: masterTeamRates.teamA,
                [teamBrateRedisKey]: masterTeamRates.teamB,
                ...(teamCrateRedisKey ? { [teamCrateRedisKey]: masterTeamRates.teamC } : {})
              }

              await incrementValuesRedis(partnershipId, {
                exposure: -exposureDiff
              }, {
                [teamArateRedisKey]: masterTeamRates.teamA,
                [teamBrateRedisKey]: masterTeamRates.teamB,
                ...(teamCrateRedisKey ? { [teamCrateRedisKey]: masterTeamRates.teamC } : {})
              });

              // Log information about exposure and stake update
              logger.info({
                context: "Update User Exposure and Stake at the delete session bet",
                process: `User ID : ${userId} ${item} id ${partnershipId}`,
                data: `My Stake : ${JSON.stringify(redisObj)}`,
              });

              // Send data to socket for session bet placement
              sendMessageToUser(partnershipId, socketData.matchDeleteBet, {
                exposure: redisObj?.exposure,
                ...masterTeamRates,
                betId: betId,
                matchId: matchId,
                betPlacedId: betPlacedId,
                deleteReason: deleteReason,
                domainUrl: domainUrl,
                matchBetType,
                teamArateRedisKey: teamArateRedisKey,
                teamBrateRedisKey: teamBrateRedisKey,
                teamCrateRedisKey: teamCrateRedisKey,
                redisObject: redisObj
              });
            }

          } catch (error) {
            // Log error if any during exposure update
            logger.error({
              context: `error in ${item} exposure update at match delete bet`,
              process: `User ID : ${userId} and ${item} id ${partnershipId}`,
              error: error.message,
              stake: error.stack,
            });
          }
        }
      });

    return done(null, {});
  } catch (error) {
    logger.error({
      file: "error in match bet delete Queue",
      info: `process job for user id ${userId}`,
      jobData,
    });
    return done(null, {});
  }
});

walletRaceMatchBetDeleteQueue.process(async (job, done) => {
  let jobData = job.data;
  let userId = jobData.userId;
  try {
    // Parse partnerships from userRedisData
    let partnershipObj = {};
    try {
      partnershipObj = JSON.parse(jobData.partnership);
    } catch {
      partnershipObj = jobData.partnership;
    }
    // Extract relevant data from jobData
    let exposureDiff = jobData.exposureDiff;
    let betId = jobData.betId;
    let matchId = jobData.matchId;
    let deleteReason = jobData.deleteReason;
    let domainUrl = jobData.domainUrl;
    let betPlacedId = jobData.betPlacedId;
    let matchBetType = jobData.matchBetType;
    let newTeamRate = jobData.newTeamRate;

    const partnerShipIds = [userId];
    Object.keys(partnershipObj)?.forEach((item) => {
      if (item.includes("PartnershipId")) {
        partnerShipIds.push(partnershipObj[item]);
      }
    });

    const usersData = await getUsersWithoutCount({
      id: In(partnerShipIds)
    }, ["id"]);

    const userIds = usersData?.map((item) => item.id);

    await updateUserBalanceExposure(userIds, {
      exposure: -exposureDiff
    });


    // Iterate through partnerships based on role and update exposure
    Object.keys(partnershipPrefixByRole)
      ?.filter(
        (item) =>
          item == userRoleConstant.fairGameAdmin ||
          item == userRoleConstant.fairGameWallet
      )
      ?.map(async (item) => {
        let partnerShipKey = `${partnershipPrefixByRole[item]}`;

        // Check if partnershipId exists in partnershipObj
        if (partnershipObj[`${partnerShipKey}PartnershipId`]) {
          let partnershipId = partnershipObj[`${partnerShipKey}PartnershipId`];
          let partnership = partnershipObj[`${partnerShipKey}Partnership`];

          try {
            // Get user data from Redis or balance data by userId
            let masterRedisData = await getUserRedisData(partnershipId);

            if (!lodash.isEmpty(masterRedisData)) {

              let masterTeamRates = JSON.parse(masterRedisData[`${matchId}${redisKeys.profitLoss}`]);

              masterTeamRates = Object.keys(masterTeamRates).reduce((acc, key) => {
                acc[key] = parseFloat((parseRedisData(key, masterTeamRates) + ((newTeamRate[key] * partnership) / 100)).toFixed(2));
                return acc;
              }, {});

              let redisObj = {
                [`${matchId}${redisKeys.profitLoss}`]: JSON.stringify(masterTeamRates)
              }

              await incrementValuesRedis(partnershipId, {
                exposure: -exposureDiff
              }, redisObj);

              // Log information about exposure and stake update
              logger.info({
                context: "Update User Exposure and Stake at the delete race match bet",
                process: `User ID : ${userId} ${item} id ${partnershipId}`,
                data: `My Stake : ${JSON.stringify(redisObj)}`,
              });

              // Send data to socket for session bet placement
              sendMessageToUser(partnershipId, socketData.matchDeleteBet, {
                exposure: redisObj?.exposure,
                teamRate: masterTeamRates,
                betId: betId,
                matchId: matchId,
                betPlacedId: betPlacedId,
                deleteReason: deleteReason,
                domainUrl: domainUrl,
                matchBetType
              });
            }

          } catch (error) {
            // Log error if any during exposure update
            logger.error({
              context: `error in ${item} exposure update at match race delete bet`,
              process: `User ID : ${userId} and ${item} id ${partnershipId}`,
              error: error.message,
              stake: error.stack,
            });
          }
        }
      });

    return done(null, {});
  } catch (error) {
    logger.error({
      file: "error in match bet delete Queue",
      info: `process job for user id ${userId}`,
      jobData,
    });
    return done(null, {});
  }
});

walletTournamentMatchBetDeleteQueue.process(async (job, done) => {
  let jobData = job.data;
  let userId = jobData.userId;
  try {
    // Parse partnerships from userRedisData
    let partnershipObj = {};
    try {
      partnershipObj = JSON.parse(jobData.partnership);
    } catch {
      partnershipObj = jobData.partnership;
    }
    // Extract relevant data from jobData
    let exposureDiff = jobData.exposureDiff;
    let betId = jobData.betId;
    let matchId = jobData.matchId;
    let deleteReason = jobData.deleteReason;
    let domainUrl = jobData.domainUrl;
    let betPlacedId = jobData.betPlacedId;
    let matchBetType = jobData.matchBetType;
    let newTeamRate = jobData.newTeamRate;

    const partnerShipIds = [userId];
    Object.keys(partnershipObj)?.forEach((item) => {
      if (item.includes("PartnershipId")) {
        partnerShipIds.push(partnershipObj[item]);
      }
    });

    const usersData = await getUsersWithoutCount({
      id: In(partnerShipIds)
    }, ["id"]);

    const userIds = usersData?.map((item) => item.id);

    await updateUserBalanceExposure(userIds, {
      exposure: -exposureDiff
    });


    // Iterate through partnerships based on role and update exposure
    Object.keys(partnershipPrefixByRole)
      ?.filter(
        (item) =>
          item == userRoleConstant.fairGameAdmin ||
          item == userRoleConstant.fairGameWallet
      )
      ?.map(async (item) => {
        let partnerShipKey = `${partnershipPrefixByRole[item]}`;

        // Check if partnershipId exists in partnershipObj
        if (partnershipObj[`${partnerShipKey}PartnershipId`]) {
          let partnershipId = partnershipObj[`${partnerShipKey}PartnershipId`];
          let partnership = partnershipObj[`${partnerShipKey}Partnership`];

          try {
            // Get user data from Redis or balance data by userId
            let masterRedisData = await getUserRedisData(partnershipId);

            if (!lodash.isEmpty(masterRedisData)) {

              let masterTeamRates = JSON.parse(masterRedisData[`${betId}${redisKeys.profitLoss}_${matchId}`]);

              masterTeamRates = Object.keys(masterTeamRates).reduce((acc, key) => {
                acc[key] = parseFloat((parseRedisData(key, masterTeamRates) + ((newTeamRate[key] * partnership) / 100)).toFixed(2));
                return acc;
              }, {});

              let redisObj = {
                [`${betId}${redisKeys.profitLoss}_${matchId}`]: JSON.stringify(masterTeamRates)
              }

              await incrementValuesRedis(partnershipId, {
                exposure: -exposureDiff
              }, redisObj);

              // Log information about exposure and stake update
              logger.info({
                context: "Update User Exposure and Stake at the delete tournament match bet",
                process: `User ID : ${userId} ${item} id ${partnershipId}`,
                data: `My Stake : ${JSON.stringify(redisObj)}`,
              });

              // Send data to socket for session bet placement
              sendMessageToUser(partnershipId, socketData.matchDeleteBet, {
                exposure: redisObj?.exposure,
                teamRate: masterTeamRates,
                betId: betId,
                matchId: matchId,
                betPlacedId: betPlacedId,
                deleteReason: deleteReason,
                domainUrl: domainUrl,
                matchBetType
              });
            }

          } catch (error) {
            // Log error if any during exposure update
            logger.error({
              context: `error in ${item} exposure update at match race delete bet`,
              process: `User ID : ${userId} and ${item} id ${partnershipId}`,
              error: error.message,
              stake: error.stack,
            });
          }
        }
      });

    return done(null, {});
  } catch (error) {
    logger.error({
      file: "error in match bet delete Queue",
      info: `process job for user id ${userId}`,
      jobData,
    });
    return done(null, {});
  }
});
module.exports.WalletMatchBetQueue = WalletMatchBetQueue