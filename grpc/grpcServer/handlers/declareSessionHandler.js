const grpc = require("@grpc/grpc-js");
const { __mf } = require("i18n");
const { userRoleConstant, redisKeys, socketData, oldBetFairDomain, marketBetType, unDeclare, sessionBettingType } = require("../../../config/contants");
const { logger } = require("../../../config/logger");
const { addResultFailed } = require("../../../services/betService");
const { insertCommissions, getCombinedCommission, deleteCommission } = require("../../../services/commissionService");
const { getUserDomainWithFaId } = require("../../../services/domainDataService");
const { getUserRedisData, getUserRedisMultiKeyData } = require("../../../services/redis/commonFunctions");
const { getUserBalanceDataByUserId, getUserBalanceDataByUserIds, updateUserDeclareBalanceData } = require("../../../services/userBalanceService");
const { getUser, getUserById, getUsersWithoutCount } = require("../../../services/userService");
const { sendMessageToUser, broadcastEvent } = require("../../../sockets/socketManager");
const { declareSessionHandler, declareSessionNoResultHandler, unDeclareSessionHandler } = require("../../grpcClient/handlers/wallet/declareSessionHandler");
const { mergeProfitLoss, updateSuperAdminData, convertToBatches } = require("../../../services/commonService");
const { notifyTelegram } = require("../../../utils/telegramMessage");
const { In } = require("typeorm");
const internalRedis = require("../../../config/internalRedisConnection");
const { roundToTwoDecimals } = require("../../../utils/mathUtils");

exports.declareSessionResult = async (call) => {
  try {

    const { betId, score, sessionDetails, userId: userIds, matchId, match } = call.request;
    const domainData = await getUserDomainWithFaId();

    const fgWallet = await getUser({
      roleName: userRoleConstant?.fairGameWallet
    }, ["id", "sessionCommission"]);

    let fwProfitLoss = 0;
    let exposure = 0;
    let type = sessionDetails?.type
    let bulkCommission = [];
    let totalCommissions = [];
    let resultProfitLoss = 0;

    const userUpdateDBData = {};
    const updatePipeline = internalRedis.pipeline();

    for (let item of domainData) {
      try {
        const response = await declareSessionHandler(
          {
            betId,
            score,
            sessionDetails,
            userId: userIds,
            matchId,
            match,
          },
          item?.domain
        );

        resultProfitLoss += roundToTwoDecimals(response?.fwProfitLoss || 0);
        await updateSuperAdminData(response, type, userUpdateDBData);
        await updateBulkCommission(response, bulkCommission);

        const userData = response?.faAdminCal?.userData || {};

        const userIdsData = Object.keys(userData);

        const [users, userBalances, usersRedisData] = await Promise.all([
          getUsersWithoutCount({ id: In(userIdsData) }, ["sessionCommission", "fwPartnership"])
            .then(arr => arr.reduce((m, u) => (m[u.id] = u, m), {})),
          getUserBalanceDataByUserIds(userIdsData)
            .then(arr => arr.reduce((m, b) => (m[b.userId] = b, m), {})),
          getUserRedisMultiKeyData(userIdsData, ['profitLoss', 'myProfitLoss', 'exposure', 'totalCommission'])
        ]);

        for (const userId in userData) {
          const adminBalanceData = userData[userId];
          if (!adminBalanceData || adminBalanceData.role !== userRoleConstant.fairGameAdmin) continue;

          fwProfitLoss += parseFloat(adminBalanceData?.profitLoss);
          totalCommissions.push(...(response?.faAdminCal?.commission || []));

          const parentUser = userBalances[userId];
          const userCommission = users[userId];
          const parentUserRedisData = usersRedisData[userId];

          const parentProfitLoss = roundToTwoDecimals(parentUserRedisData?.profitLoss || parentUser?.profitLoss);
          const parentMyProfitLoss = roundToTwoDecimals(parentUserRedisData?.myProfitLoss || parentUser?.myProfitLoss);
          const parentExposure = roundToTwoDecimals(parentUserRedisData?.exposure || parentUser?.exposure);

          parentUser.profitLoss = roundToTwoDecimals(parentProfitLoss + parseFloat(adminBalanceData?.profitLoss));
          parentUser.myProfitLoss = roundToTwoDecimals(parentMyProfitLoss - parseFloat(adminBalanceData?.myProfitLoss));
          parentUser.exposure = roundToTwoDecimals(parentExposure - adminBalanceData?.exposure);

          let tempCommission = 0;
          if (userCommission?.sessionCommission && item.domain === oldBetFairDomain) {
            tempCommission += roundToTwoDecimals((adminBalanceData?.totalCommission || 0) * parseFloat(userCommission?.sessionCommission) / 100);
            parentUser.totalCommission = (parseFloat(parentUser.totalCommission || 0) + tempCommission);

            Object.keys(response?.bulkCommission)?.forEach((item) => {
              response?.bulkCommission?.[item]?.filter(items => items?.superParent === userId).forEach(items => {
                bulkCommission.push({
                  createBy: item,
                  matchId: items.matchId,
                  betId: items?.betId,
                  betPlaceId: items?.betPlaceId,
                  parentId: userId,
                  teamName: items?.sessionName,
                  betPlaceDate: new Date(items?.betPlaceDate),
                  odds: items?.odds,
                  betType: items?.betType,
                  stake: items?.stake,
                  commissionAmount: roundToTwoDecimals(parseFloat(items?.amount) * parseFloat(userCommission?.sessionCommission) / 100),
                  partnerShip: userCommission.fwPartnership,
                  matchName: match?.title,
                  matchStartDate: new Date(match?.startAt),
                  userName: items.userName,
                  matchType: marketBetType.SESSION
                });
              });
            });
          }

          if (parentUser.exposure < 0) {
            logger.info({ message: "Exposure in negative for user:", data: { betId, matchId, parentUser } });
            adminBalanceData.exposure += parentUser.exposure;
            parentUser.exposure = 0;
          }

          userUpdateDBData[parentUser.userId] = {
            profitLoss: roundToTwoDecimals((userUpdateDBData[parentUser.userId]?.profitLoss || 0) + parseFloat(adminBalanceData?.profitLoss)),
            myProfitLoss: roundToTwoDecimals(-parseFloat(adminBalanceData?.myProfitLoss) + (userUpdateDBData[parentUser.userId]?.myProfitLoss || 0)),
            exposure: (-parseFloat(adminBalanceData?.exposure) + (userUpdateDBData[parentUser.userId]?.exposure || 0)),
            totalCommission: roundToTwoDecimals(parseFloat(tempCommission) + (userUpdateDBData[parentUser.userId]?.totalCommission || 0)),
            balance: 0
          }

          if (parentUserRedisData) {
            updatePipeline
              .hincrbyfloat(userId, 'profitLoss', roundToTwoDecimals(adminBalanceData?.profitLoss))
              .hincrbyfloat(userId, 'myProfitLoss', -roundToTwoDecimals(adminBalanceData?.myProfitLoss))
              .hincrbyfloat(userId, 'exposure', -adminBalanceData?.exposure)
              .hincrbyfloat(userId, `${redisKeys.userSessionExposure}${matchId}`, -adminBalanceData?.exposure)
              .hdel(userId, `${betId}${redisKeys.profitLoss}`);

          }

          exposure += parseFloat(adminBalanceData?.exposure);
        }
        exposure += parseFloat(response?.faAdminCal?.userData?.[fgWallet.id]?.exposure || 0);
      } catch (err) {
        logger.error({
          error: `Error at declare session result for the domain ${item?.domain}.`,
          stack: err.stack,
          message: err.message,
        });
        await addResultFailed({
          matchId,
          betId,
          userId: item?.userId?.id,
          result: score,
          createBy: userIds,
        });

        notifyTelegram(`Error at result declare session wallet side for domain ${item?.domain} on tournament ${betId} for match ${matchId} ${JSON.stringify(err || "{}")}`);

      }
    }


    const parentUser = await getUserBalanceDataByUserId(fgWallet.id);
    const parentUserRedisData = await getUserRedisData(fgWallet.id);

    const parentProfitLoss = roundToTwoDecimals(parentUserRedisData?.profitLoss || parentUser?.profitLoss);
    const parentMyProfitLoss = roundToTwoDecimals(parentUserRedisData?.myProfitLoss || parentUser?.myProfitLoss);
    const parentExposure = roundToTwoDecimals(parentUserRedisData?.exposure || parentUser?.exposure);

    parentUser.profitLoss = roundToTwoDecimals(parentProfitLoss + fwProfitLoss);
    parentUser.myProfitLoss = roundToTwoDecimals(parentMyProfitLoss - fwProfitLoss);
    parentUser.exposure = roundToTwoDecimals(parentExposure - exposure);


    const allChildUsers = await getUsersWithoutCount({ createBy: fgWallet.id }, ["id"]);
    const commissionWallet = await bulkCommission.filter((item) => allChildUsers.find((items) => items.id == item.parentId) != undefined)?.reduce((prev, curr) => {
      return roundToTwoDecimals(prev + (curr.commissionAmount * curr.partnerShip / 100))
    }, 0);
    parentUser.totalCommission += commissionWallet || 0;

    if (parentUser.exposure < 0) {
      logger.info({
        message: "Exposure in negative for user: ",
        data: {
          betId,
          matchId,
          parentUser,
        },
      });
      exposure += parentUser.exposure;
      parentUser.exposure = 0;
    }

    userUpdateDBData[parentUser.userId] = {
      profitLoss: roundToTwoDecimals(fwProfitLoss),
      myProfitLoss: -roundToTwoDecimals(fwProfitLoss),
      exposure: -exposure,
      totalCommission: commissionWallet,
      balance: 0
    }

    logger.info({
      message: "Declare result db update for parent ",
      data: {
        betId,
        parentUser,
      },
    });
    if (parentUserRedisData?.exposure) {
      updatePipeline
        .hincrbyfloat(parentUser.userId, 'profitLoss', roundToTwoDecimals(fwProfitLoss))
        .hincrbyfloat(parentUser.userId, 'myProfitLoss', -roundToTwoDecimals(fwProfitLoss))
        .hincrbyfloat(parentUser.userId, 'exposure', -exposure)
        .hincrbyfloat(parentUser.userId, `${redisKeys.userSessionExposure}${matchId}`, -exposure)
        .hdel(parentUser.userId, `${betId}${redisKeys.profitLoss}`);

    }

    await updatePipeline.exec();

    const updateUserBatch = convertToBatches(500, userUpdateDBData);
    for (let i = 0; i < updateUserBatch.length; i++) {
      await updateUserDeclareBalanceData(updateUserBatch[i]);
    }

    broadcastEvent(socketData.sessionResult, {
      betId,
      matchId
    });

    insertCommissions(bulkCommission);
    return { data: { profitLoss: resultProfitLoss, totalCommission: commissionWallet } };

  } catch (error) {
    logger.error({
      error: `Error at declare session result for the expert.`,
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

const updateBulkCommission = async (response, bulkCommission) => {
  bulkCommission.push(...(response?.faAdminCal?.commission?.map((item) => {
    return {
      ...item,
      betPlaceDate: new Date(item?.betPlaceDate),
      matchStartDate: new Date(item?.matchStartDate)
    }
  }) || []));
}

exports.declareSessionNoResult = async (call) => {
  try {
    const { betId, score, userId, matchId } = call.request;

    const domainData = await getUserDomainWithFaId();

    const fgWallet = await getUser({ roleName: userRoleConstant?.fairGameWallet, }, ["id"]);

    let exposure = 0;

    const userUpdateDBData = {};
    const updatePipeline = internalRedis.pipeline();

    for (let item of domainData) {
      try {
        let response = await declareSessionNoResultHandler(
          {
            betId,
            score,
            matchId,
          },
          item?.domain
        );

        for (let userId in response?.superAdminData) {
          response.superAdminData[userId].exposure = -response?.superAdminData?.[userId].exposure;
          userUpdateDBData[userId] = response?.superAdminData?.[userId];

          logger.info({
            message: "Updating user balance created by fgadmin or wallet in declare session noresult: ",
            data: {
              superAdminData: response?.superAdminData?.[userId],
              userId: userId
            },
          });
        }

        const userData = response?.faAdminCal || {};

        const userIdsData = Object.keys(userData);

        const [userBalances, usersRedisData] = await Promise.all([
          getUserBalanceDataByUserIds(userIdsData)
            .then(arr => arr.reduce((m, b) => (m[b.userId] = b, m), {})),
          getUserRedisMultiKeyData(userIdsData, ['profitLoss', 'myProfitLoss', 'exposure', 'totalCommission'])
        ]);

        for (let userId in userData) {

          const adminBalanceData = userData[userId];
          if (!adminBalanceData || adminBalanceData.role !== userRoleConstant.fairGameAdmin) continue;

          const parentUser = userBalances[userId];
          const parentUserRedisData = usersRedisData[userId];

          const parentExposure = roundToTwoDecimals(parentUserRedisData?.exposure || parentUser?.exposure);

          parentUser.exposure = roundToTwoDecimals(parentExposure - adminBalanceData?.exposure);

          if (parentUser.exposure < 0) {
            logger.info({
              message: "Exposure in negative for user: ",
              data: {
                betId,
                matchId,
                parentUser,
              },
            });
            adminBalanceData.exposure += parentUser.exposure;
            parentUser.exposure = 0;
          }

          userUpdateDBData[parentUser.userId] = { exposure: ((userUpdateDBData[parentUser.userId]?.exposure || 0) - parseFloat(adminBalanceData?.exposure)) }

          logger.info({
            message: "Declare result db update for parent ",
            data: {
              betId,
              parentUser,
            },
          });

          if (parentUserRedisData) {
            updatePipeline
              .hincrbyfloat(userId, 'exposure', -adminBalanceData?.exposure)
              .hincrbyfloat(userId, `${redisKeys.userSessionExposure}${matchId}`, -adminBalanceData?.exposure)
              .hdel(userId, `${betId}${redisKeys.profitLoss}`);

          }

          exposure += adminBalanceData?.exposure;
        }
        exposure += parseFloat(response?.faAdminCal?.[fgWallet.id]?.exposure || 0);
      } catch (err) {
        logger.error({
          error: `Error at declare session no result for the domain ${item?.domain}.`,
          stack: err.stack,
          message: err.message,
        });

        await addResultFailed({
          matchId: matchId,
          betId: betId,
          userId: item?.userId?.id,
          result: score,
          createBy: userId,
        });

        notifyTelegram(`Error at result declare session no result wallet side for domain ${item?.domain} on tournament ${betId} for match ${matchId} ${JSON.stringify(err || "{}")}`);

      }
    };


    const parentUser = await getUserBalanceDataByUserId(fgWallet.id);
    const parentUserRedisData = await getUserRedisData(parentUser?.userId);

    const parentExposure = roundToTwoDecimals(parentUserRedisData?.exposure || parentUser?.exposure);

    parentUser.exposure = parentExposure - exposure;
    if (parentUser.exposure < 0) {
      logger.info({
        message: "Exposure in negative for user: ",
        data: {
          betId,
          matchId,
          parentUser,
        },
      });
      exposure += parentUser.exposure;
      parentUser.exposure = 0;
    }

    userUpdateDBData[parentUser.userId] = {
      exposure: -exposure,
    }

    logger.info({
      message: "Declare result db update for parent ",
      data: {
        betId,
        parentUser,
      },
    });

    if (parentUserRedisData?.exposure) {
      updatePipeline
        .hincrbyfloat(parentUser.userId, 'exposure', -exposure)
        .hincrbyfloat(parentUser.userId, `${redisKeys.userSessionExposure}${matchId}`, -exposure)
        .hdel(parentUser.userId, `${betId}${redisKeys.profitLoss}`);

    }

    await updatePipeline.exec();

    const updateUserBatch = convertToBatches(500, userUpdateDBData);
    for (let i = 0; i < updateUserBatch.length; i++) {
      await updateUserDeclareBalanceData(updateUserBatch[i]);
    }

    broadcastEvent(socketData.sessionResult, {
      betId,
      matchId
    });
    return {};

  } catch (error) {
    logger.error({
      error: `Error at declare session no result for the expert.`,
      stack: error.stack,
      message: error.message,
    });
    // Handle any errors and return an error response
    throw {
      code: grpc.status.INTERNAL,
      message: error?.message || __mf("internalServerError"),
    };
  }
};

exports.unDeclareSessionResult = async (call) => {
  try {
    const { betId, sessionDetails, userId, matchId } = call.request;

    const domainData = await getUserDomainWithFaId();
    const fgWallet = await getUser({
      roleName: userRoleConstant?.fairGameWallet
    }, ["id", "sessionCommission"]);

    let fwProfitLoss = 0;
    let profitLossDataAdmin = {};
    let profitLossDataWallet = null;
    let exposure = 0;

    const userUpdateDBData = {};
    const updatePipeline = internalRedis.pipeline();

    const commissionData = await getCombinedCommission(betId);
    let fwData = new Set();
    let resultProfitLoss = 0;
    for (let i = 0; i < domainData?.length; i++) {
      let item = domainData[i];
      let response = await unDeclareSessionHandler({
        betId,
        sessionDetails,
        userId,
        matchId,
      }, item?.domain).then((data) => data).catch(async (err) => {
        logger.error({
          error: `Error at un Declare session result for the domain ${item?.domain}.`,
          stack: err.stack,
          message: err.message,
        });

        await addResultFailed({
          matchId: matchId,
          betId: betId,
          userId: item?.userId?.id,
          result: unDeclare,
          createBy: userId
        })
        notifyTelegram(`Error at result undeclare session wallet side for domain ${item?.domain} on tournament ${betId} for match ${matchId} ${JSON.stringify(err || "{}")}`);

        return;
      });
      resultProfitLoss += roundToTwoDecimals(response?.fwProfitLoss || 0)


      for (let userIds in response?.superAdminData) {
        if (response?.superAdminData?.[userIds]?.role == userRoleConstant.user) {
          response.superAdminData[userIds].profitLoss = -response?.superAdminData?.[userIds].profitLoss;
          response.superAdminData[userIds].myProfitLoss = -response?.superAdminData?.[userIds].myProfitLoss;
        } else {
          response.superAdminData[userIds].profitLoss = -response?.superAdminData?.[userIds].profitLoss;
          response.superAdminData[userIds].balance = 0;
        }
        let userCommission = commissionData?.find((cData) => cData?.userId == userIds);
        if (userCommission) {
          response.superAdminData[userIds].totalCommission = -roundToTwoDecimals(userCommission?.amount || 0);
        }
        userUpdateDBData[userIds] = response?.superAdminData?.[userIds];

        logger.info({
          message: "Updating user balance created by fgadmin or wallet in unDeclare session: ",
          data: {
            superAdminData: response?.superAdminData?.[userIds],
            userId: userIds
          },
        });
      }

      const userData = response?.faAdminCal?.userData || {};

      const userIds = Object.keys(userData);

      const [userBalances, usersRedisData] = await Promise.all([
        getUserBalanceDataByUserIds(userIds)
          .then(arr => arr.reduce((m, b) => (m[b.userId] = b, m), {})),
        getUserRedisMultiKeyData(userIds, ['profitLoss', 'myProfitLoss', 'exposure', 'totalCommission'])
      ]);

      for (let parentUserId in userData) {
        const adminBalanceData = userData[parentUserId];
        if (!adminBalanceData || adminBalanceData.role !== userRoleConstant.fairGameAdmin) continue;

        fwProfitLoss += parseFloat(adminBalanceData?.profitLoss);

        const parentUser = userBalances[parentUserId];
        const parentUserRedisData = usersRedisData[parentUser?.userId];

        const parentProfitLoss = roundToTwoDecimals(parentUserRedisData?.profitLoss || parentUser?.profitLoss);
        const parentMyProfitLoss = roundToTwoDecimals(parentUserRedisData?.myProfitLoss || parentUser?.myProfitLoss);
        const parentExposure = roundToTwoDecimals(parentUserRedisData?.exposure || parentUser?.exposure);

        parentUser.profitLoss = roundToTwoDecimals(parentProfitLoss - parseFloat(adminBalanceData?.profitLoss));
        parentUser.myProfitLoss = roundToTwoDecimals(parentMyProfitLoss + parseFloat(adminBalanceData?.myProfitLoss));
        parentUser.exposure = roundToTwoDecimals(parentExposure + adminBalanceData?.exposure);

        let parentCommissionData = 0;

        if (!fwData.has(parentUserId)) {
          fwData.add(parentUserId);
          let parentCommission = commissionData?.find((cData) => cData?.userId == parentUser.userId);
          if (parentCommission) {
            parentUser.totalCommission = parentUser.totalCommission - parseFloat(parentCommission?.amount || 0);
            parentCommissionData += parseFloat(parentCommission?.amount || 0);
          }
        }

        if (parentUser.exposure < 0) {
          logger.info({
            message: "Exposure in negative for user: ",
            data: {
              betId,
              matchId,
              parentUser,
            },
          });
          adminBalanceData.exposure += parentUser.exposure
          parentUser.exposure = 0;
        }

        userUpdateDBData[parentUser.userId] = {
          profitLoss: roundToTwoDecimals((userUpdateDBData[parentUser.userId]?.profitLoss || 0) - parseFloat(adminBalanceData?.profitLoss)),
          myProfitLoss: roundToTwoDecimals(parseFloat(adminBalanceData?.myProfitLoss) + (userUpdateDBData[parentUser.userId]?.myProfitLoss || 0)),
          exposure: (parseFloat(adminBalanceData?.exposure) + (userUpdateDBData[parentUser.userId]?.exposure || 0)),
          totalCommission: roundToTwoDecimals(-parseFloat(parentCommissionData) + (userUpdateDBData[parentUser.userId]?.totalCommission || 0)),
          balance: 0
        }

        logger.info({
          message: "Un declare result db update for parent ",
          data: {
            betId,
            parentUser,
          },
        });

        let newProfitLoss = adminBalanceData?.profitLossData;
        if (newProfitLoss && Object.keys(newProfitLoss)?.length > 0) {
          if (!profitLossDataAdmin[parentUser.userId]) {
            profitLossDataAdmin[parentUser.userId] = { ...newProfitLoss };
          } else {
            if (newProfitLoss?.betPlaced && profitLossDataAdmin[parentUser.userId]?.betPlaced) {
              mergeProfitLoss(
                newProfitLoss?.betPlaced,
                profitLossDataAdmin[parentUser.userId]?.betPlaced,
                sessionDetails?.type
              );


              if ([sessionBettingType.cricketCasino, sessionBettingType.fancy1, sessionBettingType.oddEven]?.includes(sessionDetails?.type)) {
                profitLossDataAdmin = {
                  maxLoss: profitLossDataAdmin[parentUser.userId]?.maxLoss + newProfitLoss?.maxLoss,
                  totalBet: newProfitLoss?.totalBet + profitLossDataAdmin[parentUser.userId]?.totalBet,
                  betPlaced: newProfitLoss?.betPlaced
                };
              }

              else {
                profitLossDataAdmin = {
                  upperLimitOdds: newProfitLoss?.betPlaced?.[newProfitLoss?.betPlaced?.length - 1]?.odds,
                  lowerLimitOdds: newProfitLoss?.betPlaced?.[0]?.odds,
                  maxLoss: profitLossDataAdmin[parentUser.userId]?.maxLoss + newProfitLoss?.maxLoss,
                  totalBet: newProfitLoss?.totalBet + profitLossDataAdmin[parentUser.userId]?.totalBet,
                  betPlaced: newProfitLoss?.betPlaced?.map((item, index) => {
                    return {
                      odds: item?.odds,
                      profitLoss:
                        item?.profitLoss + profitLossDataAdmin[parentUser.userId]?.betPlaced?.[index]?.profitLoss,
                    };
                  }),
                };
              }
            }

          }
        }

        let parentRedisUpdateObj = {
          ...(profitLossDataAdmin[parentUser.userId] ? {
            [betId + redisKeys.profitLoss]: JSON.stringify(
              profitLossDataAdmin[parentUser.userId]
            )
          } : {}),
        };
        if (
          parentUserRedisData
        ) {
          updatePipeline
            .hincrbyfloat(userId, 'profitLoss', -roundToTwoDecimals(adminBalanceData?.profitLoss))
            .hincrbyfloat(userId, 'myProfitLoss', roundToTwoDecimals(adminBalanceData?.myProfitLoss))
            .hincrbyfloat(userId, 'exposure', adminBalanceData?.exposure)
            .hincrbyfloat(userId, `${redisKeys.userSessionExposure}${matchId}`, adminBalanceData?.exposure)
            .hmset(userId, parentRedisUpdateObj);
        }
        sendMessageToUser(parentUser.userId, socketData.sessionResultUnDeclare, {
          betId,
          matchId,
          parentRedisUpdateObj
        });

        exposure += parseFloat(adminBalanceData?.["exposure"]);
      }
      let newProfitLoss = response?.faAdminCal?.walletData?.profitLossObjWallet;
      if (newProfitLoss && Object.keys(newProfitLoss)?.length > 0) {
        if (!profitLossDataWallet) {
          profitLossDataWallet = { ...newProfitLoss };
        } else {
          if (newProfitLoss?.betPlaced && profitLossDataWallet?.betPlaced) {
            mergeProfitLoss(
              newProfitLoss?.betPlaced,
              profitLossDataWallet?.betPlaced,
              sessionDetails?.type
            );

            if ([sessionBettingType.cricketCasino, sessionBettingType.fancy1, sessionBettingType.oddEven]?.includes(sessionDetails?.type)) {
              profitLossDataWallet = {
                maxLoss: profitLossDataWallet?.maxLoss + newProfitLoss?.maxLoss,
                totalBet: (newProfitLoss?.totalBet || 0) + (profitLossDataWallet?.totalBet || 0),
                betPlaced: newProfitLoss?.betPlaced
              };
            }
            else {
              profitLossDataWallet = {
                upperLimitOdds: newProfitLoss?.betPlaced?.[newProfitLoss?.betPlaced?.length - 1]?.odds,
                lowerLimitOdds: newProfitLoss?.betPlaced?.[0]?.odds,
                maxLoss: profitLossDataWallet?.maxLoss + newProfitLoss?.maxLoss,
                totalBet: (newProfitLoss?.totalBet || 0) + (profitLossDataWallet?.totalBet || 0),
                betPlaced: newProfitLoss?.betPlaced?.map((item, index) => {
                  return {
                    odds: item?.odds,
                    profitLoss:
                      item?.profitLoss + profitLossDataWallet?.betPlaced?.[index]?.profitLoss,
                  };
                }),
              };
            }
          }

        }
      }
      exposure += parseFloat(response?.faAdminCal?.userData?.[fgWallet.id]?.exposure || 0);

    };

    const parentUser = await getUserBalanceDataByUserId(fgWallet.id);
    const parentUserRedisData = await getUserRedisData(parentUser?.userId);

    const parentProfitLoss = roundToTwoDecimals(parentUserRedisData?.profitLoss || parentUser?.profitLoss);
    const parentMyProfitLoss = roundToTwoDecimals(parentUserRedisData?.myProfitLoss || parentUser?.myProfitLoss);
    const parentExposure = roundToTwoDecimals(parentUserRedisData?.exposure || parentUser?.exposure);

    parentUser.profitLoss = roundToTwoDecimals(parentProfitLoss - fwProfitLoss);
    parentUser.myProfitLoss = roundToTwoDecimals(parentMyProfitLoss + fwProfitLoss);
    parentUser.exposure = roundToTwoDecimals(parentExposure + exposure);


    const allChildUsers = await getUsersWithoutCount({ createBy: fgWallet.id }, ["id"]);
    const commissionWallet = await commissionData.filter((item) => allChildUsers.find((items) => items.id == item.userId) != undefined)?.reduce((prev, curr) => {
      return roundToTwoDecimals(prev + parseFloat(curr.amount))
    }, 0);
    parentUser.totalCommission -= commissionWallet;

    if (parentUser.exposure < 0) {
      logger.info({
        message: "Exposure in negative for user: ",
        data: {
          betId,
          matchId,
          parentUser,
        },
      });
      exposure += parentUser.exposure;
      parentUser.exposure = 0;
    }

    userUpdateDBData[parentUser.userId] = {
      profitLoss: -roundToTwoDecimals(fwProfitLoss),
      myProfitLoss: +roundToTwoDecimals(fwProfitLoss),
      exposure: exposure,
      totalCommission: -commissionWallet,
      balance: 0
    }

    logger.info({
      message: "Un declare result db update for parent ",
      data: {
        betId,
        parentUser,
      },
    });


    let parentRedisUpdateObj = {
      ...(profitLossDataWallet ? {
        [betId + redisKeys.profitLoss]: JSON.stringify(
          profitLossDataWallet
        )
      } : {}),
    };
    if (
      parentUserRedisData
    ) {
      updatePipeline
        .hincrbyfloat(parentUser.userId, 'profitLoss', -roundToTwoDecimals(fwProfitLoss))
        .hincrbyfloat(parentUser.userId, 'myProfitLoss', roundToTwoDecimals(fwProfitLoss))
        .hincrbyfloat(parentUser.userId, 'exposure', exposure)
        .hincrbyfloat(parentUser.userId, `${redisKeys.userSessionExposure}${matchId}`, exposure)
        .hmset(parentUser.userId, parentRedisUpdateObj);
    }
    sendMessageToUser(parentUser.userId, socketData.sessionResultUnDeclare, {
      betId,
      matchId,
      parentRedisUpdateObj
    });

    await updatePipeline.exec();

    const updateUserBatch = convertToBatches(500, userUpdateDBData);
    for (let i = 0; i < updateUserBatch.length; i++) {
      await updateUserDeclareBalanceData(updateUserBatch[i]);
    }

    deleteCommission(betId);

    return { data: { profitLoss: resultProfitLoss, profitLossObj: JSON.stringify(profitLossDataWallet) } };

  } catch (error) {
    logger.error({
      error: `Error at un declare session result for the expert.`,
      stack: error.stack,
      message: error.message,
    });
    // Handle any errors and return an error response
    throw {
      code: grpc.status.INTERNAL,
      message: error?.message || __mf("internalServerError"),
    };
  }
};
