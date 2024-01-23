const { expertDomain, userRoleConstant, redisKeys, socketData, unDeclare } = require("../config/contants");
const { logger } = require("../config/logger");
const { addResultFailed } = require("../services/betService");
const { mergeProfitLoss } = require("../services/commonService");
const { getUserDomainWithFaId } = require("../services/domainDataService");
const { getUserRedisData, updateUserDataRedis, deleteKeyFromUserRedis } = require("../services/redis/commonFunctions");
const { getUserBalance, addInitialUserBalance, getUserBalanceDataByUserId } = require("../services/userBalanceService");
const { getUsersWithUserBalance, getUser } = require("../services/userService");
const { sendMessageToUser } = require("../sockets/socketManager");
const { apiCall, apiMethod, allApiRoutes } = require("../utils/apiService");
const { SuccessResponse, ErrorResponse } = require("../utils/response");
exports.createUser = async (req, res) => {
    try {
        // Destructuring request body for relevant user information
        let { userName, fullName, password, phoneNumber, city, allPrivilege, addMatchPrivilege, betFairMatchPrivilege, bookmakerMatchPrivilege, sessionMatchPrivilege, confirmPassword } = req.body;
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
            confirmPassword
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
        let { id, fullName, phoneNumber, city, allPrivilege, addMatchPrivilege, betFairMatchPrivilege, bookmakerMatchPrivilege, sessionMatchPrivilege } = req.body;
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
            sessionMatchPrivilege
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
        expertDomain + allApiRoutes.EXPERTS.getCompetitionList+ `/${type}`
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
        expertDomain + allApiRoutes.EXPERTS.getDatesByCompetition+ `/${competitionId}`
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
      const { competitionId,date } = req.params;
  
      
      let response = await apiCall(
        apiMethod.get,
        expertDomain + allApiRoutes.EXPERTS.getMatchByCompetitionAndDate+ `/${competitionId}/${new Date(date)}`
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


  
exports.declareSessionResult = async (req,res)=>{
  try {

    const {betId,score,sessionDetails,userId,matchId}=req.body;

    const domainData=await getUserDomainWithFaId();

    
    const fgWallet= await getUser({
      roleName:userRoleConstant?.fairGameWallet
    },["id"]);

    let fwProfitLoss=0;

    for(let i=0;i<domainData?.length;i++){
      const item=domainData[i];
      let response;
      try{
        response = await apiCall(apiMethod.post, item?.domain + allApiRoutes.declareResultSession, {
          betId,
          score,
          sessionDetails,
          userId,
          matchId,
        });
        response=response?.data;
      }
      catch(err){
        logger.error({
          error: `Error at declare session result for the domain ${item?.domain}.`,
          stack: err.stack,
          message: err.message,
        });

        await addResultFailed({
          matchId:matchId,
          betId:betId,
          userId:item?.userId?.id,
          result:score,
          createBy:userId
        });
        continue;
      }

      let userData= [
        {
          id: item?.userId?.createBy,
        },
        {
          id: fgWallet?.id,
          isWallet: true,
        },
      ];
    
          for (let items of userData) {
        let parentUser = await getUserBalanceDataByUserId(items?.id);

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

        parentUser.profitLoss = parentProfitLoss - response?.faAdminCal?.["profitLoss"];
        parentUser.myProfitLoss = items?.isWallet
          ? parseFloat(response?.faAdminCal?.["profitLoss"]) - parseFloat(parentMyProfitLoss)
          : parseFloat(parentMyProfitLoss) -
            parseFloat(parseFloat(
              (parseFloat(response?.faAdminCal?.["myProfitLoss"])
            )).toFixed(2));
        parentUser.exposure = parentExposure - response?.faAdminCal?.["exposure"];
        if (parentExposure < 0) {
          logger.info({
            message: "Exposure in negative for user: ",
            data: {
              betId,
              matchId,
              parentUser,
            },
          });
          parentUser.exposure = 0;
        }
        addInitialUserBalance(parentUser);
        logger.info({
          message: "Declare result db update for parent ",
          data: {
            betId,
            parentUser,
          },
        });
        if (parentUserRedisData?.exposure) {
          updateUserDataRedis(parentUser.userId, {
            exposure: parentUser.exposure,
            profitLoss: parentUser.profitLoss,
            myProfitLoss: parentUser.myProfitLoss,
          });
        }
        const redisSessionExposureName =
          redisKeys.userSessionExposure + matchId;
        let parentRedisUpdateObj = {};
        let sessionExposure = 0;
        if (parentUserRedisData?.[redisSessionExposureName]) {
          sessionExposure =
            parseFloat(parentUserRedisData[redisSessionExposureName]) || 0;
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
          matchId,
          sessionExposure: sessionExposure,
        });

      };
      fwProfitLoss+=parseFloat(response?.fwProfitLoss);
    }

    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "bet.resultDeclared" },
        data: {profitLoss:fwProfitLoss}
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

      let userData= [
        {
          id: item?.userId?.createBy,
        },
        {
          id: fgWallet?.id,
          isWallet: true,
        },
      ];
    
          for (let items of userData) {

        let parentUser = await getUserBalanceDataByUserId(items?.id);

        let parentUserRedisData = await getUserRedisData(parentUser?.userId);

        let parentExposure = parseFloat(parentUser?.exposure || 0);
        if (parentUserRedisData?.exposure) {
          parentExposure = parseFloat(parentUserRedisData?.exposure);
        }

        parentUser.exposure =
          parentExposure - response?.["exposure"];
        if (parentExposure < 0) {
          logger.info({
            message: "Exposure in negative for user: ",
            data: {
              betId,
              matchId,
              parentUser,
            },
          });
          parentUser.exposure = 0;
        }
        addInitialUserBalance(parentUser);
        logger.info({
          message: "Declare result db update for parent ",
          data: {
            betId,
            parentUser,
          },
        });

        let parentRedisUpdateObj = {};

        if (parentUserRedisData?.exposure) {
          parentRedisUpdateObj = {
            exposure: parentUser.exposure,
          };
        }
        const redisSessionExposureName =
          redisKeys.userSessionExposure + matchId;
        let sessionExposure = 0;
        if (parentUserRedisData?.[redisSessionExposureName]) {
          sessionExposure =
            parseFloat(parentUserRedisData[redisSessionExposureName]) || 0;
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
          matchId,
          sessionExposure: sessionExposure,
        });
      };
    }

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


exports.unDeclareSessionResult = async (req,res)=>{
  try {

    const {betId,sessionDetails,userId,matchId}=req.body;

    const domainData=await getUserDomainWithFaId();

    
    const fgWallet= await getUser({
      roleName:userRoleConstant?.fairGameWallet
    },["id"]);

    let fwProfitLoss=0;
    let profitLossDataAdmin=null;
    let profitLossDataWallet=null;

    for(let i=0;i<domainData?.length;i++){
      let item=domainData[i];
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
    
  let userData= [
    {
      id: item?.userId?.createBy,
    },
    {
      id: fgWallet?.id,
      isWallet: true,
    },
  ];

      for (let items of userData) {
        let parentUser = await getUserBalanceDataByUserId(items?.id);

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

        parentUser.profitLoss = parentProfitLoss + response?.faAdminCal?.["profitLoss"];
        parentUser.myProfitLoss = items?.isWallet ? parseFloat(response?.faAdminCal?.["profitLoss"]) + parseFloat(parentMyProfitLoss) : parseFloat(parentMyProfitLoss) + parseFloat((parseFloat(response?.faAdminCal?.["myProfitLoss"])).toFixed(2));
        parentUser.exposure = parentExposure + response?.faAdminCal?.["exposure"];
        if (parentExposure < 0) {
          logger.info({
            message: "Exposure in negative for user: ",
            data: {
              betId,
              matchId,
              parentUser,
            },
          });
          parentUser.exposure = 0;
        }
        await addInitialUserBalance(parentUser);
        logger.info({
          message: "Un declare result db update for parent ",
          data: {
            betId,
            parentUser,
          },
        });

        let parentRedisUpdateObj = {};

        let newProfitLoss = items?.isWallet ? response?.faAdminCal?.profitLossObjWallet : response?.faAdminCal?.profitLossObjAdmin;

        if (items?.isWallet) {

          if (!profitLossDataWallet) {
            profitLossDataWallet = { ...newProfitLoss };
          } else {
            mergeProfitLoss(
              newProfitLoss?.betPlaced,
              profitLossDataWallet?.betPlaced
            );

            profitLossDataWallet = {
              upperLimitOdds: newProfitLoss?.betPlaced?.[newProfitLoss?.betPlaced?.length - 1]?.odds,
              lowerLimitOdds: newProfitLoss?.betPlaced?.[0]?.odds,
              maxLoss: profitLossDataWallet?.maxLoss + newProfitLoss?.maxLoss,

              betPlaced: newProfitLoss?.betPlaced?.map((item, index) => {
                return {
                  odds: item?.odds,
                  profitLoss:
                    item?.profitLoss + profitLossDataWallet?.betPlaced?.[index]?.profitLoss,
                };
              }),
            };
          }
        } else {

          if (!profitLossDataAdmin) {
            profitLossDataAdmin = { ...newProfitLoss };
          } else {
            mergeProfitLoss(
              newProfitLoss?.betPlaced,
              profitLossDataAdmin?.betPlaced
            );

            profitLossDataAdmin = {
              upperLimitOdds: newProfitLoss?.betPlaced?.[newProfitLoss?.betPlaced?.length - 1]?.odds,
              lowerLimitOdds: newProfitLoss?.betPlaced?.[0]?.odds,
              maxLoss: profitLossDataAdmin?.maxLoss + newProfitLoss?.maxLoss,
              betPlaced: newProfitLoss?.betPlaced?.map((item, index) => {
                return {
                  odds: item?.odds,
                  profitLoss:
                    item?.profitLoss + profitLossDataAdmin?.betPlaced?.[index]?.profitLoss,
                };
              }),
            };
          }
        }



        if (parentUserRedisData?.exposure) {
          parentRedisUpdateObj = {
            exposure: parentUser.exposure,
            profitLoss: parentUser.profitLoss,
            myProfitLoss: parentUser.myProfitLoss,
            [betId + redisKeys.profitLoss]: JSON.stringify(
              items?.isWallet ? profitLossDataWallet : profitLossDataAdmin
            ),
          };
        }
        const redisSessionExposureName =
          redisKeys.userSessionExposure + matchId;
        let sessionExposure = 0;
        if (parentUserRedisData?.[redisSessionExposureName]) {
          sessionExposure =
            parseFloat(parentUserRedisData[redisSessionExposureName]) || 0;
        }

        sessionExposure = sessionExposure + (newProfitLoss?.maxLoss || 0);
        parentRedisUpdateObj[redisSessionExposureName] = sessionExposure;


        if (
          parentUserRedisData?.exposure &&
          Object.keys(parentRedisUpdateObj).length > 0
        ) {
          await updateUserDataRedis(parentUser.userId, parentRedisUpdateObj);
        }
        sendMessageToUser(parentUser.userId, socketData.sessionResultUnDeclare, {
          ...parentUser,
          betId,
          matchId,
          sessionExposure: sessionExposure,
          parentRedisUpdateObj
        });

      };
      fwProfitLoss += parseFloat(response?.fwProfitLoss);

    };

    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "bet.resultUnDeclared" },
        data: {profitLoss:fwProfitLoss,profitLossObj:profitLossDataWallet}
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
}

exports.declareMatchResult = async (req,res)=>{
  try {

    const { result, matchDetails, userId, matchId, matchOddId, match } = req.body;

    const domainData=await getUserDomainWithFaId();

    
    const fgWallet= await getUser({
      roleName:userRoleConstant?.fairGameWallet
    },["id"]);

    let fwProfitLoss=0;

    for(let i=0;i<domainData?.length;i++){
      const item=domainData[i];
      let response;
      try{
        response = await apiCall(apiMethod.post, item?.domain + allApiRoutes.declareResultMatch, {
          result, matchDetails, userId, matchId, match
        });
        response=response?.data;
      }
      catch(err){
        logger.error({
          error: `Error at declare match result for the domain ${item?.domain}.`,
          stack: err.stack,
          message: err.message,
        });

        await addResultFailed({
          matchId:matchId,
          betId:matchOddId,
          userId:item?.userId?.id,
          result: result,
          createBy:userId
        })
        continue;
      }

      let userData= [
        {
          id: item?.userId?.createBy,
        },
        {
          id: fgWallet?.id,
          isWallet: true,
        },
      ];
    
          for (let items of userData) {
        let parentUser = await getUserBalanceDataByUserId(items?.id);

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

        parentUser.profitLoss = parentProfitLoss - response?.faAdminCal?.["profitLoss"];
        parentUser.myProfitLoss = items?.isWallet
          ? parseFloat(parentMyProfitLoss) - parseFloat(response?.faAdminCal?.["profitLoss"])
          : parseFloat(parentMyProfitLoss) -
            parseFloat(parseFloat(
              (parseFloat(response?.faAdminCal?.["myProfitLoss"])
            )).toFixed(2));
        parentUser.exposure = parentExposure - response?.faAdminCal?.["exposure"];
        if (parentExposure < 0) {
          logger.info({
            message: "Exposure in negative for user: ",
            data: {
              matchOddId,
              matchId,
              parentUser,
            },
          });
          parentUser.exposure = 0;
        }
        addInitialUserBalance(parentUser);
        logger.info({
          message: "Declare result db update for parent ",
          data: {
            matchOddId,
            parentUser,
          },
        });
        if (parentUserRedisData?.exposure) {
          updateUserDataRedis(parentUser.userId, {
            exposure: parentUser.exposure,
            profitLoss: parentUser.profitLoss,
            myProfitLoss: parentUser.myProfitLoss,
          });
        }
      
        await deleteKeyFromUserRedis(parentUser.userId, redisKeys.userTeamARate + matchId, redisKeys.userTeamBRate + matchId, redisKeys.userTeamCRate + matchId, redisKeys.yesRateTie + matchId, redisKeys.noRateTie + matchId, redisKeys.yesRateComplete + matchId, redisKeys.noRateComplete + matchId);

        sendMessageToUser(parentUser.userId, socketData.matchResult, {
          ...parentUser,
          matchId
        });

      };
      fwProfitLoss+=parseFloat(response?.fwProfitLoss);
    }

    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "bet.resultDeclared" },
        data: {profitLoss:fwProfitLoss}
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


exports.unDeclareMatchResult = async (req,res)=>{
  try {

    const { matchOddId, userId, matchId, match, matchBetting } = req.body;

    const domainData=await getUserDomainWithFaId();

    
    const fgWallet= await getUser({
      roleName:userRoleConstant?.fairGameWallet
    },["id"]);

    let fwProfitLoss=0;
    let profitLossDataAdmin={};
    let profitLossDataWallet={};

    for(let i=0;i<domainData?.length;i++){
      let item=domainData[i];
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

      let userData = [
        {
          id: item?.userId?.createBy,
        },
        {
          id: fgWallet?.id,
          isWallet: true,
        },
      ];

      for (let items of userData) {
        let parentUser = await getUserBalanceDataByUserId(items?.id);

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

        parentUser.profitLoss = parentProfitLoss + response?.faAdminCal?.["profitLoss"];
        parentUser.myProfitLoss = items?.isWallet ? parseFloat(response?.faAdminCal?.["profitLoss"]) + parseFloat(parentMyProfitLoss) : parseFloat(parentMyProfitLoss) + parseFloat((parseFloat(response?.faAdminCal?.["myProfitLoss"])).toFixed(2));
        parentUser.exposure = parentExposure + response?.faAdminCal?.["exposure"];
        if (parentExposure < 0) {
          logger.info({
            message: "Exposure in negative for user: ",
            data: {
              matchId,
              parentUser,
            },
          });
          parentUser.exposure = 0;
        }
        await addInitialUserBalance(parentUser);
        logger.info({
          message: "Un declare result db update for parent ",
          data: {
            parentUser,
          },
        });

        let parentRedisUpdateObj = {};

      
        if (items?.isWallet) {

          Object.keys(response?.faAdminCal?.wallet)?.forEach((pLData) => {
            if (profitLossDataWallet[pLData]) {
              profitLossDataWallet[pLData] += response?.faAdminCal?.wallet?.[pLData];
            }
            else {
              profitLossDataWallet[pLData] = response?.faAdminCal?.wallet?.[pLData];
            }
          });
        } else {

          Object.keys(response?.faAdminCal?.admin)?.forEach((pLData) => {
            if (profitLossDataWallet[pLData]) {
              profitLossDataAdmin[pLData] += response?.faAdminCal?.admin?.[pLData];
            }
            else {
              profitLossDataAdmin[pLData] = response?.faAdminCal?.admin?.[pLData];
            }
          });
        }



        if (parentUserRedisData?.exposure) {
          parentRedisUpdateObj = {
            exposure: parentUser.exposure,
            profitLoss: parentUser.profitLoss,
            myProfitLoss: parentUser.myProfitLoss,
            ...(items.isWallet ? profitLossDataWallet : profitLossDataAdmin),
          };
        }
       

        if (
          parentUserRedisData?.exposure
        ) {
          await updateUserDataRedis(parentUser.userId, parentRedisUpdateObj);
        }
        sendMessageToUser(parentUser.userId, socketData.matchResultUnDeclare, {
          ...parentUser,
          matchId,
          profitLossDataWallet
        });

      };
      fwProfitLoss += parseFloat(response?.fwProfitLoss);

    };

    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "bet.resultUnDeclared" },
        data: { profitLoss: fwProfitLoss, profitLossWallet: profitLossDataWallet }
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

