const Queue = require('bee-queue');
const lodash = require('lodash');
const { getUserRedisData, updateUserDataRedis } = require('../services/redis/commonFunctions');
const { getUserBalanceDataByUserId, updateUserBalanceByUserId, updateUserBalanceData, updateUserBalanceExposure } = require('../services/userBalanceService');
const { calculateExpertRate, calculateProfitLossSession, mergeProfitLoss } = require('../services/commonService');
const { logger } = require('../config/logger');
const { redisKeys, partnershipPrefixByRole, userRoleConstant, socketData } = require('../config/contants');
const { sendMessageToUser } = require('../sockets/socketManager');
const { getUserById, getUsers, getUsersWithoutCount } = require('../services/userService');
const { In } = require('typeorm');
const walletRedisOption = {
  removeOnSuccess: true,
  redis: {
    port: process.env.EXTERNAL_REDIS_PORT,
    host: process.env.EXTERNAL_REDIS_HOST
  }
}

const WalletMatchBetQueue = new Queue('walletMatchBetQueue', walletRedisOption);
const WalletSessionBetQueue = new Queue('walletSessionBetQueue', walletRedisOption);
const walletSessionBetDeleteQueue = new Queue('walletSessionBetDeleteQueue', walletRedisOption);
const walletMatchBetDeleteQueue = new Queue('walletMatchBetDeleteQueue', walletRedisOption);

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
  let newUserExposure = jobData.userUpdatedExposure;
  let userOldExposure = jobData.userPreviousExposure
  let teamRates = jobData.teamRates;
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
   Object.keys(partnershipObj)?.forEach((item)=>{
    if(item.includes("PartnershipId")){
      partnerShipIds.push(partnershipObj[item]);
    }
   });

  const usersData = await getUsersWithoutCount({
    id: In(partnerShipIds)
  }, ["id"]);

  const userIds = usersData?.map((item) => item.id);

  updateUserBalanceExposure(userIds, {
    exposure: newUserExposure
  });


  Object.keys(partnershipPrefixByRole)
    ?.filter(
      (item) =>
        item == partnershipPrefixByRole[userRoleConstant.fairGameAdmin] ||
        item == partnershipPrefixByRole[userRoleConstant.fairGameWallet]
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
          if (lodash.isEmpty(masterRedisData)) {
            let partnerUser = await getUserBalanceDataByUserId(partnershipId);
            let partnerExposure = (partnerUser?.exposure || 0) - userOldExposure + userCurrentExposure;
            await updateUserBalanceByUserId(partnershipId, { exposure: partnerExposure });
          } else {
            let masterExposure = masterRedisData.exposure ? masterRedisData.exposure : 0;
            let partnerExposure = (masterExposure || 0) - userOldExposure + userCurrentExposure;
            await updateUserBalanceByUserId(partnershipId, { exposure: partnerExposure });

            let teamRates = {
              teamA: parseFloat((parseFloat(masterRedisData[jobData.teamArateRedisKey]) || 0.0).toFixed(2)),
              teamB: parseFloat((parseFloat(masterRedisData[jobData.teamBrateRedisKey]) || 0.0).toFixed(2)),
              teamC: jobData.teamCrateRedisKey ? parseFloat((parseFloat(masterRedisData[jobData.teamCrateRedisKey]) || 0.0).toFixed(2)) : 0.0
            }
            let teamData = await calculateExpertRate(teamRates, obj, partnership);
            let userRedisObj = {
              [redisKeys.userAllExposure]: partnerExposure,
              [jobData.teamArateRedisKey]: teamData.teamA,
              [jobData.teamBrateRedisKey]: teamData.teamB,
              ...(jobData.teamCrateRedisKey ? { [jobData.teamCrateRedisKey]: teamData.teamC } : {})
            }
            await updateUserDataRedis(partnershipId, userRedisObj);
            jobData.myStake = Number(((jobData.stake / 100) * partnership).toFixed(2));
            sendMessageToUser(partnershipId, socketData.MatchBetPlaced, { userRedisObj, jobData })
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
  let maxLossExposure = placedBetObject.maxLoss;
  let partnerSessionExposure = placedBetObject.diffSessionExp;
  let stake = placedBetObject?.betPlacedData?.stake;
  let newUserExposure = jobData.userUpdatedExposure;


  const partnerShipIds = [userId];
  Object.keys(partnershipObj)?.forEach((item)=>{
   if(item.includes("PartnershipId")){
     partnerShipIds.push(partnershipObj[item]);
   }
  });

 const usersData = await getUsersWithoutCount({
   id: In(partnerShipIds)
 }, ["id"]);

 const userIds = usersData?.map((item) => item.id);

 updateUserBalanceExposure(userIds, {
   exposure: newUserExposure
 });



  // Iterate through partnerships based on role and update exposure
  Object.keys(partnershipPrefixByRole)
    ?.filter(
      (item) =>
        item == partnershipPrefixByRole[userRoleConstant.fairGameAdmin] ||
        item == partnershipPrefixByRole[userRoleConstant.fairGameWallet]
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

          if (lodash.isEmpty(masterRedisData)) {
            // If masterRedisData is empty, update partner exposure
            let partnerUser = await getUserBalanceDataByUserId(partnershipId);
            let partnerExposure = (partnerUser.exposure || 0) - maxLossExposure;
            await updateUserBalanceByUserId(partnershipId, {
              exposure: partnerExposure,
            });
          } else {
            // If masterRedisData exists, update partner exposure and session data
            let masterExposure = parseFloat(masterRedisData.exposure) ?? 0;
            let partnerExposure = (masterExposure || 0) + maxLossExposure;
            await updateUserBalanceByUserId(partnershipId, {
              exposure: partnerExposure,
            });

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

            let redisData = await calculateProfitLossSession(
              redisBetData,
              placedBetObject,
              partnership
            );

            await updateUserDataRedis(partnershipId, {
              [`${placedBetObject?.betPlacedData?.betId}_profitLoss`]:
                JSON.stringify(redisData),
              exposure: partnerExposure,
              [`${redisKeys.userSessionExposure}${placedBetObject?.betPlacedData?.matchId}`]:
                parseFloat(
                  masterRedisData?.[
                  `${redisKeys.userSessionExposure}${placedBetObject?.betPlacedData?.matchId}`
                  ] || 0
                ) + parseFloat(redisData?.maxLoss || 0.0) - parseFloat(redisBetData?.maxLoss || 0.0),
            });

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

walletSessionBetDeleteQueue.process((job, done) => {
  let jobData = job.data;
  let userId = jobData.userId;
  try {
    // Parse partnerships from userRedisData
    let partnershipObj = JSON.parse(jobData.partnership);

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

    // Iterate through partnerships based on role and update exposure
    Object.keys(partnershipPrefixByRole)
      ?.filter(
        (item) =>
          item == partnershipPrefixByRole[userRoleConstant.fairGameAdmin] ||
          item == partnershipPrefixByRole[userRoleConstant.fairGameWallet]
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

            if (lodash.isEmpty(masterRedisData)) {
              // If masterRedisData is empty, update partner exposure
              let partnerUser = await getUserBalanceDataByUserId(partnershipId);
              let partnerExposure = (partnerUser.exposure || 0) - exposureDiff;
              await updateUserBalanceByUserId(partnershipId, {
                exposure: partnerExposure,
              });
            } else {
              // If masterRedisData exists, update partner exposure and session data
              let masterExposure = parseFloat(masterRedisData.exposure) ?? 0;
              let partnerExposure = (masterExposure || 0) - exposureDiff;
              await updateUserBalanceByUserId(partnershipId, {
                exposure: partnerExposure,
              });

              let oldProfitLossParent = JSON.parse(masterRedisData[redisName]);
              let parentPLbetPlaced = oldProfitLossParent?.betPlaced || [];
              let oldMaxLossParent = oldProfitLossParent?.maxLoss;
              let newMaxLossParent = 0;

              await mergeProfitLoss(userDeleteProfitLoss.betData, parentPLbetPlaced);

              userDeleteProfitLoss.betData.map((ob, index) => {
                let partnershipData = (ob.profitLoss * partnership) / 100;
                if (ob.odds == parentPLbetPlaced[index].odds) {
                  parentPLbetPlaced[index].profitLoss = parseFloat(parentPLbetPlaced[index].profitLoss) + partnershipData;
                  if (newMaxLossParent < Math.abs(parentPLbetPlaced[index].profitLoss) && parentPLbetPlaced[index].profitLoss < 0) {
                    newMaxLossParent = Math.abs(parentPLbetPlaced[index].profitLoss);
                  }
                }
              });
              oldProfitLossParent.betPlaced = parentPLbetPlaced;
              oldProfitLossParent.maxLoss = newMaxLossParent;
              oldProfitLossParent.totalBet = oldProfitLossParent.totalBet - userDeleteProfitLoss.total_bet;
              let sessionExposure = parseFloat(masterRedisData[redisSesionExposureName]) - oldMaxLossParent + newMaxLossParent;
              let redisObj = {
                [redisName]: JSON.stringify(oldProfitLossParent),
                exposure: partnerExposure,
                [redisSesionExposureName]: sessionExposure
              };

              await updateUserDataRedis(partnershipId, redisObj);

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
                domainUrl: domainUrl
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

walletMatchBetDeleteQueue.process((job, done) => {
  let jobData = job.data;
  let userId = jobData.userId;
  try {
    // Parse partnerships from userRedisData
    let partnershipObj = {};
    try{
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

    // Iterate through partnerships based on role and update exposure
    Object.keys(partnershipPrefixByRole)
      ?.filter(
        (item) =>
          item == partnershipPrefixByRole[userRoleConstant.fairGameAdmin] ||
          item == partnershipPrefixByRole[userRoleConstant.fairGameWallet]
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

            if (lodash.isEmpty(masterRedisData)) {
              // If masterRedisData is empty, update partner exposure
              let partnerUser = await getUserBalanceDataByUserId(partnershipId);
              let partnerExposure = (partnerUser.exposure || 0) - exposureDiff;
              await updateUserBalanceByUserId(partnershipId, {
                exposure: partnerExposure,
              });
            } else {
              // If masterRedisData exists, update partner exposure and session data
              let masterExposure = parseFloat(masterRedisData.exposure) ?? 0;
              let partnerExposure = (masterExposure || 0) - exposureDiff;
              await updateUserBalanceByUserId(partnershipId, {
                exposure: partnerExposure,
              });

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

              await updateUserDataRedis(partnershipId, redisObj);

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

module.exports.WalletMatchBetQueue = WalletMatchBetQueue