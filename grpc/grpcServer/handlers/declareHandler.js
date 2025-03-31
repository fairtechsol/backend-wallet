const grpc = require("@grpc/grpc-js");
const { __mf } = require("i18n");
const { userRoleConstant, redisKeys, socketData, oldBetFairDomain, marketBetType } = require("../../../config/contants");
const { logger } = require("../../../config/logger");
const { addResultFailed } = require("../../../services/betService");
const { insertCommissions } = require("../../../services/commissionService");
const { getUserDomainWithFaId } = require("../../../services/domainDataService");
const { getUserRedisData, updateUserDataRedis, deleteKeyFromUserRedis, incrementValuesRedis } = require("../../../services/redis/commonFunctions");
const { getUserBalanceDataByUserId, updateUserBalanceData } = require("../../../services/userBalanceService");
const { getUser, getUserById, getUsersWithoutCount } = require("../../../services/userService");
const { sendMessageToUser } = require("../../../sockets/socketManager");
const { declareSessionHandler } = require("../../grpcClient/handlers/wallet/declareHandler");

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

    const promises = domainData.map(async (item) => {
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
    
        resultProfitLoss += parseFloat(parseFloat(response?.fwProfitLoss || 0).toFixed(2));
        await updateSuperAdminData(response, type);
        await updateBulkCommission(response, bulkCommission);
    
        for (const userId in response?.faAdminCal.userData) {
          const adminBalanceData = response?.faAdminCal.userData[userId];
          fwProfitLoss += parseFloat(adminBalanceData?.["profitLoss"]);
    
          if (adminBalanceData.role === userRoleConstant.fairGameAdmin) {
            totalCommissions = [...totalCommissions, ...response?.faAdminCal?.commission];
            const parentUser = await getUserBalanceDataByUserId(userId);
            const userCommission = await getUserById(userId, ["sessionCommission", "fwPartnership"]);
            const parentUserRedisData = await getUserRedisData(userId);
    
            let parentProfitLoss = parseFloat(parentUser?.profitLoss || 0);
            let parentMyProfitLoss = parseFloat(parentUser?.myProfitLoss || 0);
            let parentExposure = parseFloat(parentUser?.exposure || 0);
    
            if (parentUserRedisData?.profitLoss) parentProfitLoss = parseFloat(parentUserRedisData.profitLoss);
            if (parentUserRedisData?.myProfitLoss) parentMyProfitLoss = parseFloat(parentUserRedisData.myProfitLoss);
            if (parentUserRedisData?.exposure) parentExposure = parseFloat(parentUserRedisData.exposure);
    
            let tempCommission = 0;
            parentUser.profitLoss = parseFloat((parentProfitLoss + adminBalanceData?.["profitLoss"]).toFixed(2));
            parentUser.myProfitLoss = parseFloat((parentMyProfitLoss - adminBalanceData?.["myProfitLoss"]).toFixed(2));
            parentUser.exposure = parseFloat((parentExposure - adminBalanceData?.["exposure"]).toFixed(2));
    
            if (userCommission?.sessionCommission && item.domain === oldBetFairDomain) {
              tempCommission += Number(
                ((adminBalanceData?.["totalCommission"] || 0) * parseFloat(userCommission?.sessionCommission) / 100).toFixed(2)
              );
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
                    commissionAmount: parseFloat((parseFloat(items?.amount) * parseFloat(userCommission?.sessionCommission) / 100).toFixed(2)),
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
              adminBalanceData["exposure"] += parentUser.exposure;
              parentUser.exposure = 0;
            }
    
            await updateUserBalanceData(parentUser.userId, {
              balance: 0,
              profitLoss: adminBalanceData?.["profitLoss"],
              myProfitLoss: -adminBalanceData?.["myProfitLoss"],
              exposure: -adminBalanceData?.["exposure"],
              totalCommission: tempCommission,
            });
    
            if (parentUserRedisData?.exposure) {
              await incrementValuesRedis(parentUser.userId, {
                profitLoss: adminBalanceData?.["profitLoss"],
                myProfitLoss: -adminBalanceData?.["myProfitLoss"],
                exposure: -adminBalanceData?.["exposure"],
              });
            }
    
            const redisSessionExposureName = redisKeys.userSessionExposure + matchId;
            let sessionExposure = parseFloat(parentUserRedisData?.[redisSessionExposureName] || 0);
            if (parentUserRedisData?.[betId + "_profitLoss"]) {
              const redisData = JSON.parse(parentUserRedisData[betId + "_profitLoss"]);
              sessionExposure -= redisData.maxLoss || 0;
            }
    
            await deleteKeyFromUserRedis(parentUser.userId, betId + "_profitLoss");
    
            if (parentUserRedisData?.exposure) {
              await updateUserDataRedis(parentUser.userId, { [redisSessionExposureName]: sessionExposure });
            }
    
            sendMessageToUser(parentUser.userId, socketData.sessionResult, { ...parentUser, betId, matchId });
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
      }
    });
    
    await Promise.all(promises);
    
    let parentUser = await getUserBalanceDataByUserId(fgWallet.id);

    let parentUserRedisData = await getUserRedisData(fgWallet.id);

    let parentExposure = parseFloat(parentUser?.exposure || 0);
    if (parentUserRedisData?.exposure) {
      parentExposure = parseFloat(parentUserRedisData?.exposure);
    }

    let parentProfitLoss = parseFloat(parentUser?.profitLoss || 0);
    if (parentUserRedisData?.profitLoss) {
      parentProfitLoss = parseFloat(parentUserRedisData.profitLoss);
    }
    let parentMyProfitLoss = parseFloat(parentUser?.myProfitLoss || 0);
    if (parentUserRedisData?.myProfitLoss) {
      parentMyProfitLoss = parseFloat(parentUserRedisData.myProfitLoss);
    }
    parentUser.profitLoss = parseFloat(parseFloat(parentProfitLoss + fwProfitLoss).toFixed(2));
    parentUser.myProfitLoss = parseFloat(parseFloat(parseFloat(parentMyProfitLoss) - fwProfitLoss).toFixed(2));
    parentUser.exposure = parseFloat(parseFloat(parentExposure - exposure).toFixed(2));

    const allChildUsers = await getUsersWithoutCount({ createBy: fgWallet.id }, ["id"]);
    const commissionWallet = await bulkCommission.filter((item) => allChildUsers.find((items) => items.id == item.parentId) != undefined)?.reduce((prev, curr) => {
      return prev + parseFloat(parseFloat(curr.commissionAmount * curr.partnerShip / 100).toFixed(2))
    }, 0);
    parentUser.totalCommission += parseFloat(parseFloat(commissionWallet || 0).toFixed(2));

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
    await updateUserBalanceData(parentUser.userId, {
      balance: 0,
      profitLoss: fwProfitLoss,
      myProfitLoss: -fwProfitLoss,
      exposure: -exposure,
      totalCommission: parseFloat(parseFloat(commissionWallet).toFixed(2))
    });

    logger.info({
      message: "Declare result db update for parent ",
      data: {
        betId,
        parentUser,
      },
    });
    if (parentUserRedisData?.exposure) {
      await incrementValuesRedis(parentUser.userId, {
        profitLoss: fwProfitLoss,
        myProfitLoss: -fwProfitLoss,
        exposure: -exposure,
      });
    }
    const redisSessionExposureName = redisKeys.userSessionExposure + matchId;
    let parentRedisUpdateObj = {};
    let sessionExposure = 0;
    if (parentUserRedisData?.[redisSessionExposureName]) {
      sessionExposure = parseFloat(parentUserRedisData[redisSessionExposureName]) || 0;
    }
    if (parentUserRedisData?.[betId + "_profitLoss"]) {
      let redisData = JSON.parse(
        parentUserRedisData[betId + "_profitLoss"]
      );
      sessionExposure = sessionExposure - (redisData.maxLoss || 0);
      parentRedisUpdateObj[redisSessionExposureName] = sessionExposure;
    }
    await deleteKeyFromUserRedis(parentUser.userId, betId + "_profitLoss");

    if (
      parentUserRedisData?.exposure &&
      Object.keys(parentRedisUpdateObj).length > 0
    ) {
      updateUserDataRedis(parentUser.userId, parentRedisUpdateObj);
    }
    sendMessageToUser(parentUser.userId, socketData.sessionResult, {
      ...parentUser,
      betId,
      matchId
    });

    insertCommissions(bulkCommission);
    return { data: { profitLoss: resultProfitLoss, totalCommission: parseFloat(parseFloat(commissionWallet).toFixed(2)) } };

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

const updateSuperAdminData = async (response, type) => {
  for (let userId in response?.superAdminData) {
    if (response?.superAdminData?.[userId]?.role == userRoleConstant.user) {
      response.superAdminData[userId].exposure = -response?.superAdminData?.[userId].exposure;
    } else {
      response.superAdminData[userId].exposure = -response?.superAdminData?.[userId].exposure;
      response.superAdminData[userId].myProfitLoss = -response?.superAdminData?.[userId].myProfitLoss;
      response.superAdminData[userId].balance = 0;
    }
    updateUserBalanceData(userId, response?.superAdminData?.[userId]);
    logger.info({
      message: `Updating user balance created by fgadmin or wallet in declare ${type}: `,
      data: {
        superAdminData: response?.superAdminData?.[userId],
        userId: userId
      },
    });
  }
}