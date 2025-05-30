const Queue = require('bee-queue');
const lodash = require('lodash');
const { getUserRedisData, incrementValuesRedis, hasUserInCache, getUserSessionPL, setUserPLSession, setUserPLSessionOddEven, getUserSessionAllPL, setProfitLossData, setUserPLTournament, setUserPLMeter } = require('../services/redis/commonFunctions');
const { updateUserBalanceExposure } = require('../services/userBalanceService');
const { calculateProfitLossSession, mergeProfitLoss, calculateRacingExpertRate, parseRedisData, calculateProfitLossSessionOddEven, calculateProfitLossSessionCasinoCricket, calculateProfitLossSessionFancy1, calculateProfitLossKhado, calculateProfitLossMeter } = require('../services/commonService');
const { logger } = require('../config/logger');
const { redisKeys, partnershipPrefixByRole, userRoleConstant, socketData, sessionBettingType, jobQueueConcurrent, oddsSessionBetType } = require('../config/contants');
const { sendMessageToUser } = require('../sockets/socketManager');
const { getUsersWithoutCount } = require('../services/userService');
const { In } = require('typeorm');
const { CardProfitLoss } = require('../services/cardService/cardProfitLossCalc');
const { roundToTwoDecimals } = require('../utils/mathUtils');
const walletRedisOption = {
  removeOnSuccess: true,
  redis: {
    port: process.env.EXTERNAL_REDIS_PORT,
    host: process.env.EXTERNAL_REDIS_HOST
  }
}

const WalletSessionBetQueue = new Queue('walletSessionBetQueue', walletRedisOption);
const WalletCardMatchBetQueue = new Queue('walletCardMatchBetQueue', walletRedisOption);
const walletSessionBetDeleteQueue = new Queue('walletSessionBetDeleteQueue', walletRedisOption);
const walletTournamentMatchBetDeleteQueue = new Queue('walletTournamentMatchBetDeleteQueue', walletRedisOption);
const WalletMatchTournamentBetQueue = new Queue('walletMatchTournamentBetQueue', walletRedisOption);

WalletMatchTournamentBetQueue.process(jobQueueConcurrent, async function (job, done) {
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

  updateUserBalanceExposure(partnerShipIds, {
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
          const masterRedisData = await hasUserInCache(partnershipId);
          if (masterRedisData) {
            let teamRates = jobData?.runners?.reduce((acc, key) => {
              acc[key?.id] = 0;
              return acc;
            }, {});

            const teamData = await calculateRacingExpertRate(teamRates, obj, partnership);

            await incrementValuesRedis(partnershipId, { [redisKeys.userAllExposure]: parseFloat(parseFloat(-parseFloat(userOldExposure) + parseFloat(userCurrentExposure)).toFixed(2)) });

            const plData = await setUserPLTournament(partnershipId, jobData?.matchId, jobData?.betId, teamData);
            const socketRedisData = plData?.reduce((acc, curr, index) => {
              if (index % 2 === 0) {
                acc[curr] = roundToTwoDecimals(plData[index + 1]);
              }
              return acc;
            }, {})

            jobData.myStake = Number(((jobData.stake / 100) * partnership).toFixed(2));
            sendMessageToUser(partnershipId, socketData.MatchBetPlaced, { userRedisObj: socketRedisData, jobData })
            // Log information about exposure and stake update
            logger.info({
              context: "Update User Exposure and Stake at the match bet",
              process: `User ID : ${userId} ${item} id ${partnershipId}`,
              data: `My Stake : ${jobData.myStake}`
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

WalletCardMatchBetQueue.process(jobQueueConcurrent, async function (job, done) {
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



WalletSessionBetQueue.process(jobQueueConcurrent, async function (job, done) {
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

  updateUserBalanceExposure(partnerShipIds, {
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
          const masterRedisData = await hasUserInCache(partnershipId);
          if (masterRedisData) {

            // Calculate profit loss session and update Redis data
            const userPLData = await getUserSessionPL(partnershipId, jobData?.placedBet?.matchId, jobData?.placedBet?.betId);

            let redisData;

            switch (jobData?.placedBet?.marketType) {
              case sessionBettingType.session:
              case sessionBettingType.overByOver:
              case sessionBettingType.ballByBall:
                redisData = await calculateProfitLossSession(
                  userPLData,
                  placedBetObject,
                  partnership
                );
                break;
              case sessionBettingType.khado:
                redisData = await calculateProfitLossKhado(
                  userPLData,
                  placedBetObject,
                  partnership
                );
                break;
              case sessionBettingType.meter:
                redisData = await calculateProfitLossMeter(
                  userPLData,
                  placedBetObject,
                  partnership
                );
                break;
              case sessionBettingType.oddEven:
                redisData = await calculateProfitLossSessionOddEven(userPLData, { ...placedBetObject, winAmount: -placedBetObject?.winAmount, lossAmount: -placedBetObject?.lossAmount }, partnership);
                break;
              case sessionBettingType.cricketCasino:
                redisData = await calculateProfitLossSessionCasinoCricket(userPLData, { ...placedBetObject, winAmount: -placedBetObject?.winAmount, lossAmount: -placedBetObject?.lossAmount }, partnership);
                break;
              case sessionBettingType.fancy1:
                redisData = await calculateProfitLossSessionFancy1(userPLData, { ...placedBetObject, winAmount: -placedBetObject?.winAmount, lossAmount: -placedBetObject?.lossAmount }, partnership);
                break;
              default:
                break;
            }

            let socketRedisData = {};
            if ([sessionBettingType.session, sessionBettingType.overByOver, sessionBettingType.ballByBall, sessionBettingType.khado].includes(jobData?.placedBet?.marketType)) {
              const returnedPF = await setUserPLSession(partnershipId, jobData?.placedBet?.matchId, jobData?.placedBet?.betId, redisData?.betPlaced?.map((item) => ([item?.odds?.toString(), item?.profitLoss?.toString()]))?.flat(2));
              const [maxL, , , totalBet, ...pl] = returnedPF;
              socketRedisData = {
                betPlaced: pl.map((item, index) => {
                  if (index % 2 === 0) {
                    return {
                      odds: item,
                      profitLoss: pl[index + 1]
                    }
                  }
                  return null;
                }).filter(Boolean),
                maxLoss: maxL,
                totalBet: totalBet
              }
            }
            else if ([sessionBettingType.oddEven, sessionBettingType.cricketCasino, sessionBettingType.fancy1].includes(jobData?.placedBet?.marketType)) {
              const returnedPF = await setUserPLSessionOddEven(partnershipId, jobData?.placedBet?.matchId, jobData?.placedBet?.betId, Object.entries(redisData?.betPlaced)?.flat(2)?.map((item) => item.toString()));
              const [maxL, totalBet, ...pl] = returnedPF;
              socketRedisData = {
                betPlaced: pl.reduce((acc, curr, index) => {
                  if (index % 2 === 0) {
                    acc[curr] = pl[index + 1];
                  }
                  return acc;
                }, {}),
                maxLoss: maxL,
                totalBet: totalBet
              }
            }
            else if([sessionBettingType.meter].includes(jobData?.placedBet?.marketType)) {
              const returnedPF = await setUserPLMeter(partnershipId, jobData?.placedBet?.matchId, jobData?.placedBet?.betId, redisData?.betPlaced?.map((item) => ([item?.odds?.toString(), item?.profitLoss?.toString()]))?.flat(2));
              const [maxL, , , totalBet, ...pl] = returnedPF;
              socketRedisData = {
                betPlaced: pl.map((item, index) => {
                  if (index % 2 === 0) {
                    return {
                      odds: item,
                      profitLoss: pl[index + 1]
                    }
                  }
                  return null;
                }).filter(Boolean),
                maxLoss: maxL,
                totalBet: totalBet
              }
            }
            await incrementValuesRedis(partnershipId, { [redisKeys.userAllExposure]: roundToTwoDecimals(partnerSessionExposure) });

            // Log information about exposure and stake update
            logger.info({
              context: "Update User Exposure and Stake",
              process: `User ID : ${userId} ${item} id ${partnershipId}`,
              data: `My Stake : ${(
                (stake * parseFloat(partnership)) /
                100
              ).toFixed(2)}`,
            });

            // Update jobData with calculated stake
            jobData.betPlaceObject.myStack = (
              (stake * parseFloat(partnership)) /
              100
            ).toFixed(2);

            // Send data to socket for session bet placement
            sendMessageToUser(partnershipId, socketData.SessionBetPlaced, {
              jobData,
              profitLoss: socketRedisData
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
            const masterRedisDataPL = await getUserSessionAllPL(partnershipId, matchId, betId, sessionType);

            if (!lodash.isEmpty(masterRedisData)) {

              // If masterRedisData exists, update partner exposure and session data
              let masterExposure = parseFloat(masterRedisData.exposure) ?? 0;
              let partnerExposure = (masterExposure || 0) - exposureDiff;

              let oldProfitLossParent = masterRedisDataPL;
              let parentPLbetPlaced = oldProfitLossParent?.betPlaced || [];
              let oldMaxLossParent = oldProfitLossParent?.maxLoss;
              let newMaxLossParent = 0;

              if (![sessionBettingType.oddEven, sessionBettingType.fancy1, sessionBettingType.cricketCasino].includes(sessionType)) {
                await mergeProfitLoss(userDeleteProfitLoss.betData, parentPLbetPlaced);
              }

              if ([sessionBettingType.oddEven, sessionBettingType.fancy1, sessionBettingType.cricketCasino].includes(sessionType)) {
                Object.keys(userDeleteProfitLoss.betData).forEach((ob) => {
                  let partnershipData = (userDeleteProfitLoss.betData[ob] * partnership) / 100;
                  parentPLbetPlaced[ob] = parseFloat(parentPLbetPlaced[ob]) + parseFloat(partnershipData);
                  if (newMaxLossParent < Math.abs(parentPLbetPlaced[ob]) && parentPLbetPlaced[ob] < 0) {
                    newMaxLossParent = Math.abs(roundToTwoDecimals(parentPLbetPlaced[ob]));
                  }
                });
              }
              else {
                userDeleteProfitLoss.betData.map((ob, index) => {
                  let partnershipData = (ob.profitLoss * partnership) / 100;
                  if (ob.odds == parentPLbetPlaced[index]?.odds) {
                    parentPLbetPlaced[index].profitLoss = parseFloat((parseFloat(parentPLbetPlaced[index].profitLoss) + partnershipData).toFixed(2));
                    if (newMaxLossParent < Math.abs(parentPLbetPlaced[index].profitLoss) && parentPLbetPlaced[index].profitLoss < 0) {
                      newMaxLossParent = Math.abs(roundToTwoDecimals(parentPLbetPlaced[index].profitLoss));
                    }
                  }
                });
              }

              oldProfitLossParent.betPlaced = parentPLbetPlaced;
              oldProfitLossParent.maxLoss = newMaxLossParent;
              oldProfitLossParent.totalBet = oldProfitLossParent.totalBet - userDeleteProfitLoss.total_bet;
              let sessionExposure = parseFloat(masterRedisData[redisSesionExposureName]) - oldMaxLossParent + newMaxLossParent;
              let redisObj = {
                exposure: partnerExposure,
                [redisSesionExposureName]: sessionExposure
              };

              await incrementValuesRedis(partnershipId, {
                exposure: -exposureDiff,
                [redisSesionExposureName]: - oldMaxLossParent + newMaxLossParent,
              });

              if (oddsSessionBetType.includes(sessionType)) {
                oldProfitLossParent.betPlaced = oldProfitLossParent.betPlaced.reduce((acc, item) => {
                  acc[item.odds] = item.profitLoss;
                  return acc;
                }, {});
              }
              await setProfitLossData(partnershipId, matchId, betId, oldProfitLossParent);


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
                betId,
                isPermanentDelete: jobData.isPermanentDelete
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
            const masterRedisData = await hasUserInCache(partnershipId);

            if (masterRedisData) {

              const masterTeamRates = Object.keys(newTeamRate).reduce((acc, key) => {
                acc[key] = roundToTwoDecimals((newTeamRate[key] * partnership) / 100);
                return acc;
              }, {});

              await incrementValuesRedis(partnershipId, {
                exposure: -exposureDiff
              });

              const plData = await setUserPLTournament(partnershipId, matchId, betId, masterTeamRates);
              const socketRedisData = plData?.reduce((acc, curr, index) => {
                if (index % 2 === 0) {
                  acc[curr] = roundToTwoDecimals(plData[index + 1]);
                }
                return acc;
              }, {});

              // Log information about exposure and stake update
              logger.info({
                context: "Update User Exposure and Stake at the delete tournament match bet",
                process: `User ID : ${userId} ${item} id ${partnershipId}`,
                data: `My Stake : ${JSON.stringify(socketRedisData)}`,
              });

              // Send data to socket for session bet placement
              sendMessageToUser(partnershipId, socketData.matchDeleteBet, {
                teamRate: socketRedisData,
                betId: betId,
                matchId: matchId,
                betPlacedId: betPlacedId,
                deleteReason: deleteReason,
                domainUrl: domainUrl,
                isPermanentDelete: jobData.isPermanentDelete,
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

module.exports = { WalletSessionBetQueue, WalletCardMatchBetQueue, walletSessionBetDeleteQueue, walletTournamentMatchBetDeleteQueue, WalletMatchTournamentBetQueue };