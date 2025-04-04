const { expertDomain, userRoleConstant, redisKeys, socketData, unDeclare, oldBetFairDomain, matchComissionTypeConstant, marketBetType, sessionBettingType, matchBettingType } = require("../config/contants");
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