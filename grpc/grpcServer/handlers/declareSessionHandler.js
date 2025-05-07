const grpc = require("@grpc/grpc-js");
const { __mf } = require("i18n");
const { userRoleConstant, redisKeys, socketData, oldBetFairDomain, marketBetType, unDeclare, sessionBettingType } = require("../../../config/contants");
const { logger } = require("../../../config/logger");
const { addResultFailed } = require("../../../services/betService");
const { insertCommissions, getCombinedCommission, deleteCommission } = require("../../../services/commissionService");
const { getUserDomainWithFaId } = require("../../../services/domainDataService");
const { getUserRedisData, updateUserDataRedis, deleteKeyFromUserRedis, incrementValuesRedis } = require("../../../services/redis/commonFunctions");
const { getUserBalanceDataByUserId, updateUserBalanceData, updateUserExposure } = require("../../../services/userBalanceService");
const { getUser, getUserById, getUsersWithoutCount } = require("../../../services/userService");
const { sendMessageToUser } = require("../../../sockets/socketManager");
const { declareSessionHandler, declareSessionNoResultHandler, unDeclareSessionHandler } = require("../../grpcClient/handlers/wallet/declareSessionHandler");
const { mergeProfitLoss, updateSuperAdminData } = require("../../../services/commonService");
const { notifyTelegram } = require("../../../utils/telegramMessage");

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

        notifyTelegram(`Error at result declare session wallet side for domain ${item?.domain} on tournament ${betId} for match ${matchId} ${JSON.stringify(err || "{}")}`);

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

exports.declareSessionNoResult = async (call) => {
  try {
    const { betId, score, userId, matchId } = call.request;

    const domainData = await getUserDomainWithFaId();

    const fgWallet = await getUser(
      {
        roleName: userRoleConstant?.fairGameWallet,
      },
      ["id"]
    );

    let exposure = 0;

    const promises = domainData.map(async (item) => {
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

          updateUserBalanceData(userId, response?.superAdminData?.[userId]);
          logger.info({
            message: "Updating user balance created by fgadmin or wallet in declare session noresult: ",
            data: {
              superAdminData: response?.superAdminData?.[userId],
              userId: userId
            },
          });
        }

        for (let userId in response?.faAdminCal) {

          let adminBalanceData = response?.faAdminCal[userId];

          if (adminBalanceData.role == userRoleConstant.fairGameAdmin) {

            let parentUser = await getUserBalanceDataByUserId(userId);

            let parentUserRedisData = await getUserRedisData(parentUser?.userId);

            let parentExposure = parseFloat(parentUser?.exposure || 0);
            if (parentUserRedisData?.exposure) {
              parentExposure = parseFloat(parentUserRedisData?.exposure);
            }

            parentUser.exposure = parentExposure - adminBalanceData?.["exposure"];
            if (parentUser.exposure < 0) {
              logger.info({
                message: "Exposure in negative for user: ",
                data: {
                  betId,
                  matchId,
                  parentUser,
                },
              });
              adminBalanceData["exposure"] += parentUser.exposure;
              parentUser.exposure = 0;
            }

            await updateUserExposure(parentUser.userId, -adminBalanceData?.["exposure"]);

            logger.info({
              message: "Declare result db update for parent ",
              data: {
                betId,
                parentUser,
              },
            });

            const redisSessionExposureName = redisKeys.userSessionExposure + matchId;

            if (parentUserRedisData?.exposure) {
              await incrementValuesRedis(parentUser.userId, {
                [redisSessionExposureName]: -adminBalanceData["exposure"],
                exposure: -adminBalanceData?.["exposure"],
              });
              await deleteKeyFromUserRedis(parentUser.userId, betId + "_profitLoss");
            }
            sendMessageToUser(parentUser.userId, socketData.sessionResult, {
              ...parentUser,
              betId,
              matchId
            });

            exposure += adminBalanceData?.exposure;
          }
        };
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
    });

    await Promise.all(promises);

    let parentUser = await getUserBalanceDataByUserId(fgWallet.id);

    let parentUserRedisData = await getUserRedisData(parentUser?.userId);

    let parentExposure = parseFloat(parentUser?.exposure || 0);
    if (parentUserRedisData?.exposure) {
      parentExposure = parseFloat(parentUserRedisData?.exposure);
    }

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
    await updateUserExposure(parentUser.userId, -exposure);

    logger.info({
      message: "Declare result db update for parent ",
      data: {
        betId,
        parentUser,
      },
    });

    const redisSessionExposureName = redisKeys.userSessionExposure + matchId;


    if (parentUserRedisData?.exposure) {
      await incrementValuesRedis(parentUser.userId, { [redisSessionExposureName]: -exposure, exposure: -exposure });
      await deleteKeyFromUserRedis(parentUser.userId, betId + "_profitLoss");
    }
    sendMessageToUser(parentUser.userId, socketData.sessionResult, {
      ...parentUser,
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
      resultProfitLoss += parseFloat(parseFloat((response?.fwProfitLoss || 0)).toFixed(2))


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
          response.superAdminData[userIds].totalCommission = -parseFloat((parseFloat(userCommission?.amount || 0)).toFixed(2));
        }
        updateUserBalanceData(userIds, response?.superAdminData?.[userIds]);

        logger.info({
          message: "Updating user balance created by fgadmin or wallet in unDeclare session: ",
          data: {
            superAdminData: response?.superAdminData?.[userIds],
            userId: userIds
          },
        });
      }


      for (let parentUserId in response?.faAdminCal.userData) {
        let adminBalanceData = response?.faAdminCal.userData[parentUserId];
        fwProfitLoss += parseFloat(adminBalanceData?.["profitLoss"]);

        if (adminBalanceData.role == userRoleConstant.fairGameAdmin) {
          let parentUser = await getUserBalanceDataByUserId(parentUserId);

          let parentUserRedisData = await getUserRedisData(parentUser?.userId);

          let parentProfitLoss = parseFloat(parentUser?.profitLoss || 0);
          if (parentUserRedisData?.profitLoss) {
            parentProfitLoss = parseFloat(parentUserRedisData.profitLoss);
          }
          let parentMyProfitLoss = parseFloat(parentUser?.myProfitLoss || 0);
          if (parentUserRedisData?.myProfitLoss) {
            parentMyProfitLoss = parseFloat(parentUserRedisData.myProfitLoss);
          }
          let parentExposure = parseFloat(parentUser?.exposure || 0);
          if (parentUserRedisData?.exposure) {
            parentExposure = parseFloat(parentUserRedisData?.exposure);
          }

          parentUser.profitLoss = parseFloat(parseFloat(parentProfitLoss - adminBalanceData?.["profitLoss"]).toFixed(2));
          parentUser.myProfitLoss = parseFloat(parseFloat(parseFloat(parentMyProfitLoss) + parseFloat((parseFloat(adminBalanceData?.["myProfitLoss"])).toFixed(2))).toFixed(2));
          parentUser.exposure = parseFloat(parseFloat(parentExposure + adminBalanceData?.["exposure"]).toFixed(2));
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
            adminBalanceData["exposure"] += parentUser.exposure
            parentUser.exposure = 0;
          }

          await updateUserBalanceData(parentUser.userId, {
            profitLoss: -adminBalanceData?.["profitLoss"],
            myProfitLoss: adminBalanceData["myProfitLoss"],
            exposure: adminBalanceData["exposure"],
            totalCommission: -parentCommissionData,
            balance: 0
          });

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
            parentUserRedisData?.exposure
          ) {
            const redisSessionExposureName = redisKeys.userSessionExposure + matchId;
            await incrementValuesRedis(parentUser.userId, {
              profitLoss: -adminBalanceData?.["profitLoss"],
              myProfitLoss: adminBalanceData["myProfitLoss"],
              exposure: adminBalanceData["exposure"],
              [redisSessionExposureName]: adminBalanceData["exposure"]
            }, parentRedisUpdateObj);
          }
          sendMessageToUser(parentUser.userId, socketData.sessionResultUnDeclare, {
            ...parentUser,
            betId,
            matchId,
            parentRedisUpdateObj
          });

        };
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

    let parentUser = await getUserBalanceDataByUserId(fgWallet.id);

    let parentUserRedisData = await getUserRedisData(parentUser?.userId);

    let parentProfitLoss = parseFloat(parentUser?.profitLoss || 0);
    if (parentUserRedisData?.profitLoss) {
      parentProfitLoss = parseFloat(parentUserRedisData.profitLoss);
    }
    let parentMyProfitLoss = parseFloat(parentUser?.myProfitLoss || 0);
    if (parentUserRedisData?.myProfitLoss) {
      parentMyProfitLoss = parseFloat(parentUserRedisData.myProfitLoss);
    }
    let parentExposure = parseFloat(parentUser?.exposure || 0);
    if (parentUserRedisData?.exposure) {
      parentExposure = parseFloat(parentUserRedisData?.exposure);
    }

    parentUser.profitLoss = parseFloat(parseFloat(parentProfitLoss - parseFloat(fwProfitLoss)).toFixed(2));
    parentUser.myProfitLoss = parseFloat(parseFloat(parseFloat(parentMyProfitLoss) + parseFloat((parseFloat(fwProfitLoss)).toFixed(2))).toFixed(2));
    parentUser.exposure = parseFloat(parseFloat(parentExposure + exposure).toFixed(2));

    const allChildUsers = await getUsersWithoutCount({ createBy: fgWallet.id }, ["id"]);
    const commissionWallet = await commissionData.filter((item) => allChildUsers.find((items) => items.id == item.userId) != undefined)?.reduce((prev, curr) => {
      return prev + parseFloat(parseFloat(curr.amount).toFixed(2))
    }, 0);
    parentUser.totalCommission -= parseFloat(parseFloat(commissionWallet).toFixed(2));

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
      profitLoss: -fwProfitLoss,
      myProfitLoss: parseFloat((parseFloat(fwProfitLoss)).toFixed(2)),
      exposure: exposure,
      totalCommission: -(parseFloat(parseFloat(commissionWallet).toFixed(2)) || 0)
    });

    logger.info({
      message: "Un declare result db update for parent ",
      data: {
        betId,
        parentUser,
      },
    });

    const redisSessionExposureName = redisKeys.userSessionExposure + matchId;

    let parentRedisUpdateObj = {
      ...(profitLossDataWallet ? {
        [betId + redisKeys.profitLoss]: JSON.stringify(
          profitLossDataWallet
        )
      } : {}),
    };
    if (
      parentUserRedisData?.exposure
    ) {

      await incrementValuesRedis(parentUser.userId, {
        profitLoss: -fwProfitLoss,
        myProfitLoss: parseFloat((parseFloat(fwProfitLoss)).toFixed(2)),
        exposure: exposure,
        [redisSessionExposureName]: exposure
      }, parentRedisUpdateObj);
    }
    sendMessageToUser(parentUser.userId, socketData.sessionResultUnDeclare, {
      ...parentUser,
      betId,
      matchId,
      parentRedisUpdateObj
    });

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
