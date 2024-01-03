const Queue = require('bee-queue');
const lodash = require('lodash');
const { getUserRedisData, updateUserDataRedis } = require('../services/redis/commonFunctions');
const { getUserBalanceDataByUserId, updateUserBalanceByUserid } = require('../services/userBalanceService');
const { calculateExpertRate } = require('../services/commonService');
const { logger } = require('../config/logger');
const { redisKeys } = require('../config/contants');
const { sendMessageToUser } = require('../sockets/socketManager');
const walletRedisOption = {
    removeOnSuccess: true,
    redis: {
      host: process.env.INTERNAL_REDIS_HOST,
      port: process.env.INTERNAL_REDIS_PORT,
    }
  }
  
  const WalletMatchBetQueue = new Queue('walletMatchBetQueue', walletRedisOption);

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
                    [jobData.teamCrateRedisKey]: teamData.teamC
                }
                await updateUserDataRedis(mPartenerShipId, userRedisObj);
                let myStake = Number(((jobData.stake / 100) * mPartenerShip).toFixed(2));
                logger.info({
                    context: "Update User Exposure and Stake",
                    process: `User ID : ${userId} fairgame admin id ${mPartenerShipId}`,
                    data: `My Stake : ${myStake}`
                })
                //send Data to socket
                sendMessageToUser(mPartenerShipId,{jobData});
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
                    [jobData.teamCrateRedisKey]: teamData.teamC
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

module.exports.WalletMatchBetQueue = WalletMatchBetQueue