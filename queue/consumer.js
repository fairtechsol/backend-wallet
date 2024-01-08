const Queue = require('bee-queue');
const lodash = require('lodash');
const { getUserRedisData, updateUserDataRedis } = require('../services/redis/commonFunctions');
const { getUserBalanceDataByUserId, updateUserBalanceByUserid } = require('../services/userBalanceService');
const { calculateExpertRate, calculateProfitLossSession } = require('../services/commonService');
const { logger } = require('../config/logger');
const { redisKeys, partnershipPrefixByRole, userRoleConstant, socketData } = require('../config/contants');
const { sendMessageToUser } = require('../sockets/socketManager');
const walletRedisOption = {
    removeOnSuccess: true,
    redis: {
      host: process.env.INTERNAL_REDIS_HOST,
      port: process.env.INTERNAL_REDIS_PORT,
    }
  }
  
  const WalletMatchBetQueue = new Queue('walletMatchBetQueue', walletRedisOption);
  const WalletSessionBetQueue = new Queue('walletSessionBetQueue', walletRedisOption);

  WalletMatchBetQueue.process(async function (job, done) {
    let jobData = job.data;
    let userId = jobData.userId;
    try {
        await calculateRateAmount(jobData, userId);
        return done(null, {});
    } catch (error) {
        logger.info({
            file: `error in bet Queue for User id : ${userId}`,
            error : error.message
        })
        return done(null, {});
    }
});




let calculateRateAmount = async (jobData, userId) => {
  let partnership = JSON.parse(jobData.partnerships);
  let userCurrentExposure = jobData.newUserExposure;
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
    if (partnership['faPartnershipId']) {
        let mPartenerShipId = partnership['faPartnershipId'];
        let mPartenerShip = partnership['faPartnership'];
        try {
            let masterRedisData = await getUserRedisData(mPartenerShipId);
            if (lodash.isEmpty(masterRedisData)) {
                let partnerUser = await getUserBalanceDataByUserId(mPartenerShipId);
                let partnerExpsoure = (partnerUser?.exposure || 0) - userOldExposure + userCurrentExposure;
                await updateUserBalanceByUserid(mPartenerShipId, { exposure: partnerExpsoure })
            } else {
              let masterExposure = masterRedisData.exposure ? masterRedisData.exposure : 0;
                let partnerExpsoure = masterExposure - userOldExposure + userCurrentExposure;
                await updateUserBalanceByUserid(mPartenerShipId, { exposure: partnerExpsoure });

                let teamData = await calculateExpertRate(teamRates, obj, mPartenerShip);
                let userRedisObj = {
                    [redisKeys.userAllExposure]: partnerExpsoure,
                    [jobData.teamArateRedisKey]: teamData.teamA,
                    [jobData.teamBrateRedisKey]: teamData.teamB,
                    ...(jobData.teamCrateRedisKey?{ [jobData.teamCrateRedisKey] : teamData.teamC}:{})
                }
                await updateUserDataRedis(mPartenerShipId, userRedisObj);
                let myStake = Number(((jobData.stake / 100) * mPartenerShip).toFixed(2));
                logger.info({
                    context: "Update User Exposure and Stake",
                    process: `User ID : ${userId} fairgame admin id ${mPartenerShipId}`,
                    data: `My Stake : ${myStake}`
                })
                //send Data to socket
                sendMessageToUser(mPartenerShipId,socketData.MatchBetPlaced,{jobData});
            }
        } catch (error) {
            logger.error({
                context: "error in master exposure update",
                process: `User ID : ${userId} and master id ${mPartenerShipId}`,
                error: error.message,
                stake: error.stack
            })
        }
    }
    if (partnership['fwPartnershipId']) {
        let mPartenerShipId = partnership['fwPartnershipId'];
        let mPartenerShip = partnership['fwPartnership'];
        try {
            let masterRedisData = await getUserRedisData(mPartenerShipId);
            if (lodash.isEmpty(masterRedisData)) {
                let partnerUser = await getUserBalanceDataByUserId(mPartenerShipId);
                let partnerExpsoure = partnerUser.exposure - userOldExposure + userCurrentExposure;
                await updateUserBalanceByUserid(mPartenerShipId, { exposure: partnerExpsoure })
            } else {
              let masterExposure = masterRedisData.exposure ? masterRedisData.exposure : 0;
                let partnerExpsoure = masterExposure - userOldExposure + userCurrentExposure;
                await updateUserBalanceByUserid(mPartenerShipId, { exposure: partnerExpsoure });

                let teamData = await calculateExpertRate(teamRates, obj, mPartenerShip);
                let userRedisObj = {
                    [redisKeys.userAllExposure]: partnerExpsoure,
                    [jobData.teamArateRedisKey]: teamData.teamA,
                    [jobData.teamBrateRedisKey]: teamData.teamB,
                    ...(jobData.teamCrateRedisKey?{ [jobData.teamCrateRedisKey] : teamData.teamC}:{})
                }
                await updateUserDataRedis(mPartenerShipId, userRedisObj);
                let myStake = Number(((jobData.stake / 100) * mPartenerShip).toFixed(2));
                logger.info({
                    context: "Update User Exposure and Stake",
                    process: `User ID : ${userId} super master id ${mPartenerShipId}`,
                    data: `My Stake : ${myStake}`
                })
                //send Data to socket
                sendMessageToUser(mPartenerShipId,{jobData});
            }
        } catch (error) {
            logger.error({
                context: "error in super master exposure update",
                process: `User ID : ${userId} and super master id ${mPartenerShipId}`,
                error: error.message,
                stake: error.stack
            })
        }
    }
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
  
            if (lodash.isEmpty(masterRedisData)) {
              // If masterRedisData is empty, update partner exposure
              let partnerUser = await getUserBalanceDataByUserId(partnershipId);
              let partnerExposure = partnerUser.exposure - maxLossExposure;
              await updateUserBalanceByUserid(partnershipId, {
                exposure: partnerExposure,
              });
            } else {
              // If masterRedisData exists, update partner exposure and session data
              let masterExposure = parseFloat(masterRedisData.exposure) ?? 0;
              let partnerExposure = masterExposure + maxLossExposure;
              await updateUserBalanceByUserid(partnershipId, {
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
                  ) + partnerSessionExposure,
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

module.exports.WalletMatchBetQueue = WalletMatchBetQueue