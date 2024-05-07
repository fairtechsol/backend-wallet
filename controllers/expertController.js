const { expertDomain, userRoleConstant, redisKeys, socketData, unDeclare, oldBetFairDomain, matchComissionTypeConstant, matchBettingType, redisKeysMarketWise, redisKeysMatchWise, otherEventMatchBettingRedisKey, marketBetType } = require("../config/contants");
const { logger } = require("../config/logger");
const { addResultFailed } = require("../services/betService");
const { insertCommissions, getCombinedCommission, deleteCommission, getCombinedCommissionOfWallet } = require("../services/commissionService");
const { mergeProfitLoss, settingBetsDataAtLogin, settingOtherMatchBetsDataAtLogin } = require("../services/commonService");
const { getUserDomainWithFaId } = require("../services/domainDataService");
const { getUserRedisData, updateUserDataRedis, deleteKeyFromUserRedis, incrementValuesRedis } = require("../services/redis/commonFunctions");
const { getUserBalance, addInitialUserBalance, getUserBalanceDataByUserId, updateUserBalanceByUserId, updateUserBalanceData, updateUserExposure } = require("../services/userBalanceService");
const { getUsersWithUserBalance, getUser, getUserById, getUsersWithoutCount } = require("../services/userService");
const { sendMessageToUser } = require("../sockets/socketManager");
const { apiCall, apiMethod, allApiRoutes } = require("../utils/apiService");
const { SuccessResponse, ErrorResponse } = require("../utils/response");
exports.createUser = async (req, res) => {
  try {
    // Destructuring request body for relevant user information
    let { userName, remark, fullName, password, phoneNumber, city, allPrivilege, addMatchPrivilege, betFairMatchPrivilege, bookmakerMatchPrivilege, sessionMatchPrivilege, confirmPassword } = req.body;
    let reqUser = req.user;

    let userData = {
      userName,
      fullName,
      password,
      phoneNumber,
      city,
      createBy: reqUser.id,
      allPrivilege,
      addMatchPrivilege,
      betFairMatchPrivilege,
      bookmakerMatchPrivilege,
      sessionMatchPrivilege,
      confirmPassword,
      remark
    };
    let domain = expertDomain;
    let apiResponse = {}
    try {
      apiResponse = await apiCall(apiMethod.post, domain + allApiRoutes.EXPERTS.add, userData)
    } catch (error) {
      throw error?.response?.data
    }
    // Send success response with the created user data
    return SuccessResponse({ statusCode: 200, message: { msg: "created", keys: { name: "User" } }, data: apiResponse.data }, req, res
    );
  } catch (err) {
    // Handle any errors and return an error response
    return ErrorResponse(err, req, res);
  }
};

exports.updateUser = async (req, res) => {
  try {
    // Destructuring request body for relevant user information
    let { id, fullName, remark, phoneNumber, city, allPrivilege, addMatchPrivilege, betFairMatchPrivilege, bookmakerMatchPrivilege, sessionMatchPrivilege } = req.body;
    let reqUser = req.user;

    let userData = {
      id,
      fullName,
      phoneNumber,
      city,
      createBy: reqUser.id,
      allPrivilege,
      addMatchPrivilege,
      betFairMatchPrivilege,
      bookmakerMatchPrivilege,
      sessionMatchPrivilege,
      remark
    };
    let domain = expertDomain;
    let apiResponse = {}
    try {
      apiResponse = await apiCall(apiMethod.post, domain + allApiRoutes.EXPERTS.update, userData)
    } catch (error) {
      throw error?.response?.data
    }
    // Send success response with the created user data
    return SuccessResponse({ statusCode: 200, message: { msg: "updated", keys: { name: "User" } }, data: apiResponse.data }, req, res
    );
  } catch (err) {
    // Handle any errors and return an error response
    return ErrorResponse(err, req, res);
  }
};
exports.changePassword = async (req, res) => {
  try {
    // Destructuring request body for relevant user information
    let { password, confirmPassword, id } = req.body;
    let reqUser = req.user;
    let userData = {
      password, confirmPassword, id,
      createBy: reqUser.id
    };
    let domain = expertDomain;
    let apiResponse = {}
    try {
      apiResponse = await apiCall(apiMethod.post, domain + allApiRoutes.EXPERTS.changePassword, userData)
    } catch (error) {
      throw error?.response?.data
    }
    // Send success response with the created user data
    return SuccessResponse({ statusCode: 200, message: { msg: "updated", keys: { name: "Password" } }, data: apiResponse.data }, req, res
    );
  } catch (err) {
    // Handle any errors and return an error response
    return ErrorResponse(err, req, res);
  }
};

exports.expertList = async (req, res, next) => {
  try {
    let { id: loginId } = req.user;
    let { offset, limit, searchBy, keyword } = req.query;

    let domain = expertDomain;
    let apiResponse = {};

    const queryParams = {
      offset,
      limit,
      loginId,
      searchBy,
      keyword
    };

    // Construct the URL with query parameters
    const url = new URL(
      domain + allApiRoutes.EXPERTS.expertList
    );
    Object.entries(queryParams).forEach(([key, value]) => {
      if (value) {
        url.searchParams.append(key, value);
      }
    });

    try {
      apiResponse = await apiCall(
        apiMethod.get,
        url
      );
    } catch (error) {
      throw error?.response?.data;
    }

    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "fetched", keys: { name: "Expert list" } },
        data: apiResponse?.data,
      },
      req,
      res
    );
  } catch (error) {
    return ErrorResponse(error, req, res);
  }
};

exports.getNotification = async (req, res) => {
  try {
    let response = await apiCall(
      apiMethod.get,
      expertDomain + allApiRoutes.EXPERTS.notification
    );
    return SuccessResponse(
      {
        statusCode: 200,
        data: response.data
      },
      req,
      res
    );
  } catch (err) {
    return ErrorResponse(err?.response?.data, req, res);
  }
};

exports.getMatchCompetitionsByType = async (req, res) => {
  try {
    const { type } = req.params;

    let response = await apiCall(
      apiMethod.get,
      expertDomain + allApiRoutes.EXPERTS.getCompetitionList + `/${type}`
    );

    return SuccessResponse(
      {
        statusCode: 200,
        data: response.data,
      },
      req,
      res
    );
  } catch (err) {
    logger.error({
      error: `Error at list competition for the user.`,
      stack: err.stack,
      message: err.message,
    });
    // Handle any errors and return an error response
    return ErrorResponse(err?.response?.data, req, res);
  }
};


exports.getMatchDatesByCompetitionId = async (req, res) => {
  try {
    const { competitionId } = req.params;

    let response = await apiCall(
      apiMethod.get,
      expertDomain + allApiRoutes.EXPERTS.getDatesByCompetition + `/${competitionId}`
    );

    return SuccessResponse(
      {
        statusCode: 200,
        data: response?.data,
      },
      req,
      res
    );
  } catch (err) {
    logger.error({
      error: `Error at list date for the user.`,
      stack: err.stack,
      message: err.message,
    });
    // Handle any errors and return an error response
    return ErrorResponse(err?.response?.data, req, res);
  }
};

exports.getMatchDatesByCompetitionIdAndDate = async (req, res) => {
  try {
    const { competitionId, date } = req.params;


    let response = await apiCall(
      apiMethod.get,
      expertDomain + allApiRoutes.EXPERTS.getMatchByCompetitionAndDate + `/${competitionId}/${new Date(date)}`
    );

    return SuccessResponse(
      {
        statusCode: 200,
        data: response?.data,
      },
      req,
      res
    );
  } catch (err) {
    logger.error({
      error: `Error at list match for the user.`,
      stack: err.stack,
      message: err.message,
    });
    // Handle any errors and return an error response
    return ErrorResponse(err?.response?.data, req, res);
  }
};

exports.declareSessionResult = async (req, res) => {
  try {

    const { betId, score, sessionDetails, userId: userIds, matchId, match } = req.body;

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

    for (let i = 0; i < domainData?.length; i++) {
      const item = domainData[i];
      let response;
      try {
        response = await apiCall(apiMethod.post, item?.domain + allApiRoutes.declareResultSession, {
          betId,
          score,
          sessionDetails,
          userId: userIds,
          matchId,
          match
        });
        response = response?.data;
        resultProfitLoss += parseFloat(parseFloat((response?.fwProfitLoss || 0)).toFixed(2))
      }
      catch (err) {
        logger.error({
          error: `Error at declare session result for the domain ${item?.domain}.`,
          stack: err.stack,
          message: err.message,
        });

        await addResultFailed({
          matchId: matchId,
          betId: betId,
          userId: item?.userId?.id,
          result: score,
          createBy: userIds
        });
        continue;
      }

      await updateSuperAdminData(response, type);
      await updateBulkCommission(response, bulkCommission);


      for (let userId in response?.faAdminCal.userData) {
        let adminBalanceData = response?.faAdminCal.userData[userId];
        fwProfitLoss += parseFloat(adminBalanceData?.["profitLoss"]);

        if (adminBalanceData.role == userRoleConstant.fairGameAdmin) {
          totalCommissions = [...totalCommissions, ...response?.faAdminCal?.commission];
          let parentUser = await getUserBalanceDataByUserId(userId);
          let userCommission = await getUserById(userId, ["sessionCommission", "fwPartnership"]);

          let parentUserRedisData = await getUserRedisData(userId);

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

          let tempCommission = 0;

          parentUser.profitLoss = parseFloat(parseFloat(parentProfitLoss + adminBalanceData?.["profitLoss"]).toFixed(2));
          parentUser.myProfitLoss = parseFloat((parseFloat(parentMyProfitLoss) - parseFloat(adminBalanceData?.["myProfitLoss"])).toFixed(2));
          parentUser.exposure = parseFloat(parseFloat(parentExposure - adminBalanceData?.["exposure"]).toFixed(2));
          if (userCommission?.sessionCommission && item.domain == oldBetFairDomain) {
            tempCommission += Number((adminBalanceData?.["totalCommission"] * parseFloat(parseFloat(userCommission?.sessionCommission).toFixed(2)) / 100).toFixed(2));
            parentUser.totalCommission = parseFloat(parentUser.totalCommission) + Number((adminBalanceData?.["totalCommission"] * parseFloat(parseFloat(userCommission?.sessionCommission).toFixed(2)) / 100).toFixed(2));

            Object.keys(response?.bulkCommission)?.forEach((item) => {
              response?.bulkCommission?.[item]?.filter((items) => items?.superParent == userId)?.forEach((items) => {
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
                  userName: items.userName

                });
              });
            });
          };
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

          await updateUserBalanceData(parentUser.userId, {
            balance: 0,
            profitLoss: adminBalanceData?.["profitLoss"],
            myProfitLoss: -adminBalanceData?.["myProfitLoss"],
            exposure: -adminBalanceData?.["exposure"],
            totalCommission: tempCommission
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
              profitLoss: adminBalanceData?.["profitLoss"],
              myProfitLoss: -adminBalanceData?.["myProfitLoss"],
              exposure: -adminBalanceData?.["exposure"],
            });
          }
          const redisSessionExposureName =
            redisKeys.userSessionExposure + matchId;
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
        }
        exposure += parseFloat(adminBalanceData?.exposure);

      };
      exposure += parseFloat(response?.faAdminCal?.userData?.[fgWallet.id]?.exposure || 0);
    }

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
    // if (fgWallet?.sessionCommission) {
    const allChildUsers = await getUsersWithoutCount({ createBy: fgWallet.id }, ["id"]);
    const commissionWallet = await bulkCommission.filter((item) => allChildUsers.find((items) => items.id == item.parentId) != undefined)?.reduce((prev, curr) => {
      return prev + parseFloat(parseFloat(curr.commissionAmount * curr.partnerShip / 100).toFixed(2))
    }, 0);
    parentUser.totalCommission += parseFloat(parseFloat(commissionWallet).toFixed(2));
    // Object.keys(response?.bulkCommission)?.forEach((item) => {
    //   response?.bulkCommission?.[item]?.forEach((items) => {
    //     bulkCommission.push({
    //       createBy: item,
    //       matchId: items.matchId,
    //       betId: items?.betId,
    //       betPlaceId: items?.betPlaceId,
    //       parentId: fgWallet.id,
    //       teamName: items?.sessionName,
    //       betPlaceDate: new Date(items?.betPlaceDate),
    //       odds: items?.odds,
    //       betType: items?.betType,
    //       stake: items?.stake,
    //       commissionAmount: parseFloat((parseFloat(items?.amount) * parseFloat(fgWallet?.sessionCommission) / 100).toFixed(2)),
    //       upLinePartnership: 100,
    //       matchName: match?.title,
    //       matchStartDate: new Date(match?.startAt),
    //       userName: items.userName

    //     });
    //   });
    // });
    // };
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

    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "bet.resultDeclared" },
        data: { profitLoss: resultProfitLoss, totalCommission: parseFloat(parseFloat(commissionWallet).toFixed(2)) }
      },
      req,
      res
    );

  } catch (error) {
    logger.error({
      error: `Error at declare session result for the expert.`,
      stack: error.stack,
      message: error.message,
    });
    // Handle any errors and return an error response
    return ErrorResponse(error, req, res);
  }
}

exports.declareSessionNoResult = async (req, res) => {
  try {
    const { betId, score, userId, matchId } = req.body;

    const domainData = await getUserDomainWithFaId();

    const fgWallet = await getUser(
      {
        roleName: userRoleConstant?.fairGameWallet,
      },
      ["id"]
    );

    let exposure = 0;

    for (let i = 0; i < domainData?.length; i++) {
      const item = domainData[i];

      let response;

      try {
        response = await apiCall(
          apiMethod.post,
          item?.domain + allApiRoutes.declareNoResultSession,
          {
            betId,
            score,
            matchId,
          }
        );
        response = response?.data;
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
        continue;
      }


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


          const redisSessionExposureName =
            redisKeys.userSessionExposure + matchId;


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

    }

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


    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "bet.resultDeclared" },
      },
      req,
      res
    );
  } catch (error) {
    logger.error({
      error: `Error at declare session no result for the expert.`,
      stack: error.stack,
      message: error.message,
    });
    // Handle any errors and return an error response
    return ErrorResponse(error, req, res);
  }
};

exports.unDeclareSessionResult = async (req, res) => {
  try {

    const { betId, sessionDetails, userId, matchId } = req.body;

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
      let response = await apiCall(apiMethod.post, item?.domain + allApiRoutes.unDeclareResultSession, {
        betId,
        sessionDetails,
        userId,
        matchId,
      }).then((data) => data).catch(async (err) => {
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
        return;
      });
      response = response?.data;
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
                  profitLossDataAdmin[parentUser.userId]?.betPlaced
                );

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
              profitLossDataWallet?.betPlaced
            );

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


    // let parentCommission = commissionData?.find((cData) => cData?.userId == fgWallet.id);
    // if (parentCommission) {
    //   parentUser.totalCommission = parentUser.totalCommission - parseFloat(parentCommission?.amount || 0);
    // }

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

    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "bet.resultUnDeclared" },
        data: { profitLoss: resultProfitLoss, profitLossObj: profitLossDataWallet }
      },
      req,
      res
    );

  } catch (error) {
    logger.error({
      error: `Error at un declare session result for the expert.`,
      stack: error.stack,
      message: error.message,
    });
    // Handle any errors and return an error response
    return ErrorResponse(error, req, res);
  }
};

exports.declareMatchResult = async (req, res) => {
  try {

    const { result, matchDetails, userId, matchId, matchOddId, match } = req.body;

    const domainData = await getUserDomainWithFaId();

    const fgWallet = await getUser({
      roleName: userRoleConstant?.fairGameWallet
    }, ["id", "matchComissionType", "matchCommission"]);

    let fwProfitLoss = 0;
    let exposure = 0;

    let bulkCommission = [];
    let totalCommissions = [];
    let type = marketBetType.MATCHBETTING;
    let totalCommissionProfitLoss = 0;
    let resultProfitLoss = 0;
    for (let i = 0; i < domainData?.length; i++) {
      const item = domainData[i];
      let response;
      try {
        response = await apiCall(apiMethod.post, item?.domain + allApiRoutes.declareResultMatch, {
          result, matchDetails, userId, matchId, match
        });
        response = response?.data;
        resultProfitLoss += parseFloat(parseFloat((response?.fwProfitLoss || 0)).toFixed(2))
      }
      catch (err) {
        logger.error({
          error: `Error at declare match result for the domain ${item?.domain}.`,
          stack: err.stack,
          message: err.message,
        });

        await addResultFailed({
          matchId: matchId,
          betId: matchOddId,
          userId: item?.userId?.id,
          result: result,
          createBy: userId
        })
        continue;
      }

      await updateSuperAdminData(response, type)

      bulkCommission.push(...response?.faAdminCal?.commission);

      for (let parentUserId in response?.faAdminCal.userData) {

        let adminBalanceData = response?.faAdminCal.userData[parentUserId];

        fwProfitLoss += parseFloat(adminBalanceData?.profitLoss);
        if (item.domain == oldBetFairDomain) {
          totalCommissionProfitLoss += parseFloat(adminBalanceData?.userOriginalProfitLoss);
        }

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

          if (userCommission?.matchCommission && item.domain == oldBetFairDomain) {

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
                    userName: items.userName

                  });
                });
              }
              else if (parseFloat(adminBalanceData?.["userOriginalProfitLoss"]) < 0) {

                parentUser.totalCommission = parseFloat(parentUser.totalCommission) + Math.abs(parseFloat(parseFloat(parseFloat((parseFloat(parseFloat(adminBalanceData?.["userOriginalProfitLoss"])) * parseFloat(userCommission?.matchCommission) / 100).toFixed(2)) * parseFloat((parseFloat(userCommission.fwPartnership) / 100).toFixed(2))).toFixed(2)));

                totalCommissionData += Math.abs(parseFloat(parseFloat(parseFloat((parseFloat(parseFloat(adminBalanceData?.["userOriginalProfitLoss"])) * parseFloat(userCommission?.matchCommission) / 100).toFixed(2)) * parseFloat((parseFloat(userCommission.fwPartnership) / 100).toFixed(2))).toFixed(2)));

                bulkCommission.push({
                  createBy: item,
                  matchId: matchId,
                  betId: matchDetails?.find((items) => items.type == matchBettingType.quickbookmaker1)?.id,
                  parentId: parentUserId,
                  commissionAmount: Math.abs(parseFloat((parseFloat(parseFloat(adminBalanceData?.["userOriginalProfitLoss"])) * parseFloat(userCommission?.matchCommission) / 100).toFixed(2))),
                  partnerShip: userCommission.fwPartnership,
                  matchName: match?.title,
                  matchStartDate: new Date(match?.startAt),
                  userName: null,
                  stake: adminBalanceData?.["userOriginalProfitLoss"]

                });
              }
            });
          };

          if (parentUser.exposure < 0) {
            logger.info({
              message: "Exposure in negative for user: ",
              data: {
                matchOddId,
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
            totalCommission: totalCommissionData,
            balance: 0
          });

          logger.info({
            message: "Declare result db update for parent ",
            data: {
              matchOddId,
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

          await deleteKeyFromUserRedis(parentUser.userId, redisKeys.userTeamARate + matchId, redisKeys.userTeamBRate + matchId, redisKeys.userTeamCRate + matchId, redisKeys.yesRateTie + matchId, redisKeys.noRateTie + matchId, redisKeys.yesRateComplete + matchId, redisKeys.noRateComplete + matchId);

          sendMessageToUser(parentUser.userId, socketData.matchResult, {
            ...parentUser,
            matchId,
            gameType: match?.matchType
          });
          exposure += parseFloat(adminBalanceData?.exposure);

        };

      }

      fwProfitLoss += parseFloat(response?.faAdminCal?.fwWalletDeduction || 0);
      exposure += parseFloat(response?.faAdminCal?.userData?.[fgWallet.id]?.exposure || 0);
    }

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
          matchOddId,
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
        matchOddId,
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

    await deleteKeyFromUserRedis(parentUser.userId, redisKeys.userTeamARate + matchId, redisKeys.userTeamBRate + matchId, redisKeys.userTeamCRate + matchId, redisKeys.yesRateTie + matchId, redisKeys.noRateTie + matchId, redisKeys.yesRateComplete + matchId, redisKeys.noRateComplete + matchId);

    sendMessageToUser(parentUser.userId, socketData.matchResult, {
      ...parentUser,
      matchId,
      gameType: match?.matchType
    });

    insertCommissions(bulkCommission);

    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "bet.resultDeclared" },
        data: { profitLoss: resultProfitLoss, totalCommission: parseFloat(parseFloat(commissionWallet).toFixed(2)) }
      },
      req,
      res
    );



  } catch (error) {
    logger.error({
      error: `Error at declare session result for the expert.`,
      stack: error.stack,
      message: error.message,
    });
    // Handle any errors and return an error response
    return ErrorResponse(error, req, res);
  }
}

exports.unDeclareMatchResult = async (req, res) => {
  try {
    const { matchOddId, userId, matchId, match, matchBetting } = req.body;
    const domainData = await getUserDomainWithFaId();

    const fgWallet = await getUser({
      roleName: userRoleConstant?.fairGameWallet
    }, ["id", "matchComissionType", "matchCommission"]);

    let fwProfitLoss = 0;
    let profitLossDataAdmin = {};
    let profitLossDataWallet = {};
    let exposure = 0;

    const commissionData = await getCombinedCommission(matchOddId);
    let fwData = new Set();
    let resultProfitLoss = 0;
    for (let i = 0; i < domainData?.length; i++) {
      let item = domainData[i];
      let response = await apiCall(apiMethod.post, item?.domain + allApiRoutes.unDeclareResultMatch, {
        matchOddId,
        userId,
        matchId,
        match,
        matchBetting
      }).then((data) => data).catch(async (err) => {
        logger.error({
          error: `Error at un Declare match result for the domain ${item?.domain}.`,
          stack: err.stack,
          message: err.message,
        });

        await addResultFailed({
          matchId: matchId,
          betId: matchOddId,
          userId: item?.userId?.id,
          result: unDeclare,
          createBy: userId
        })
        return;
      });
      response = response?.data;
      resultProfitLoss += parseFloat(parseFloat((response?.fwProfitLoss || 0)).toFixed(2))

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
            totalCommission: -totalCommissionData,
            balance: 0
          });
          logger.info({
            message: "Un declare result db update for parent ",
            data: {
              parentUser,
            },
          });

          let { exposure: tempExposure, profitLoss: tempProfitLoss, myProfitLoss: tempMyProfitLoss,role, ...adminPLData } = adminBalanceData;

          Object.keys(adminPLData)?.forEach((pLData) => {
            if (profitLossDataAdmin?.[parentUser.userId]) {
              if (profitLossDataAdmin?.[parentUser.userId]?.[pLData]) {
                profitLossDataAdmin[parentUser.userId][pLData] += adminPLData?.[pLData];
                profitLossDataAdmin[parentUser.userId][pLData] = parseFloat(parseFloat(profitLossDataAdmin[parentUser.userId][pLData]).toFixed(2));
              }
              else {
                profitLossDataAdmin[parentUser.userId][pLData] = parseFloat(parseFloat(adminPLData?.[pLData]).toFixed(2));
              }
            }
            else {
              profitLossDataAdmin[parentUser.userId] = {};
              profitLossDataAdmin[parentUser.userId][pLData] = parseFloat(parseFloat(adminPLData?.[pLData]).toFixed(2));
            }
          });

          if (parentUserRedisData?.exposure) {

            await incrementValuesRedis(parentUser.userId, {
              profitLoss: -parseFloat(adminBalanceData?.["profitLoss"]),
              myProfitLoss: parseFloat((parseFloat(adminBalanceData?.["myProfitLoss"])).toFixed(2)),
              exposure: parseFloat(adminBalanceData?.["exposure"])
            }, profitLossDataAdmin[parentUser.userId] || {});
          }

          sendMessageToUser(parentUser.userId, socketData.matchResultUnDeclare, {
            ...parentUser,
            matchId,
            profitLossDataAdmin: profitLossDataAdmin[parentUser.userId],
            gameType: match?.matchType
          });
          exposure += parseFloat(adminBalanceData?.["exposure"]);
        };

      }
      fwProfitLoss -= parseFloat(response?.faAdminCal?.fwWalletDeduction || 0);
      let { exposure: tempExposure, profitLoss: tempProfitLoss, myProfitLoss: tempMyProfitLoss, role, ...adminPLData } = response?.faAdminCal?.wallet;

      Object.keys(adminPLData)?.forEach((pLData) => {
        if (profitLossDataWallet[pLData]) {
          profitLossDataWallet[pLData] += adminPLData?.[pLData];
          profitLossDataWallet[pLData] = parseFloat(parseFloat(profitLossDataWallet[pLData]).toFixed(2));
        }
        else {
          profitLossDataWallet[pLData] = parseFloat(parseFloat(adminPLData?.[pLData]).toFixed(2));
        }
      });
      exposure += parseFloat(response?.faAdminCal?.admin?.[fgWallet.id]?.exposure || 0);

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

    parentUser.profitLoss = parseFloat(parentProfitLoss) - parseFloat(fwProfitLoss);
    parentUser.myProfitLoss = parseFloat(parentMyProfitLoss) + parseFloat(fwProfitLoss);
    parentUser.exposure = parentExposure + parseFloat(exposure);

    // const parentCommission = commissionData?.find((item) => item?.userId == fgWallet.id);
    // if (parentCommission) {
    //   parentUser.totalCommission = parentUser.totalCommission - parseFloat(parentCommission?.amount || 0);
    // }

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
      await incrementValuesRedis(parentUser.userId, {
        profitLoss: -parseFloat(fwProfitLoss),
        myProfitLoss: parseFloat(fwProfitLoss),
        exposure: exposure
      }, profitLossDataWallet);
    }
    sendMessageToUser(parentUser.userId, socketData.matchResultUnDeclare, {
      ...parentUser,
      matchId,
      profitLossDataWallet,
      gameType: match?.matchType
    });
    deleteCommission(matchOddId);

    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "bet.resultUnDeclared" },
        data: { profitLoss: resultProfitLoss, profitLossWallet: profitLossDataWallet }
      },
      req,
      res
    );

  } catch (error) {
    logger.error({
      error: `Error at un declare match result for the expert.`,
      stack: error.stack,
      message: error.message,
    });
    // Handle any errors and return an error response
    return ErrorResponse(error, req, res);
  }
}

exports.declareOtherMatchResult = async (req, res) => {
  try {

    const { result, matchBettingDetails, userId, matchId, matchOddId, match, matchBettingType } = req.body;

    const domainData = await getUserDomainWithFaId();

    const fgWallet = await getUser({
      roleName: userRoleConstant?.fairGameWallet
    }, ["id", "matchComissionType", "matchCommission"]);

    let fwProfitLoss = 0;
    let exposure = 0;

    // let bulkCommission = [];
    // let totalCommissions = [];

    // let totalCommissionProfitLoss = 0;
    let resultProfitLoss = 0;
    for (let i = 0; i < domainData?.length; i++) {
      const item = domainData[i];
      let response;
      try {
        response = await apiCall(apiMethod.post, item?.domain + allApiRoutes.declareResultOtherMatch, {
          result, matchDetails: matchBettingDetails, userId, matchId, match, betType: matchBettingType, betId: matchOddId
        });
        response = response?.data;
        resultProfitLoss += parseFloat(parseFloat((response?.fwProfitLoss || 0)).toFixed(2));
      }
      catch (err) {
        logger.error({
          error: `Error at declare match result for the domain ${item?.domain}.`,
          stack: err.stack,
          message: err.message,
        });

        await addResultFailed({
          matchId: matchId,
          betId: matchOddId,
          userId: item?.userId?.id,
          result: result,
          createBy: userId
        })
        continue;
      }

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
          message: "Updating user balance created by fgadmin or wallet in declare: ",
          data: {
            superAdminData: response?.superAdminData?.[userId],
            userId: userId
          },
        });
      }

      // bulkCommission.push(...response?.faAdminCal?.commission);

      for (let parentUserId in response?.faAdminCal.userData) {

        let adminBalanceData = response?.faAdminCal.userData[parentUserId];

        fwProfitLoss += parseFloat(adminBalanceData?.profitLoss);
        // if (item.domain == oldBetFairDomain) {
        //   totalCommissionProfitLoss += parseFloat(adminBalanceData?.userOriginalProfitLoss);
        // }

        if (adminBalanceData.role == userRoleConstant.fairGameAdmin) {
          // totalCommissions = [...totalCommissions, ...response?.faAdminCal?.commission];
          let parentUser = await getUserBalanceDataByUserId(parentUserId);
          // let userCommission = await getUserById(parentUserId, ["matchComissionType", "matchCommission", "fwPartnership"]);


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

          // let totalCommissionData = 0;

          // if (userCommission?.matchCommission && item.domain == oldBetFairDomain) {

          //   Object.keys(response?.bulkCommission)?.forEach((item) => {
          //     if (userCommission.matchComissionType == matchComissionTypeConstant.entryWise) {
          //       response?.bulkCommission?.[item]?.filter((items) => items?.superParent == parentUserId)?.forEach((items) => {
                 
          //         parentUser.totalCommission = parseFloat(parentUser.totalCommission) + Math.abs(parseFloat(parseFloat(parseFloat(parseFloat((parseFloat(items?.lossAmount) * parseFloat(userCommission?.matchCommission) / 100).toFixed(2))*parseFloat((parseFloat(userCommission.fwPartnership)/100).toFixed(2))).toFixed(2))));
          //         totalCommissionData+=Math.abs(parseFloat(parseFloat(parseFloat(parseFloat((parseFloat(items?.lossAmount) * parseFloat(userCommission?.matchCommission) / 100).toFixed(2))*parseFloat((parseFloat(userCommission.fwPartnership)/100).toFixed(2))).toFixed(2))));
                
          //         bulkCommission.push({
          //           createBy: item,
          //           matchId: items.matchId,
          //           betId: items?.betId,
          //           betPlaceId: items?.betPlaceId,
          //           parentId: parentUserId,
          //           teamName: items?.sessionName,
          //           betPlaceDate: new Date(items?.betPlaceDate),
          //           odds: items?.odds,
          //           betType: items?.betType,
          //           stake: items?.stake,
          //           commissionAmount: Math.abs(parseFloat((parseFloat(items?.lossAmount) * parseFloat(userCommission?.matchCommission) / 100).toFixed(2))),
          //           partnerShip: userCommission.fwPartnership,
          //           matchName: match?.title,
          //           matchStartDate: new Date(match?.startAt),
          //           userName: items.userName
          //         });
          //       });
          //     }
          //     else if (parseFloat(adminBalanceData?.["userOriginalProfitLoss"]) < 0) {

          //       parentUser.totalCommission = parseFloat(parentUser.totalCommission) + Math.abs(parseFloat(parseFloat(parseFloat((parseFloat(parseFloat(adminBalanceData?.["userOriginalProfitLoss"])) * parseFloat(userCommission?.matchCommission) / 100).toFixed(2)) * parseFloat((parseFloat(userCommission.fwPartnership) / 100).toFixed(2))).toFixed(2)));

          //       totalCommissionData += Math.abs(parseFloat(parseFloat(parseFloat((parseFloat(parseFloat(adminBalanceData?.["userOriginalProfitLoss"])) * parseFloat(userCommission?.matchCommission) / 100).toFixed(2)) * parseFloat((parseFloat(userCommission.fwPartnership) / 100).toFixed(2))).toFixed(2)));

          //       bulkCommission.push({
          //         createBy: item,
          //         matchId: matchId,
          //         betId: matchDetails?.find((items) => items.type == matchBettingType.quickbookmaker1)?.id,
          //         parentId: parentUserId,
          //         commissionAmount: Math.abs(parseFloat((parseFloat(parseFloat(adminBalanceData?.["userOriginalProfitLoss"])) * parseFloat(userCommission?.matchCommission) / 100).toFixed(2))),
          //         partnerShip: userCommission.fwPartnership,
          //         matchName: match?.title,
          //         matchStartDate: new Date(match?.startAt),
          //         userName: null,
          //         stake: adminBalanceData?.["userOriginalProfitLoss"]

          //       });
          //     }
          //   });
          // };
          
          if (parentUser.exposure < 0) {
            logger.info({
              message: "Exposure in negative for user: ",
              data: {
                matchOddId,
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
            // totalCommission: totalCommissionData,
            balance: 0
          });

          logger.info({
            message: "Declare other match result db update for parent.",
            data: {
              matchOddId,
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

          await deleteKeyFromUserRedis(parentUser.userId, ...redisKeysMarketWise[matchBettingType].map((item) => item + matchId));

          sendMessageToUser(parentUser.userId, socketData.matchResult, {
            ...parentUser,
            matchId,
            gameType: match?.matchType,
            betId: matchOddId,
            betType: matchBettingType
          });
          exposure += parseFloat(adminBalanceData?.exposure);
         
        };

      }

      fwProfitLoss += parseFloat(response?.faAdminCal?.fwWalletDeduction || 0);
      exposure += parseFloat(response?.faAdminCal?.userData?.[fgWallet.id]?.exposure || 0);
    }

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

    // const allChildUsers = await getUsersWithoutCount({ createBy: fgWallet.id }, ["id"]);
    // const commissionWallet = await bulkCommission.filter((item) => allChildUsers.find((items) => items.id == item.parentId) != undefined)?.reduce((prev, curr) => {
    //   return prev + parseFloat(parseFloat(curr.commissionAmount * curr.partnerShip / 100).toFixed(2))
    // }, 0);
    // parentUser.totalCommission += parseFloat(parseFloat(commissionWallet).toFixed(2));

    if (parentUser.exposure < 0) {
      logger.info({
        message: "Exposure in negative for user: ",
        data: {
          matchOddId,
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
      // totalCommission: parseFloat(parseFloat(commissionWallet).toFixed(2))
    });

    logger.info({
      message: "Declare other result db update for parent ",
      data: {
        betId: matchOddId,
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

    await deleteKeyFromUserRedis(parentUser.userId, ...redisKeysMarketWise[matchBettingType].map((item) => item + matchId));

    sendMessageToUser(parentUser.userId, socketData.matchResult, {
      ...parentUser,
      matchId,
      betId: matchOddId,
      gameType: match?.matchType,
      betType: matchBettingType
    });

    // await insertCommissions(bulkCommission);

    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "bet.resultDeclared" },
        data: {
          profitLoss: resultProfitLoss,
          // totalCommission: parseFloat(parseFloat(commissionWallet).toFixed(2)) 
        }
      },
      req,
      res
    );
  } catch (error) {
    logger.error({
      error: `Error at declare other match result for the expert.`,
      stack: error.stack,
      message: error.message,
    });
    // Handle any errors and return an error response
    return ErrorResponse(error, req, res);
  }
}

exports.unDeclareOtherMatchResult = async (req, res) => {
  try {
    const { matchOddId, userId, matchId, match, matchBetting, matchBettingType } = req.body;
    const domainData = await getUserDomainWithFaId();

    const fgWallet = await getUser({
      roleName: userRoleConstant?.fairGameWallet
    }, ["id", "matchComissionType", "matchCommission"]);

    let fwProfitLoss = 0;
    let profitLossDataAdmin = {};
    let profitLossDataWallet = {};
    let exposure = 0;

    // const commissionData = await getCombinedCommission(matchOddId);
    let fwData = new Set();
    let resultProfitLoss = 0;
    for (let i = 0; i < domainData?.length; i++) {
      let item = domainData[i];
      let response = await apiCall(apiMethod.post, item?.domain + allApiRoutes.unDeclareResultOtherMatch, {
        matchOddId,
        userId,
        matchId,
        match,
        matchBetting,
        betType: matchBettingType
      }).then((data) => data).catch(async (err) => {
        logger.error({
          error: `Error at un Declare match result for the domain ${item?.domain}.`,
          stack: err.stack,
          message: err.message,
        });

        await addResultFailed({
          matchId: matchId,
          betId: matchOddId,
          userId: item?.userId?.id,
          result: unDeclare,
          createBy: userId
        })
        return;
      });
      response = response?.data;
      resultProfitLoss += parseFloat(parseFloat((response?.fwProfitLoss || 0)).toFixed(2))

      for (let userIds in response?.superAdminData) {
        if (response?.superAdminData?.[userIds]?.role == userRoleConstant.user) {
          response.superAdminData[userIds].profitLoss = -response?.superAdminData?.[userIds].profitLoss;
          response.superAdminData[userIds].myProfitLoss = -response?.superAdminData?.[userIds].myProfitLoss;
        } else {
          response.superAdminData[userIds].profitLoss = -response?.superAdminData?.[userIds].profitLoss;
          response.superAdminData[userIds].balance = 0;
        }
        
        // response.superAdminData[userIds].totalCommission = -parseFloat((parseFloat(response.superAdminData[userIds].totalCommission || 0)).toFixed(2));
        
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

          // let totalCommissionData = 0;

          // if (!fwData.has(parentUserId)) {
          //   fwData.add(parentUserId);
          //   let parentCommission = commissionData?.find((item) => item?.userId == parentUser.userId);
          //   if (parentCommission) {
          //     parentUser.totalCommission = parentUser.totalCommission - parseFloat(parentCommission?.amount || 0);
          //     totalCommissionData += parseFloat(parentCommission?.amount || 0);
          //   }
          // }

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
            // totalCommission: -totalCommissionData,
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
                profitLossDataAdmin[parentUser.userId][pLData] += adminPLData?.[pLData];
                profitLossDataAdmin[parentUser.userId][pLData] = parseFloat(parseFloat(profitLossDataAdmin[parentUser.userId][pLData]).toFixed(2));
              }
              else {
                profitLossDataAdmin[parentUser.userId][pLData] = parseFloat(parseFloat(adminPLData?.[pLData]).toFixed(2));
              }
            }
            else {
              profitLossDataAdmin[parentUser.userId] = {};
              profitLossDataAdmin[parentUser.userId][pLData] = parseFloat(parseFloat(adminPLData?.[pLData]).toFixed(2));
            }
          });

          if (parentUserRedisData?.exposure) {

            await incrementValuesRedis(parentUser.userId, {
              profitLoss: -parseFloat(adminBalanceData?.["profitLoss"]),
              myProfitLoss: parseFloat((parseFloat(adminBalanceData?.["myProfitLoss"])).toFixed(2)),
              exposure: parseFloat(adminBalanceData?.["exposure"])
            }, profitLossDataAdmin[parentUser.userId] || {});
          }

          sendMessageToUser(parentUser.userId, socketData.matchResultUnDeclare, {
            ...parentUser,
            matchId,
            betId: matchOddId,
            profitLossData: profitLossDataAdmin[parentUser.userId],
            gameType: match?.matchType,
            betType: matchBettingType,
            teamArateRedisKey: `${otherEventMatchBettingRedisKey[matchBettingType]?.a}${matchId}`,
            teamBrateRedisKey: `${otherEventMatchBettingRedisKey[matchBettingType]?.b}${matchId}`,
            teamCrateRedisKey: `${otherEventMatchBettingRedisKey[matchBettingType]?.c}${matchId}`,
    });
          exposure += parseFloat(adminBalanceData?.["exposure"]);
        };
        
      }
      fwProfitLoss -= parseFloat(response?.faAdminCal?.fwWalletDeduction || 0);
      let { exposure: tempExposure, profitLoss: tempProfitLoss, myProfitLoss: tempMyProfitLoss, role, ...adminPLData } = response?.faAdminCal?.wallet;

      Object.keys(adminPLData)?.forEach((pLData) => {
        if (profitLossDataWallet[pLData]) {
          profitLossDataWallet[pLData] += adminPLData?.[pLData];
          profitLossDataWallet[pLData] = parseFloat(parseFloat(profitLossDataWallet[pLData]).toFixed(2));
        }
        else {
          profitLossDataWallet[pLData] = parseFloat(parseFloat(adminPLData?.[pLData]).toFixed(2));
        }
      });
      exposure += parseFloat(response?.faAdminCal?.admin?.[fgWallet.id]?.exposure || 0);

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

    parentUser.profitLoss = parseFloat(parentProfitLoss) - parseFloat(fwProfitLoss);
    parentUser.myProfitLoss = parseFloat(parentMyProfitLoss) + parseFloat(fwProfitLoss);
    parentUser.exposure = parentExposure + parseFloat(exposure);

    // const parentCommission = commissionData?.find((item) => item?.userId == fgWallet.id);
    // if (parentCommission) {
    //   parentUser.totalCommission = parentUser.totalCommission - parseFloat(parentCommission?.amount || 0);
    // }

    // const allChildUsers = await getUsersWithoutCount({ createBy: fgWallet.id }, ["id"]);
    // const commissionWallet = await commissionData.filter((item) => allChildUsers.find((items) => items.id == item.userId) != undefined)?.reduce((prev, curr) => {
    //   return prev + parseFloat(parseFloat(curr.amount).toFixed(2))
    // }, 0);
    // parentUser.totalCommission -= parseFloat(parseFloat(commissionWallet).toFixed(2));

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
      // totalCommission: -parseFloat(parseFloat(commissionWallet).toFixed(2))
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
      await incrementValuesRedis(parentUser.userId, {
        profitLoss: -parseFloat(fwProfitLoss),
        myProfitLoss: parseFloat(fwProfitLoss),
        exposure: exposure
      }, profitLossDataWallet);
    }
    sendMessageToUser(parentUser.userId, socketData.matchResultUnDeclare, {
      ...parentUser,
      matchId,
      profitLossData: profitLossDataWallet,
      betId: matchOddId,
      gameType: match?.matchType,
      betType: matchBettingType,
      teamArateRedisKey: `${otherEventMatchBettingRedisKey[matchBettingType]?.a}${matchId}`,
      teamBrateRedisKey: `${otherEventMatchBettingRedisKey[matchBettingType]?.b}${matchId}`,
      teamCrateRedisKey: `${otherEventMatchBettingRedisKey[matchBettingType]?.c}${matchId}`,
    });
    // deleteCommission(matchOddId);

    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "bet.resultUnDeclared" },
        data: { profitLoss: resultProfitLoss, profitLossWallet: profitLossDataWallet }
      },
      req,
      res
    );

  } catch (error) {
    logger.error({
      error: `Error at un declare match result for the expert.`,
      stack: error.stack,
      message: error.message,
    });
    // Handle any errors and return an error response
    return ErrorResponse(error, req, res);
  }
}

exports.lockUnlockExpert = async (req, res) => {
  try {

    let { userId, userBlock } = req.body
    const loginId = req.user

    let userData = {
      userId,
      userBlock,
      blockBy: loginId.id,
    };
    let domain = expertDomain;
    let apiResponse = {}
    try {
      apiResponse = await apiCall(apiMethod.put, domain + allApiRoutes.EXPERTS.lockUnlockUser, userData)
    } catch (error) {
      throw error?.response?.data
    }
    return SuccessResponse({ statusCode: 200, message: { msg: "updated", keys: { name: "lock unlock" } }, data: apiResponse }, req, res
    );

  } catch (err) {
    return ErrorResponse(err, req, res);
  }

}

exports.getWalletBetsData = async (req, res) => {
  try {
    const user = await getUser({
      roleName: userRoleConstant.fairGameWallet
    });

    let result = {};

    const betData = await getUserRedisData(user.id);
    if (betData) {
      Object.keys(betData)?.forEach((item) => {
        if (Object.values(redisKeysMatchWise)?.flat(2)?.includes(item?.split("_")?.[0]+"_")) {
          result[item] = betData[item];
        }
      })
    }
    else {
      result = await settingBetsDataAtLogin(user);
      let result2 = await settingOtherMatchBetsDataAtLogin(user);
      result = { ...result, ...result2 }
    }

    return SuccessResponse(
      {
        statusCode: 200,
        data: result
      },
      req,
      res
    );
  }
  catch (error) {
    logger.error({
      error: `Error at getting bet data from wallet.`,
      stack: error.stack,
      message: error.message,
    });
    // Handle any errors and return an error response
    return ErrorResponse(error, req, res);
  }
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
const updateBulkCommission = async (response, bulkCommission) => {
  bulkCommission.push(...response?.faAdminCal?.commission?.map((item) => {
    return {
      ...item,
      betPlaceDate: new Date(item?.betPlaceDate),
      matchStartDate: new Date(item?.matchStartDate)
    }
  }));
}
