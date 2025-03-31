const { expertDomain, userRoleConstant, redisKeys, socketData, unDeclare, oldBetFairDomain, matchComissionTypeConstant, marketBetType, sessionBettingType } = require("../config/contants");
const { logger } = require("../config/logger");
const { addResultFailed } = require("../services/betService");
const { insertCommissions, getCombinedCommission, deleteCommission } = require("../services/commissionService");
const { mergeProfitLoss, settingBetsDataAtLogin, settingTournamentMatchBetsDataAtLogin } = require("../services/commonService");
const { getUserDomainWithFaId } = require("../services/domainDataService");
const { getUserRedisData, updateUserDataRedis, deleteKeyFromUserRedis, incrementValuesRedis, getCasinoDomainBets, deleteHashKeysByPattern, delCardBetPlaceRedis } = require("../services/redis/commonFunctions");
const { getUserBalanceDataByUserId, updateUserBalanceData, updateUserExposure } = require("../services/userBalanceService");
const { getUser, getUserById, getUsersWithoutCount } = require("../services/userService");
const { sendMessageToUser, broadcastEvent } = require("../sockets/socketManager");
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
      expertDomain + allApiRoutes.EXPERTS.notification,
      null,
      null,
      req.query
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

exports.declareTournamentMatchResult = async (req, res) => {
  try {
    const { result, isMatchDeclare, matchBettingDetails, userId, matchId, matchOddId, match, matchBettingType, isMatchOdd } = req.body;
    const domainData = await getUserDomainWithFaId();

    // for (let i = 0; i < domainData?.length; i++) {
    //   const item = domainData[i];
    //   let response;
    //   try {
    //     response = await apiCall(apiMethod.post, item?.domain + allApiRoutes.getVerifyBet, {
    //       betId: matchOddId
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
    let totalCommissionProfitLoss = 0;
    let resultProfitLoss = 0;
    for (let i = 0; i < domainData?.length; i++) {
      const item = domainData[i];
      let response;
      try {
        response = await apiCall(apiMethod.post, item?.domain + allApiRoutes.declareResultTournametMatch, {
          result, matchDetails: matchBettingDetails, userId, matchId, match, betType: matchBettingType, betId: matchOddId, isMatchDeclare: isMatchDeclare, isMatchOdd: isMatchOdd
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
        });
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
      bulkCommission.push(...(response?.faAdminCal?.commission || []));

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
                  betId: matchOddId,
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
            totalCommission: parseFloat(parseFloat(totalCommissionData).toFixed(2)),
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

          await deleteKeyFromUserRedis(parentUser.userId, `${matchOddId}${redisKeys.profitLoss}_${matchId}`);

          sendMessageToUser(parentUser.userId, socketData.matchResult, {
            ...parentUser,
            matchId,
            gameType: match?.matchType,
            betId: matchOddId,
            betType: matchBettingType,
            isMatchDeclare: isMatchDeclare
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
      message: "Declare tournament result db update for parent ",
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

    await deleteKeyFromUserRedis(parentUser.userId, `${matchOddId}${redisKeys.profitLoss}_${matchId}`);

    sendMessageToUser(parentUser.userId, socketData.matchResult, {
      ...parentUser,
      matchId,
      betId: matchOddId,
      gameType: match?.matchType,
      betType: matchBettingType,
      isMatchDeclare: isMatchDeclare
    });

    insertCommissions(bulkCommission);

    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "bet.resultDeclared" },
        data: {
          profitLoss: resultProfitLoss,
          totalCommission: parseFloat(parseFloat(commissionWallet).toFixed(2))
        }
      },
      req,
      res
    );
  } catch (error) {
    logger.error({
      error: `Error at declare tournament match result for the expert.`,
      stack: error.stack,
      message: error.message,
    });
    // Handle any errors and return an error response
    return ErrorResponse(error, req, res);
  }
}

exports.unDeclareTournamentMatchResult = async (req, res) => {
  try {
    const { matchOddId, userId, matchId, match, matchBetting, matchBettingType, isMatchOdd } = req.body;
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
      let response = await apiCall(apiMethod.post, item?.domain + allApiRoutes.unDeclareResultTournamentMatch, {
        matchOddId,
        userId,
        matchId,
        match,
        matchBetting,
        betType: matchBettingType,
        isMatchOdd: isMatchOdd
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
            betId: matchOddId,
            profitLossData: profitLossDataAdmin[parentUser.userId],
            gameType: match?.matchType,
            betType: matchBettingType,
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
      profitLossData: profitLossDataWallet?.[`${matchOddId}${redisKeys.profitLoss}_${matchId}`],
      betId: matchOddId,
      gameType: match?.matchType,
      betType: matchBettingType,
     
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

exports.declareFinalMatchResult = async (req, res) => {
  try {
    const { matchId, matchType } = req.body;
    const domainData = await getUserDomainWithFaId();

    for (let i = 0; i < domainData?.length; i++) {
      const item = domainData[i];
      try {
        await apiCall(apiMethod.post, item?.domain + allApiRoutes.declareResultFinalMatch, {
          matchId, matchType
        });
      }
      catch (err) {
        logger.error({
          error: `Error at declare match result for the domain ${item?.domain}.`,
          stack: err.stack,
          message: err.message,
        });

        continue;
      }

    }
    broadcastEvent(socketData.matchResult, {
      matchId,
      gameType: matchType,
      isMatchDeclare: true
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
      error: `Error at declare tournament match result for the expert.`,
      stack: error.stack,
      message: error.message,
    });
    // Handle any errors and return an error response
    return ErrorResponse(error, req, res);
  }
}

exports.unDeclareFinalMatchResult = async (req, res) => {
  try {
    const { matchId, matchType } = req.body;
    const domainData = await getUserDomainWithFaId();

    for (let i = 0; i < domainData?.length; i++) {
      let item = domainData[i];
      await apiCall(apiMethod.post, item?.domain + allApiRoutes.unDeclareResultFinalMatch, {
        matchId,
        matchType
      }).then((data) => data).catch(async (err) => {
        logger.error({
          error: `Error at un Declare match result for the domain ${item?.domain}.`,
          stack: err.stack,
          message: err.message,
        });

        return;
      });
    }

    broadcastEvent(socketData.matchResultUnDeclare, {
      matchId,
      gameType: matchType,
    });

    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "bet.resultUnDeclared" },
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
        if (item?.includes(redisKeys.profitLoss)) {
          result[item] = betData[item];
        }
      });
    }
    else {
      result = await settingBetsDataAtLogin(user);
      let tournamentMatchBetData = await settingTournamentMatchBetsDataAtLogin(user);
      result = { ...result, ...tournamentMatchBetData }
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


exports.declareCardMatchResult = async (req, res) => {
  try {

    const { result, type } = req.body;

    let domainData = await getCasinoDomainBets(result?.mid);
    domainData = Object.keys(domainData);
    if(!domainData?.length){
      return SuccessResponse(
        {
          statusCode: 200,
          message: { msg: "bet.resultDeclared" }
        },
        req,
        res
      );
    }

    let cardDetails = {};
    try {
      cardDetails = await apiCall(
        apiMethod.get,
        expertDomain + allApiRoutes.MATCHES.cardDetails + type
      );
    } catch (error) {
      throw error?.response?.data;
    }

    if(!cardDetails){
      throw {
        statusCode:500,
        message: {
          msg: "notFound",
          keys: { name: "Match" }
        }
      }
    }

    const fgWallet = await getUser({
      roleName: userRoleConstant?.fairGameWallet
    }, ["id"]);

    let fwProfitLoss = 0;
    let exposure = 0;

    let resultProfitLoss = 0;
    for (let i = 0; i < domainData?.length; i++) {
      const item = domainData[i];
      let response;
      try {
        response = await apiCall(apiMethod.post, item + allApiRoutes.declareResultCardMatch, {
          result, matchDetails: cardDetails?.data, type: type
        });
        response = response?.data;
        resultProfitLoss += parseFloat(parseFloat((response?.fwProfitLoss || 0)).toFixed(2));
      }
      catch (err) {
        logger.error({
          error: `Error at declare card match result for the domain ${item}.`,
          stack: err.stack,
          message: err.message,
        });
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

          if (parentUser.exposure < 0) {
            logger.info({
              message: "Exposure in negative for user: ",
              data: {
                matchId: cardDetails.id,
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
              matchId: cardDetails.id,
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

          await deleteHashKeysByPattern(parentUser.userId, result?.mid + "*");
          await deleteKeyFromUserRedis(parentUser.userId, `${redisKeys.userMatchExposure}${result?.mid}`);

          sendMessageToUser(parentUser.userId, socketData.cardResult, {
            ...parentUser,
            matchId: cardDetails.id,
            gameType: cardDetails?.type
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

    if (parentUser.exposure < 0) {
      logger.info({
        message: "Exposure in negative for user: ",
        data: {
          matchId: cardDetails?.id,
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

    await deleteHashKeysByPattern(parentUser.userId, result?.mid + "*");
    await deleteKeyFromUserRedis(parentUser.userId, `${redisKeys.userMatchExposure}${result?.mid}`);

    sendMessageToUser(parentUser.userId, socketData.cardResult, {
      ...parentUser,
      matchId:cardDetails?.id,
      gameType: cardDetails?.type,
    });

    await delCardBetPlaceRedis(`${result?.mid}${redisKeys.card}`);

    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "bet.resultDeclared" }
      },
      req,
      res
    );
  } catch (error) {
    logger.error({
      error: `Error at declare card match result for the expert.`,
      stack: error?.stack,
      message: error?.message,
    });
    // Handle any errors and return an error response
    return ErrorResponse(error, req, res);
  }
}