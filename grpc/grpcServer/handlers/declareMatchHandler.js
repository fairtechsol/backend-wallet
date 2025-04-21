const { userRoleConstant, redisKeys, socketData, oldBetFairDomain, matchComissionTypeConstant, marketBetType, matchBettingType, unDeclare } = require("../../../config/contants");
const { logger } = require("../../../config/logger");
const { addResultFailed } = require("../../../services/betService");
const { insertCommissions, getCombinedCommission, deleteCommission } = require("../../../services/commissionService");
const { getUserDomainWithFaId } = require("../../../services/domainDataService");
const { getUserRedisData, deleteKeyFromUserRedis, incrementValuesRedis } = require("../../../services/redis/commonFunctions");
const { getUserBalanceDataByUserId, updateUserBalanceData } = require("../../../services/userBalanceService");
const { getUser, getUserById, getUsersWithoutCount } = require("../../../services/userService");
const { sendMessageToUser, broadcastEvent } = require("../../../sockets/socketManager");
const grpc = require("@grpc/grpc-js");
const { __mf } = require("i18n");
const { declareMatchHandler, unDeclareMatchHandler, unDeclareFinalMatchHandler, declareFinalMatchHandler } = require("../../grpcClient/handlers/wallet/declareMatchHandler");
const _ = require("lodash");
const { notifyTelegram } = require("../../../utils/telegramMessage");

exports.declareTournamentMatchResult = async (call) => {
  try {
    const { result, matchBettingDetails, userId, matchId, match, isMatchOdd } = call.request;
    const domainData = await getUserDomainWithFaId();

    // for (let i = 0; i < domainData?.length; i++) {
    //   const item = domainData[i];
    //   let response;
    //   try {
    //     response = await apiCall(apiMethod.post, item?.domain + allApiRoutes.getVerifyBet, {
    //       betId: matchBettingDetails?.id
    //     });
    //     if (response?.data > 0) {
    //       throw {
    //         statusCode: 400,
    //         message: {
    //           msg: "bet.verifyBets",
    //         }
    //       }
    //     }
    //   }
    //   catch (err) {
    //     logger.error({
    //       error: `Verify bet for the domain ${item?.domain}.`,
    //       stack: err.stack,
    //       message: err.message,
    //     });
    //     throw err;

    //   }
    // }
    const fgWallet = await getUser({
      roleName: userRoleConstant?.fairGameWallet
    }, ["id", "matchComissionType", "matchCommission"]);

    let fwProfitLoss = 0;
    let exposure = 0;

    let bulkCommission = [];
    let totalCommissions = [];
    let resultProfitLoss = 0;
    const promises = domainData.map(async (item) => {
      try {
        const response = await declareMatchHandler({
          result, marketDetail: matchBettingDetails, userId, matchId, match, isMatchOdd: isMatchOdd
        }, item?.domain);
        resultProfitLoss += parseFloat(parseFloat((response?.fwProfitLoss || 0)).toFixed(2));
        return response;
      }
      catch (err) {
        logger.error({
          error: `Error at declare match result for the domain ${item?.domain}.`,
          stack: err.stack,
          message: err.message,
        });

        await addResultFailed({
          matchId: matchId,
          betId: matchBettingDetails?.id,
          userId: item?.userId?.id,
          result: result,
          createBy: userId
        });
        notifyTelegram(`Error at result declare tournament wallet side for domain ${item?.domain} on tournament ${matchBettingDetails?.id} for match ${matchId} ${JSON.stringify(err || "{}")}`);

        return {};
      }
    })
    const returnedVal = await Promise.all(promises);

    let response = returnedVal?.reduce((acc, curr) => {
      acc.fwProfitLoss = parseFloat((parseFloat(acc.fwProfitLoss || 0) + parseFloat(curr?.fwProfitLoss || 0)).toFixed(2));
      acc.superAdminData = { ...(acc.superAdminData || {}), ...(curr?.superAdminData || {}) };
      acc.bulkCommission = Object.keys({ ...acc?.bulkCommission, ...curr?.bulkCommission }).reduce((result, key) => ({
        ...result,
        [key]: [...(acc?.bulkCommission?.[key] || []), ...(curr?.bulkCommission?.[key] || [])]
      }), {});

      acc.faAdminCal = {
        fwWalletDeduction: parseFloat((parseFloat(acc?.faAdminCal?.fwWalletDeduction || 0) + parseFloat(curr?.faAdminCal?.fwWalletDeduction || 0)).toFixed(2)),
        commission: [...(acc?.faAdminCal?.commission || []), ...(curr?.faAdminCal?.commission || [])],
        userData: {
          userData: Object.keys({ ...acc?.faAdminCal?.userData, ...curr?.faAdminCal?.userData }).reduce((res, key) => {
            const currUser = curr?.faAdminCal?.userData?.[key] || {};
            const prevUser = acc?.faAdminCal?.userData?.[key] || {};
            const calc = (field) => +((+(prevUser[field] || 0) + +(currUser[field] || 0))).toFixed(2);
            res[key] = prevUser && Object.keys(prevUser).length
              ? {
                ...currUser,
                profitLoss: calc("profitLoss"),
                exposure: calc("exposure"),
                myProfitLoss: calc("myProfitLoss"),
                userOriginalProfitLoss: calc("userOriginalProfitLoss"),
              }
              : currUser;
            return res;
          }, {})
        }

      }
      return acc;
    }, {});

    for (let userId in response?.superAdminData) {
      if (response?.superAdminData?.[userId]?.role == userRoleConstant.user) {
        response.superAdminData[userId].exposure = -response?.superAdminData?.[userId].exposure;
      }
      else {
        response.superAdminData[userId].exposure = -response?.superAdminData?.[userId].exposure;
        // response.superAdminData[userId].profitLoss = -response?.superAdminData?.[userId].profitLoss;
        response.superAdminData[userId].myProfitLoss = -response?.superAdminData?.[userId].myProfitLoss;
        response.superAdminData[userId].balance = 0;
      }
      updateUserBalanceData(userId, response?.superAdminData?.[userId]);
      logger.info({
        message: "Updating user balance created by fgAdmin or wallet in declare: ",
        data: {
          superAdminData: response?.superAdminData?.[userId],
          userId: userId
        },
      });
    }
    bulkCommission.push(...(response?.faAdminCal?.commission || []));

    for (let parentUserId in response?.faAdminCal.userData) {

      let adminBalanceData = response?.faAdminCal.userData[parentUserId];

      fwProfitLoss += parseFloat(adminBalanceData?.profitLoss);

      if (adminBalanceData.role == userRoleConstant.fairGameAdmin) {
        totalCommissions = [...totalCommissions, ...response?.faAdminCal?.commission];
        let parentUser = await getUserBalanceDataByUserId(parentUserId);
        let userCommission = await getUserById(parentUserId, ["matchComissionType", "matchCommission", "fwPartnership"]);

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

        parentUser.profitLoss = parseFloat(parentProfitLoss) + parseFloat(adminBalanceData?.["profitLoss"]);
        parentUser.myProfitLoss = parseFloat(parentMyProfitLoss) - parseFloat((parseFloat(adminBalanceData?.["myProfitLoss"])).toFixed(2));
        parentUser.exposure = parentExposure - adminBalanceData?.["exposure"];

        let totalCommissionData = 0;

        Object.keys(response?.bulkCommission)?.forEach((item) => {
          if (userCommission.matchComissionType == matchComissionTypeConstant.entryWise) {
            response?.bulkCommission?.[item]?.filter((items) => items?.superParent == parentUserId)?.forEach((items) => {

              parentUser.totalCommission = parseFloat(parentUser.totalCommission) + Math.abs(parseFloat(parseFloat(parseFloat(parseFloat((parseFloat(items?.lossAmount) * parseFloat(userCommission?.matchCommission) / 100).toFixed(2)) * parseFloat((parseFloat(userCommission.fwPartnership) / 100).toFixed(2))).toFixed(2))));
              totalCommissionData += Math.abs(parseFloat(parseFloat(parseFloat(parseFloat((parseFloat(items?.lossAmount) * parseFloat(userCommission?.matchCommission) / 100).toFixed(2)) * parseFloat((parseFloat(userCommission.fwPartnership) / 100).toFixed(2))).toFixed(2))));

              bulkCommission.push({
                createBy: item,
                matchId: items.matchId,
                betId: items?.betId,
                betPlaceId: items?.betPlaceId,
                parentId: parentUserId,
                teamName: items?.sessionName,
                betPlaceDate: new Date(items?.betPlaceDate),
                odds: items?.odds,
                betType: items?.betType,
                stake: items?.stake,
                commissionAmount: Math.abs(parseFloat((parseFloat(items?.lossAmount) * parseFloat(userCommission?.matchCommission) / 100).toFixed(2))),
                partnerShip: userCommission.fwPartnership,
                matchName: match?.title,
                matchStartDate: new Date(match?.startAt),
                userName: items.userName,
                matchType: marketBetType.MATCHBETTING
              });
            });
          }
          else if (parseFloat(adminBalanceData?.["userOriginalProfitLoss"]) < 0) {

            parentUser.totalCommission = parseFloat(parentUser.totalCommission) + Math.abs(parseFloat(parseFloat(parseFloat((parseFloat(parseFloat(adminBalanceData?.["userOriginalProfitLoss"])) * parseFloat(userCommission?.matchCommission) / 100).toFixed(2)) * parseFloat((parseFloat(userCommission.fwPartnership) / 100).toFixed(2))).toFixed(2)));

            totalCommissionData += Math.abs(parseFloat(parseFloat(parseFloat((parseFloat(parseFloat(adminBalanceData?.["userOriginalProfitLoss"])) * parseFloat(userCommission?.matchCommission) / 100).toFixed(2)) * parseFloat((parseFloat(userCommission.fwPartnership) / 100).toFixed(2))).toFixed(2)));

            bulkCommission.push({
              createBy: item,
              matchId: matchId,
              betId: matchBettingDetails?.id,
              parentId: parentUserId,
              commissionAmount: Math.abs(parseFloat((parseFloat(parseFloat(adminBalanceData?.["userOriginalProfitLoss"])) * parseFloat(userCommission?.matchCommission) / 100).toFixed(2))),
              partnerShip: userCommission.fwPartnership,
              matchName: match?.title,
              matchStartDate: new Date(match?.startAt),
              userName: null,
              stake: adminBalanceData?.["userOriginalProfitLoss"],
              matchType: marketBetType.MATCHBETTING
            });
          }
        });
        if (parentUser.exposure < 0) {
          logger.info({
            message: "Exposure in negative for user: ",
            data: {
              betId: matchBettingDetails?.id,
              matchId,
              parentUser,
            },
          });
          adminBalanceData["exposure"] += parentUser.exposure;
          parentUser.exposure = 0;
        }

        await updateUserBalanceData(parentUser.userId, {
          profitLoss: parseFloat(adminBalanceData?.["profitLoss"]),
          myProfitLoss: -parseFloat((parseFloat(adminBalanceData?.["myProfitLoss"])).toFixed(2)),
          exposure: -adminBalanceData?.["exposure"],
          totalCommission: parseFloat(parseFloat(totalCommissionData).toFixed(2)),
          balance: 0
        });

        logger.info({
          message: "Declare other match result db update for parent.",
          data: {
            betId: matchBettingDetails?.id,
            parentUser,
          },
        });
        if (parentUserRedisData?.exposure) {
          await incrementValuesRedis(parentUser.userId, {
            profitLoss: parseFloat(adminBalanceData?.["profitLoss"]),
            myProfitLoss: -parseFloat((parseFloat(adminBalanceData?.["myProfitLoss"])).toFixed(2)),
            exposure: -adminBalanceData?.["exposure"],
          });
        }

        await deleteKeyFromUserRedis(parentUser.userId, `${matchBettingDetails?.id}${redisKeys.profitLoss}_${matchId}`);

        sendMessageToUser(parentUser.userId, socketData.matchResult, {
          ...parentUser,
          matchId,
          gameType: match?.matchType,
          betId: matchBettingDetails?.id,
          betType: matchBettingType.tournament,
        });
        exposure += parseFloat(adminBalanceData?.exposure);
      };
    }

    fwProfitLoss += parseFloat(response?.faAdminCal?.fwWalletDeduction || 0);
    exposure += parseFloat(response?.faAdminCal?.userData?.[fgWallet.id]?.exposure || 0);

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

    parentUser.profitLoss = parseFloat(parentProfitLoss) + fwProfitLoss;
    parentUser.myProfitLoss = parseFloat(parentMyProfitLoss) - fwProfitLoss;
    parentUser.exposure = parentExposure - exposure;

    const allChildUsers = await getUsersWithoutCount({ createBy: fgWallet.id }, ["id"]);
    const commissionWallet = await bulkCommission.filter((item) => allChildUsers.find((items) => items.id == item.parentId) != undefined)?.reduce((prev, curr) => {
      return prev + parseFloat(parseFloat(curr.commissionAmount * curr.partnerShip / 100).toFixed(2))
    }, 0);
    parentUser.totalCommission += parseFloat(parseFloat(commissionWallet).toFixed(2));

    if (parentUser.exposure < 0) {
      logger.info({
        message: "Exposure in negative for user: ",
        data: {
          betId: matchBettingDetails?.id,
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
      message: "Declare tournament result db update for parent ",
      data: {
        betId: matchBettingDetails,
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

    await deleteKeyFromUserRedis(parentUser.userId, `${matchBettingDetails?.id}${redisKeys.profitLoss}_${matchId}`);

    sendMessageToUser(parentUser.userId, socketData.matchResult, {
      ...parentUser,
      matchId,
      betId: matchBettingDetails?.id,
      gameType: match?.matchType,
      betType: matchBettingType.tournament,
    });

    insertCommissions(bulkCommission);

    return { data: { profitLoss: resultProfitLoss, totalCommission: parseFloat(parseFloat(commissionWallet).toFixed(2)) } }
  } catch (error) {
    logger.error({
      error: `Error at declare tournament match result for the expert.`,
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

exports.unDeclareTournamentMatchResult = async (call) => {
  try {
    const { userId, matchId, match, matchBetting, isMatchOdd } = call.request;
    const domainData = await getUserDomainWithFaId();

    const fgWallet = await getUser({
      roleName: userRoleConstant?.fairGameWallet
    }, ["id", "matchComissionType", "matchCommission"]);

    let fwProfitLoss = 0;
    let profitLossDataAdmin = {};
    let profitLossDataWallet = {};
    let exposure = 0;
    const commissionData = await getCombinedCommission(matchBetting?.id);

    let fwData = new Set();
    let resultProfitLoss = 0;

    const promises = domainData.map(async (item) => {
      return await unDeclareMatchHandler({
        userId,
        matchId,
        match,
        matchBetting,
        isMatchOdd: isMatchOdd
      }, item?.domain).then((data) => {
        resultProfitLoss += parseFloat(parseFloat((data?.fwProfitLoss || 0)).toFixed(2));
        return data;
      }).catch(async (err) => {
        logger.error({
          error: `Error at un Declare match result for the domain ${item?.domain}.`,
          stack: err.stack,
          message: err.message,
        });

        await addResultFailed({
          matchId: matchId,
          betId: matchBetting?.id,
          userId: item?.userId?.id,
          result: unDeclare,
          createBy: userId
        })
        notifyTelegram(`Error at result undeclare tournament wallet side for domain ${item?.domain} on tournament ${matchBetting?.id} for match ${matchId} ${JSON.stringify(err || "{}")}`);

        return {};
      });
    });

    const returnedVal = await Promise.all(promises);
    let response = returnedVal?.reduce((acc, curr) => {
      acc.fwProfitLoss = parseFloat((parseFloat(acc.fwProfitLoss || 0) + parseFloat(curr?.fwProfitLoss || 0)).toFixed(2));
      acc.superAdminData = { ...(acc.superAdminData || {}), ...(curr?.superAdminData || {}) };
      acc.faAdminCal = {
        fwWalletDeduction: parseFloat((parseFloat(acc?.faAdminCal?.fwWalletDeduction || 0) + parseFloat(curr?.faAdminCal?.fwWalletDeduction || 0)).toFixed(2)),
        admin: _.mergeWith({}, (acc?.faAdminCal?.admin || {}), (curr?.faAdminCal?.admin || {}), (a, b) => (typeof a === 'number' && typeof b === 'number' ? parseFloat(a) + parseFloat(b) : undefined)),
        wallet: _.mergeWith({}, (acc?.faAdminCal?.wallet || {}), (curr?.faAdminCal?.wallet || {}), (a, b) => (typeof a === 'number' && typeof b === 'number' ? parseFloat(a) + parseFloat(b) : undefined))
      }
      return acc;
    }, {})

    for (let userIds in response?.superAdminData) {
      if (response?.superAdminData?.[userIds]?.role == userRoleConstant.user) {
        response.superAdminData[userIds].profitLoss = -response?.superAdminData?.[userIds].profitLoss;
        response.superAdminData[userIds].myProfitLoss = -response?.superAdminData?.[userIds].myProfitLoss;
      } else {
        response.superAdminData[userIds].profitLoss = -response?.superAdminData?.[userIds].profitLoss;
        response.superAdminData[userIds].balance = 0;
      }

      response.superAdminData[userIds].totalCommission = -parseFloat((parseFloat(response.superAdminData[userIds].totalCommission || 0)).toFixed(2));

      updateUserBalanceData(userIds, response?.superAdminData?.[userIds]);

      logger.info({
        message: "Updating user balance created by fgadmin or wallet in undeclare: ",
        data: {
          superAdminData: response?.superAdminData?.[userIds],
          userId: userIds
        },
      });
    }

    for (let parentUserId in response?.faAdminCal.admin) {
      let adminBalanceData = response?.faAdminCal.admin[parentUserId];
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

        parentUser.profitLoss = parseFloat(parentProfitLoss) - parseFloat(adminBalanceData?.["profitLoss"]);
        parentUser.myProfitLoss = parseFloat(parentMyProfitLoss) + parseFloat((parseFloat(adminBalanceData?.["myProfitLoss"])).toFixed(2));
        parentUser.exposure = parentExposure + parseFloat(adminBalanceData?.["exposure"]);

        let totalCommissionData = 0;

        if (!fwData.has(parentUserId)) {
          fwData.add(parentUserId);
          let parentCommission = commissionData?.find((item) => item?.userId == parentUser.userId);
          if (parentCommission) {
            parentUser.totalCommission = parentUser.totalCommission - parseFloat(parentCommission?.amount || 0);
            totalCommissionData += parseFloat(parentCommission?.amount || 0);
          }
        }

        if (parentUser.exposure < 0) {
          logger.info({
            message: "Exposure in negative for user: ",
            data: {
              matchId,
              parentUser,
            },
          });
          adminBalanceData["exposure"] += parentUser.exposure;
          parentUser.exposure = 0;
        }

        await updateUserBalanceData(parentUser.userId, {
          profitLoss: -parseFloat(adminBalanceData?.["profitLoss"]),
          myProfitLoss: parseFloat((parseFloat(adminBalanceData?.["myProfitLoss"])).toFixed(2)),
          exposure: parseFloat(adminBalanceData?.["exposure"]),
          totalCommission: -parseFloat(parseFloat(totalCommissionData).toFixed(2)),
          balance: 0
        });
        logger.info({
          message: "Un declare result db update for parent ",
          data: {
            parentUser,
          },
        });

        let { exposure: tempExposure, profitLoss: tempProfitLoss, myProfitLoss: tempMyProfitLoss, role, ...adminPLData } = adminBalanceData;

        Object.keys(adminPLData)?.forEach((pLData) => {
          if (profitLossDataAdmin?.[parentUser.userId]) {
            if (profitLossDataAdmin?.[parentUser.userId]?.[pLData]) {
              Object.keys(adminPLData?.[pLData])?.forEach((items) => {
                if (profitLossDataAdmin?.[parentUser.userId]?.[pLData]?.[items]) {
                  profitLossDataAdmin[parentUser.userId][pLData][items] += adminPLData?.[pLData]?.[items];
                  profitLossDataAdmin[parentUser.userId][pLData][items] = parseFloat(parseFloat(profitLossDataAdmin[parentUser.userId][pLData][items]).toFixed(2));
                }
                else {
                  profitLossDataAdmin[parentUser.userId][pLData][items] = parseFloat(parseFloat(adminPLData?.[pLData]?.[items]).toFixed(2));
                }
              });
            }
            else {
              profitLossDataAdmin[parentUser.userId][pLData] = adminPLData?.[pLData];
            }
          }
          else {
            profitLossDataAdmin[parentUser.userId] = {};
            profitLossDataAdmin[parentUser.userId][pLData] = adminPLData?.[pLData];
          }
        });

        let settingRedisDataObj = { ...profitLossDataAdmin[parentUser.userId] };
        Object.keys(settingRedisDataObj)?.forEach((items) => {
          settingRedisDataObj[items] = JSON.stringify(settingRedisDataObj[items]);
        });

        if (parentUserRedisData?.exposure) {

          await incrementValuesRedis(parentUser.userId, {
            profitLoss: -parseFloat(adminBalanceData?.["profitLoss"]),
            myProfitLoss: parseFloat((parseFloat(adminBalanceData?.["myProfitLoss"])).toFixed(2)),
            exposure: parseFloat(adminBalanceData?.["exposure"])
          }, settingRedisDataObj || {});
        }

        sendMessageToUser(parentUser.userId, socketData.matchResultUnDeclare, {
          ...parentUser,
          matchId,
          betId: matchBetting?.id,
          profitLossData: profitLossDataAdmin[parentUser.userId],
          gameType: match?.matchType,
          betType: matchBettingType.tournament,
        });
        exposure += parseFloat(adminBalanceData?.["exposure"]);
      };

    }
    fwProfitLoss -= parseFloat(response?.faAdminCal?.fwWalletDeduction || 0);
    let { exposure: tempExposure, profitLoss: tempProfitLoss, myProfitLoss: tempMyProfitLoss, role, ...adminPLData } = response?.faAdminCal?.wallet;


    Object.keys(adminPLData)?.forEach((pLData) => {

      if (profitLossDataWallet?.[pLData]) {
        Object.keys(adminPLData?.[pLData])?.forEach((items) => {
          if (profitLossDataWallet?.[pLData]?.[items]) {
            profitLossDataWallet[pLData][items] += adminPLData?.[pLData]?.[items];
            profitLossDataWallet[pLData][items] = parseFloat(parseFloat(profitLossDataWallet[pLData][items]).toFixed(2));
          }
          else {
            profitLossDataWallet[pLData][items] = parseFloat(parseFloat(adminPLData?.[pLData]?.[items]).toFixed(2));
          }
        });
      }
      else {
        profitLossDataWallet[pLData] = adminPLData?.[pLData];
      }
    });
    exposure += parseFloat(response?.faAdminCal?.admin?.[fgWallet.id]?.exposure || 0);

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

    parentUser.profitLoss = parseFloat(parentProfitLoss) - parseFloat(fwProfitLoss);
    parentUser.myProfitLoss = parseFloat(parentMyProfitLoss) + parseFloat(fwProfitLoss);
    parentUser.exposure = parentExposure + parseFloat(exposure);

    const allChildUsers = await getUsersWithoutCount({ createBy: fgWallet.id }, ["id"]);
    const commissionWallet = await commissionData.filter((item) => allChildUsers.find((items) => items.id == item.userId) != undefined)?.reduce((prev, curr) => {
      return prev + parseFloat(parseFloat(curr.amount).toFixed(2))
    }, 0);
    parentUser.totalCommission -= parseFloat(parseFloat(commissionWallet).toFixed(2));

    if (parentUser.exposure < 0) {
      logger.info({
        message: "Exposure in negative for user: ",
        data: {
          matchId,
          parentUser,
        },
      });
      exposure += parentUser.exposure;
      parentUser.exposure = 0;
    }

    await updateUserBalanceData(parentUser.userId, {
      balance: 0,
      profitLoss: -parseFloat(fwProfitLoss),
      myProfitLoss: parseFloat(fwProfitLoss),
      exposure: exposure,
      totalCommission: -parseFloat(parseFloat(commissionWallet).toFixed(2))
    });

    logger.info({
      message: "Un declare result db update for parent ",
      data: {
        parentUser,
      },
    });

    if (
      parentUserRedisData?.exposure
    ) {

      let settingRedisDataObj = { ...profitLossDataWallet };
      Object.keys(settingRedisDataObj)?.forEach((items) => {
        settingRedisDataObj[items] = JSON.stringify(settingRedisDataObj[items]);
      });

      await incrementValuesRedis(parentUser.userId, {
        profitLoss: -parseFloat(fwProfitLoss),
        myProfitLoss: parseFloat(fwProfitLoss),
        exposure: exposure
      }, settingRedisDataObj);
    }
    sendMessageToUser(parentUser.userId, socketData.matchResultUnDeclare, {
      ...parentUser,
      matchId,
      profitLossData: profitLossDataWallet?.[`${matchBetting?.id}${redisKeys.profitLoss}_${matchId}`],
      betId: matchBetting?.id,
      gameType: match?.matchType,
      betType: matchBettingType.tournament,

    });
    deleteCommission(matchBetting?.id);

    return { data: { profitLoss: resultProfitLoss, profitLossWallet: JSON.stringify(profitLossDataWallet) } };

  } catch (error) {
    logger.error({
      error: `Error at un declare match result for the expert.`,
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


exports.declareFinalMatchResult = async (call) => {
  try {
    const { matchId, matchType } = call.request;
    const domainData = await getUserDomainWithFaId();

    // Run handlers concurrently using Promise.all
    await Promise.all(
      domainData?.map(async (item) => {
        try {
          await declareFinalMatchHandler({ matchId, matchType }, item?.domain);
        } catch (err) {
          logger.error({
            error: `Error at declare match result for the domain ${item?.domain}.`,
            stack: err.stack,
            message: err.message,
          });
          notifyTelegram(`Error at result declare final match wallet side for domain ${item?.domain} for match ${matchId} ${JSON.stringify(err || "{}")}`);

          // Error caught so that Promise.all continues
        }
      }) || []
    );

    broadcastEvent(socketData.matchResult, {
      matchId,
      gameType: matchType,
      isMatchDeclare: true,
    });

    return {};
  } catch (error) {
    logger.error({
      error: `Error at declare tournament match result for the expert.`,
      stack: error.stack,
      message: error.message,
    });
    throw {
      code: grpc.status.INTERNAL,
      message: error?.message || __mf("internalServerError"),
    };
  }
};

exports.unDeclareFinalMatchResult = async (call) => {
  try {
    const { matchId, matchType } = call.request;
    const domainData = await getUserDomainWithFaId();

    // Process un-declaration concurrently with Promise.all
    await Promise.all(
      domainData?.map(async (item) => {
        try {
          await unDeclareFinalMatchHandler({ matchId, matchType }, item?.domain);
        } catch (err) {
          logger.error({
            error: `Error at un Declare match result for the domain ${item?.domain}.`,
            stack: err.stack,
            message: err.message,
          });
          notifyTelegram(`Error at result undeclare final match wallet side for domain ${item?.domain} for match ${matchId} ${JSON.stringify(err || "{}")}`);

          // Error caught so that Promise.all continues
        }
      }) || []
    );

    broadcastEvent(socketData.matchResultUnDeclare, {
      matchId,
      gameType: matchType,
    });

    return {};
  } catch (error) {
    logger.error({
      error: `Error at un declare match result for the expert.`,
      stack: error.stack,
      message: error.message,
    });
    throw {
      code: grpc.status.INTERNAL,
      message: error?.message || __mf("internalServerError"),
    };
  }
};
