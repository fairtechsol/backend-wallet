const {
  userRoleConstant,
  transType,
  walletDescription,
  oldBetFairDomain,
  redisKeys,
  partnershipPrefixByRole,
} = require("../config/contants");
const {
  getUserById,
  addUser,
  getUserByUserName,
  updateUser,
  getUser,
  deleteUser,
  userBlockUnblock,
  betBlockUnblock,
  getChildUser,
  getParentUsers,
  getFirstLevelChildUser,
  getFirstLevelChildUserWithPartnership,
} = require("../services/userService");
const { ErrorResponse, SuccessResponse } = require("../utils/response");
const { insertTransactions } = require("../services/transactionService");
const bcrypt = require("bcryptjs");
const lodash = require("lodash");
const { forceLogoutIfLogin, getFaAdminDomain, settingBetsDataAtLogin } = require("../services/commonService");
const internalRedis = require("../config/internalRedisConnection");
const {
  getUserBalanceDataByUserId,
  updateUserBalanceByUserId,
  addInitialUserBalance,
} = require("../services/userBalanceService");
const {
  addDomainData,
  getDomainData,
  getDomainDataByUserId,
  getDomainByUserId,
  updateDomain,
  getUserDomainWithFaId,
} = require("../services/domainDataService");
const { apiCall, apiMethod, allApiRoutes } = require("../utils/apiService");
const {
  calculatePartnership,
  checkUserCreationHierarchy,
} = require("../services/commonService");
const { logger } = require("../config/logger");
const { hasUserInCache, updateUserDataRedis, getUserRedisKeys } = require("../services/redis/commonFunctions");

exports.createSuperAdmin = async (req, res) => {
  try {
    let {
      userName,
      fullName,
      password,
      confirmPassword,
      phoneNumber,
      city,
      roleName,
      myPartnership,
      creditRefrence,
      exposureLimit,
      maxBetLimit,
      minBetLimit,
      domain,
      logo,
      sidebarColor,
      headerColor,
      footerColor,
      isOldFairGame,
      sessionCommission,
      matchComissionType,
      matchCommission,
      remark
    } = req.body;

    if (isOldFairGame) {
      domain = oldBetFairDomain;
    }

    let reqUser = req.user || {};
    let creator = await getUserById(reqUser.id);
    if (!creator)
      return ErrorResponse(
        { statusCode: 400, message: { msg: "invalidData" } },
        req,
        res
      );

    if (
      (roleName !== userRoleConstant.superAdmin ||
        creator.roleName != userRoleConstant.fairGameAdmin) && !isOldFairGame
    ) {
      return ErrorResponse(
        { statusCode: 400, message: { msg: "user.invalidRole" } },
        req,
        res
      );
    }
    let checkDomainData = await getDomainData(
      [{ domain }, { userName }],
      ["id", "userName", "domain"]
    );
    if (!isOldFairGame) {

      if (checkDomainData) {
        return ErrorResponse(
          { statusCode: 400, message: { msg: "user.domainExist" } },
          req,
          res
        );
      }
    }
    if (!checkUserCreationHierarchy(creator, roleName)) {
      return ErrorResponse(
        { statusCode: 400, message: { msg: "user.InvalidHierarchy" } },
        req,
        res
      );
    }

    creator.myPartnership = parseInt(myPartnership);
    userName = userName.toUpperCase();
    let userExist = await getUserByUserName(userName);
    if (userExist) {
      return ErrorResponse(
        { statusCode: 400, message: { msg: "user.userExist" } },
        req,
        res
      );
    }

    if (exposureLimit && exposureLimit > creator.exposureLimit) {
      return ErrorResponse(
        { statusCode: 400, message: { msg: "user.InvalidExposureLimit" } },
        req,
        res
      );
    }

    password = await bcrypt.hash(password, process.env.BCRYPTSALT);

    creditRefrence = creditRefrence ? parseFloat(creditRefrence) : 0;
    exposureLimit = exposureLimit ? exposureLimit : creator.exposureLimit;
    maxBetLimit = maxBetLimit ? maxBetLimit : creator.maxBetLimit;
    minBetLimit = minBetLimit ? minBetLimit : creator.minBetLimit;

    let userData = {
      userName,
      fullName,
      password,
      phoneNumber,
      city,
      roleName,
      userBlock: creator.userBlock,
      betBlock: creator.betBlock,
      createBy: creator.id,
      creditRefrence: creditRefrence,
      exposureLimit: exposureLimit,
      maxBetLimit: maxBetLimit,
      minBetLimit: minBetLimit,
      isUrl: !Boolean(isOldFairGame),
      remark: remark,
      ...(isOldFairGame ? {
        sessionCommission,
        matchComissionType,
        matchCommission
      } : {})
    };
    let partnerships = await calculatePartnership(userData, creator);
    userData = { ...userData, ...partnerships };
    let insertUser = await addUser(userData);

    let response = lodash.pick(insertUser, [
      "id",
      "userName",
      "fullName",
      "phoneNumber",
      "city",
      "roleName",
      "userBlock",
      "betBlock",
      "creditRefrence",
      "exposureLimit",
      "maxBetLimit",
      "minBetLimit",
      "fwPartnership",
      "faPartnership",
      "saPartnership",
      "aPartnership",
      "smPartnership",
      "mPartnership",
      "agPartnership",
      "password",
      "remark",
      ...(isOldFairGame ? ["sessionCommission",
        "matchComissionType",
        "matchCommission"] : [])
    ]);

    response = {
      ...response,
      isOldFairGame: isOldFairGame,
      superParentType: creator.roleName,
      superParentId: creator.id,
      domain: { domain, logo, sidebarColor, headerColor, footerColor },
    };
    try {
      await apiCall(
        apiMethod.post,
        domain + allApiRoutes.createSuperAdmin,
        response
      );
    } catch (err) {
      logger.error({
        message: "Error at creating user on super admin side",
        context: err?.message,
        stake: err?.stack
      });
      await deleteUser(response?.id);
      return ErrorResponse(err?.response?.data, req, res);
    }

    let updateUser = {};
    if (creditRefrence) {
      updateUser = await addUser({
        id: creator.id,
        downLevelCreditRefrence:
          parseInt(creditRefrence) + parseInt(creator.downLevelCreditRefrence),
      });
    }
    let transactionArray = [
      {
        actionBy: insertUser.createBy,
        searchId: insertUser.createBy,
        userId: insertUser.id,
        amount: 0,
        transType: transType.add,
        closingBalance: insertUser.creditRefrence,
        description: walletDescription.userCreate,
      },
    ];
    if (insertUser.createdBy != insertUser.id) {
      transactionArray.push({
        actionBy: insertUser.createBy,
        searchId: insertUser.id,
        userId: insertUser.id,
        amount: 0,
        transType: transType.withDraw,
        closingBalance: insertUser.creditRefrence,
        description: walletDescription.userCreate,
      });
    }

    const transactioninserted = await insertTransactions(transactionArray);
    let insertUserBalanceData = {
      currentBalance: 0,
      userId: insertUser.id,
      profitLoss: -creditRefrence,
      myProfitLoss: 0,
      downLevelBalance: 0,
      exposure: 0,
    };
    insertUserBalanceData = await addInitialUserBalance(insertUserBalanceData);

    const insertDomainData = {
      userName,
      domain,
      sidebarColor,
      headerColor,
      footerColor,
      logo,
      createBy: creator.id,
      userId: insertUser.id,
    };
    response = lodash.omit(response, ["password", "transPassword"]);


    if (!checkDomainData) {
      await addDomainData(insertDomainData);
    }
    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "add", keys: { key: "User" } },
        data: response,
      },
      req,
      res
    );
  } catch (err) {
    logger.error({
      message: "Error at creating user on super admin side",
      context: err?.message,
      stake: err?.stack
    });
    return ErrorResponse(err, req, res);
  }
};
exports.updateSuperAdmin = async (req, res) => {
  try {
    let {
      id,
      logo,
      sidebarColor,
      headerColor,
      footerColor,
      fullName,
      phoneNumber,
      city,
      isOldFairGame,
      remark,
      sessionCommission,
      matchComissionType,
      matchCommission
    } = req.body;
    let reqUser = req.user || {};
    let updateUser = await getUser({ id, createBy: reqUser.id }, [
      "id",
      "fullName",
      "phoneNumber",
      "city",
      "remark",
      ...(isOldFairGame ? ["sessionCommission",
        "matchComissionType",
        "matchCommission"] : [])
    ]);
    if (!updateUser)
      return ErrorResponse(
        { statusCode: 400, message: { msg: "userNotFound" } },
        req,
        res
      );

    updateUser.fullName = fullName ?? updateUser.fullName;
    updateUser.phoneNumber = phoneNumber ?? updateUser.phoneNumber;
    updateUser.city = city || updateUser.city;
    updateUser.remark = remark || updateUser.remark;

    updateUser = {
      ...updateUser, ...(isOldFairGame ? {
        sessionCommission: sessionCommission || updateUser.sessionCommission,
        matchComissionType: matchComissionType || updateUser.matchComissionType,
        matchCommission: matchCommission || updateUser.matchCommission
      } : {})
    }
    let domainData = {};
    let response = {};
    let domain = isOldFairGame ? {domain:oldBetFairDomain} : {};

    if(!isOldFairGame){

    domain = await getDomainDataByUserId(updateUser.id, [
      "id",
      "logo",
      "sidebarColor",
      "footerColor",
      "headerColor",
      "domain",
    ]);
    if (!domain)
      return ErrorResponse(
        { statusCode: 400, message: { msg: "invalidData" } },
        req,
        res
      );

    domainData = {
      logo: logo || domain.logo,
      sidebarColor: sidebarColor || domain.sidebarColor,
      headerColor: headerColor || domain.headerColor,
      footerColor: footerColor || domain.footerColor,
    };
  }

    if (!isOldFairGame) {
      response["domain"] = domainData;
    }
    response["user"] = lodash.pick(updateUser, [
      "fullName",
      "phoneNumber",
      "city",
      "remark",
      (isOldFairGame ? ["sessionCommission",
        "matchComissionType",
        "matchCommission"] : [])
    ]);
    response["id"] = updateUser.id;
    response["isOldFairGame"] = isOldFairGame;

    try {
      await apiCall(
        "post",
        domain.domain + allApiRoutes.updateSuperAdmin,
        response
      );
    } catch (err) {
      return ErrorResponse(err?.response?.data, req, res);
    }
    updateUser = await addUser(updateUser);
    if (!isOldFairGame) {
       await updateDomain(domain.id, domainData);
    }
    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "updated", keys: { name: "User data" } },
        data: response,
      },
      req,
      res
    );
  } catch (err) {
    return ErrorResponse(err, req, res);
  }
};

exports.setExposureLimit = async (req, res, next) => {
  try {
    let { amount, userId, transactionPassword } = req.body;

    let reqUser = req.user || {};

    let user = await getUser({ id: userId, createBy: reqUser.id }, [
      "id",
      "exposureLimit",
      "roleName",
      "isUrl"
    ]);
    if (!user)
      return ErrorResponse(
        { statusCode: 400, message: { msg: "invalidData" } },
        req,
        res
      );

    let domain = user.isUrl ? await getDomainByUserId(userId) : oldBetFairDomain;
    if (!domain)
      return ErrorResponse(
        { statusCode: 400, message: { msg: "invalidData" } },
        req,
        res
      );

    amount = parseInt(amount);
    user.exposureLimit = amount;
    let response = lodash.pick(user, ["id", "exposureLimit"]);

    try {
      await apiCall(
        apiMethod.post,
        domain + allApiRoutes.setExposureLimit,
        response
      );
    } catch (err) {
      return ErrorResponse(err?.response?.data, req, res);
    }

    await addUser(user);

    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "user.ExposurelimitSet" },
        data: {
          user: response,
        },
      },
      req,
      res
    );
  } catch (error) {
    return ErrorResponse(error, req, res);
  }
};

exports.setCreditReferrence = async (req, res, next) => {
  try {
    let { userId, amount, transactionPassword, remark } = req.body;
    let reqUser = req.user || {};
    amount = parseFloat(amount);

    let loginUser = await getUserById(reqUser.id, [
      "id",
      "creditRefrence",
      "downLevelCreditRefrence",
      "roleName",
    ]);
    let user = await getUser({ id: userId, createBy: reqUser.id }, [
      "id",
      "creditRefrence",
      "roleName",
      "isUrl"
    ]);
    if (!user)
      return ErrorResponse(
        { statusCode: 400, message: { msg: "invalidData" } },
        req,
        res
      );
    let domain = user.isUrl ? await getDomainByUserId(userId) : oldBetFairDomain;
    if (!domain)
      return ErrorResponse(
        {
          statusCode: 400,
          message: { msg: "notFound", keys: { name: "Domain data" } },
        },
        req,
        res
      );
    let userBalance = await getUserBalanceDataByUserId(user.id);
    if (!userBalance)
      return ErrorResponse(
        { statusCode: 400, message: { msg: "invalidData" } },
        req,
        res
      );

    let data = {
      amount,
      remark,
      userId,
    };

    try {
      await apiCall(
        apiMethod.post,
        domain + allApiRoutes.setCreditReferrence,
        data
      );
    } catch (err) {
      return ErrorResponse(err?.response?.data, req, res);
    }

    let previousCreditReference = parseFloat(user.creditRefrence);
    let updateData = {
      creditRefrence: amount,
    };

    let profitLoss =
      parseFloat(userBalance.profitLoss) + previousCreditReference - amount;
    let newUserBalanceData = await updateUserBalanceByUserId(user.id, {
      profitLoss,
    });

    let transactionArray = [
      {
        actionBy: reqUser.id,
        searchId: user.id,
        userId: user.id,
        amount: previousCreditReference,
        transType: transType.creditRefer,
        closingBalance: amount,
        description: "CREDIT REFRENCE " + remark,
      },
      {
        actionBy: reqUser.id,
        searchId: reqUser.id,
        userId: user.id,
        amount: previousCreditReference,
        transType: transType.creditRefer,
        closingBalance: amount,
        description: "CREDIT REFRENCE " + remark,
      },
    ];

    const transactioninserted = await insertTransactions(transactionArray);

    let updateLoginUser = {
      downLevelCreditRefrence:
        parseFloat(loginUser.downLevelCreditRefrence) -
        previousCreditReference +
        amount,
    };

    await updateUser(user.id, updateData);
    await updateUser(loginUser.id, updateLoginUser);
    updateData["id"] = user.id;
    //apiCall(apiMethod.post,domain+allApiRoutes.setCreditReferrence,data)
    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "updated", keys: { name: "Credit reference" } },
        data: { updateData },
      },
      req,
      res
    );
  } catch (error) {
    return ErrorResponse(error, req, res);
  }
};

exports.updateUserBalance = async (req, res) => {
  try {
    let { userId, transactionType, amount, transactionPassword, remark } =
      req.body;
    let reqUser = req.user;
    amount = parseFloat(amount);

    let user = await getUser({ id: userId, createBy: reqUser.id }, ["id","isUrl"]);
    if (!user)
      return ErrorResponse(
        { statusCode: 400, message: { msg: "invalidData" } },
        req,
        res
      );

    let domainData = getDomainByUserId(user.id);
    let loginUserBalanceData = getUserBalanceDataByUserId(reqUser.id);
    let insertUserBalanceData = getUserBalanceDataByUserId(user.id);

    let usersBalanceData = await Promise.all([
      loginUserBalanceData,
      insertUserBalanceData,
      domainData,
    ]);
    if (
      !usersBalanceData.length ||
      !usersBalanceData[1] ||
      (!usersBalanceData[2] && user.isUrl)
    )
      return ErrorResponse(
        { statusCode: 400, message: { msg: "invalidData" } },
        req,
        res
      );

    loginUserBalanceData = usersBalanceData[0];
    domainData = user.isUrl ? usersBalanceData[2] : oldBetFairDomain;
    let updatedLoginUserBalanceData = {};
    let updatedUpdateUserBalanceData = {};
    let body = {
      userId: user.id,
      amount,
      transactionType,
      remark,
    };

    if (transactionType == transType.add) {
      if (amount > loginUserBalanceData.currentBalance)
        return ErrorResponse(
          {
            statusCode: 400,
            message: { msg: "userBalance.insufficientBalance" },
          },
          req,
          res
        );
      insertUserBalanceData = usersBalanceData[1];
      updatedUpdateUserBalanceData.currentBalance =
        parseFloat(insertUserBalanceData.currentBalance) + parseFloat(amount);
      updatedUpdateUserBalanceData.profitLoss =
        parseFloat(insertUserBalanceData.profitLoss) + parseFloat(amount);

      if (parseFloat(insertUserBalanceData.myProfitLoss) + parseFloat(amount) > 0) {
        updatedUpdateUserBalanceData.myProfitLoss = 0;
      }
      else {
        updatedUpdateUserBalanceData.myProfitLoss = parseFloat(insertUserBalanceData.myProfitLoss) + parseFloat(amount);
      }

      updatedLoginUserBalanceData.currentBalance =
        parseFloat(loginUserBalanceData.currentBalance) - parseFloat(amount);


    } else if (transactionType == transType.withDraw) {
      insertUserBalanceData = usersBalanceData[1];
      if (amount > insertUserBalanceData.currentBalance)
        return ErrorResponse(
          {
            statusCode: 400,
            message: { msg: "userBalance.insufficientBalance" },
          },
          req,
          res
        );
      updatedUpdateUserBalanceData.currentBalance =
        parseFloat(insertUserBalanceData.currentBalance) - parseFloat(amount);
      updatedUpdateUserBalanceData.profitLoss =
        parseFloat(insertUserBalanceData.profitLoss) - parseFloat(amount);


      if (parseFloat(insertUserBalanceData.myProfitLoss) - parseFloat(amount) < 0) {
        updatedUpdateUserBalanceData.myProfitLoss = 0;
      }
      else {
        updatedUpdateUserBalanceData.myProfitLoss = parseFloat(insertUserBalanceData.myProfitLoss) - parseFloat(amount);
      }

      // let newUserBalanceData = await updateUserBalanceByUserId(user.id, updatedUpdateUserBalanceData)
      updatedLoginUserBalanceData.currentBalance =
        parseFloat(loginUserBalanceData.currentBalance) + parseFloat(amount);
    } else {
      return ErrorResponse(
        { statusCode: 400, message: { msg: "invalidData" } },
        req,
        res
      );
    }

    try {
      await apiCall(
        apiMethod.post,
        domainData + allApiRoutes.updateUserBalance,
        body
      );
    } catch (err) {
      return ErrorResponse(err?.response?.data, req, res);
    }

    let newUserBalanceData = await updateUserBalanceByUserId(
      user.id,
      updatedUpdateUserBalanceData
    );
    let newLoginUserBalanceData = await updateUserBalanceByUserId(
      reqUser.id,
      updatedLoginUserBalanceData
    );

    const parentUserExistRedis = await hasUserInCache(reqUser.id);

    if (parentUserExistRedis) {
        await updateUserDataRedis(reqUser.id, updatedLoginUserBalanceData);
    }

    let transactionArray = [
      {
        actionBy: reqUser.id,
        searchId: user.id,
        userId: user.id,
        amount: transactionType == transType.add ? amount : -amount,
        transType: transactionType,
        closingBalance: updatedUpdateUserBalanceData.currentBalance,
        description: remark,
      },
      {
        actionBy: reqUser.id,
        searchId: reqUser.id,
        userId: user.id,
        amount: transactionType == transType.add ? -amount : amount,
        transType:
          transactionType == transType.add ? transType.withDraw : transType.add,
        closingBalance: updatedLoginUserBalanceData.currentBalance,
        description: remark,
      },
    ];

    const transactioninserted = await insertTransactions(transactionArray);
    updatedUpdateUserBalanceData["id"] = user.id;
    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "updated", keys: { name: "User balance" } },
        data: updatedUpdateUserBalanceData,
      },
      req,
      res
    );
  } catch (error) {
    return ErrorResponse(error, req, res);
  }
};

// Controller function for locking/unlocking a super admin
exports.lockUnlockSuperAdmin = async (req, res, next) => {
  try {
    // Extract relevant data from the request body and user object
    const { userId, betBlock, userBlock } = req.body;
    const { id: loginId } = req.user;

    // Fetch user details of the current user, including block information
    const userDetails = await getUserById(loginId, ["userBlock", "betBlock", "isUrl"]);

    // Fetch details of the user who is performing the block/unblock operation,
    // including the hierarchy and block information
    const blockingUserDetail = await getUserById(userId, [
      "createBy",
      "userBlock",
      "betBlock",
    ]);

    //fetch domain details of user
    const domain = userDetails?.isUrl ? await getDomainByUserId(userId) : oldBetFairDomain;

    // Check if the current user is already blocked
    if (userDetails?.userBlock) {
      throw new Error("user.userBlockError");
    }

    // Check if the block type is 'betBlock' and the user is already bet-blocked
    if (!betBlock && userDetails?.betBlock) {
      throw new Error("user.betBlockError");
    }

    // Check if the user performing the block/unblock operation has the right access
    if (blockingUserDetail?.createBy != loginId) {
      return ErrorResponse(
        {
          statusCode: 403,
          message: { msg: "user.blockCantAccess" },
        },
        req,
        res
      );
    }

    // Check if the user is already blocked or unblocked (prevent redundant operations)
    if (blockingUserDetail?.userBlock != userBlock) {
      // Perform the user block/unblock operation
      const blockedUsers = await userBlockUnblock(userId, loginId, userBlock);
      //   if blocktype is user and its block then user would be logout by socket
      // if (userBlock) {
      //   blockedUsers?.[0]?.forEach((item) => {
      //     forceLogoutUser(item?.id);
      //   });
      // }
    }

    // Check if the user is already bet-blocked or unblocked (prevent redundant operations)
    if (blockingUserDetail?.betBlock != betBlock) {
      // Perform the bet block/unblock operation
      await betBlockUnblock(userId, loginId, betBlock);
    }

    const body = {
      userId,
      loginId,
      betBlock,
      userBlock,
    };

    try {
      await apiCall(
        apiMethod.post,
        domain + allApiRoutes.lockUnlockSuperAdmin,
        body
      );
    } catch (err) {
      return ErrorResponse(err?.response?.data, req, res);
    }

    // Return success response
    return SuccessResponse(
      { statusCode: 200, message: { msg: "user.lock/unlockSuccessfully" } },
      req,
      res
    );
  } catch (error) {
    return ErrorResponse(
      {
        statusCode: 500,
        message: error.message,
      },
      req,
      res
    );
  }
};
exports.changePassword = async (req, res, next) => {
  try {
    // Destructure request body
    const { newPassword, transactionPassword, userId } = req.body;

    const userData = await getUserById(userId, ["id", "isUrl"]);

    let domain = userData?.isUrl ? await getDomainByUserId(userId) : oldBetFairDomain;
    if (!domain)
      return ErrorResponse(
        {
          statusCode: 500,
          message: { msg: "notFound", keys: { name: "Domain" } },
        },
        req,
        res
      );
    // Hash the new password
    const password = bcrypt.hashSync(newPassword, 10);
    let body = {
      password,
      userId,
    };
    try {
      apiCall(apiMethod.post, domain + allApiRoutes.changePassword, body);
    } catch (err) {
      return ErrorResponse(err?.response?.data, req, res);
    }
    // Update loginAt, password, and reset transactionPassword
    await updateUser(userId, {
      loginAt: null,
      password,
      transPassword: null,
    });

    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "auth.passwordChanged" },
      },
      req,
      res
    );
  } catch (error) {
    // Log any errors that occur
    return ErrorResponse(
      {
        statusCode: 500,
        message: error.message,
      },
      req,
      res
    );
  }
};

exports.getPartnershipId = async (req, res, next) => {
  try {
    // Destructure request body
    const { userId } = req.params;

    const partnershipIds = await getParentUsers(userId);

    return SuccessResponse(
      {
        statusCode: 200,
        data: partnershipIds
      },
      req,
      res
    );
  } catch (error) {
    // Log any errors that occur
    return ErrorResponse(
      {
        statusCode: 500,
        message: error.message,
      },
      req,
      res
    );
  }
}

exports.getPlacedBets = async (req, res, next) => {
  try {
    const domainData = await getUserDomainWithFaId();
    let result = [];

    let promiseArray = []

    for (let url of domainData) {
      let promise = apiCall(apiMethod.get, url?.domain + allApiRoutes.bets.placedBet, null, {}, { ...req.query, roleName: req?.user?.roleName, userId: req?.user?.id });
      promiseArray.push(promise);
    }
    await Promise.allSettled(promiseArray)
      .then(results => {
        results.forEach((item) => {
          if (item?.status == "fulfilled") {
            result.push(...item?.value?.data?.rows);
          }
        });
      })
      .catch(error => {
        logger.error({
          error: `Error at get bet for the domain.`,
          stack: error.stack,
          message: error.message,
        });
      });


    return SuccessResponse(
      {
        statusCode: 200,
        data: result,
      },
      req,
      res
    );
  } catch (error) {
    logger.error({
      error: `Error at get bet.`,
      stack: error.stack,
      message: error.message,
    });
    return ErrorResponse(
      {
        statusCode: 500,
        message: error.message,
      },
      req,
      res
    );
  }
}

exports.updateUserBalanceBySA = async (req, res, next) => {
  try {

    const { userId, balance } = req.body;

    await updateUserBalanceByUserId(userId, {
      currentBalance: balance
    });

    return SuccessResponse(
      {
        statusCode: 200,
      },
      req,
      res
    );
  } catch (error) {
    logger.error({
      error: `Error at update super admin balance.`,
      stack: error.stack,
      message: error.message,
    });
    return ErrorResponse(
      {
        statusCode: 500,
        message: error.message,
      },
      req,
      res
    );
  }
}

exports.getUserProfitLoss = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { id,roleName } = req.user;

    const users = await getFirstLevelChildUserWithPartnership(id, partnershipPrefixByRole[roleName] + "Partnership");

    let oldBetFairUserIds = [];
    const userProfitLossData = [];
    for (let element of users) {
      element.partnerShip = element[partnershipPrefixByRole[roleName] + "Partnership"];
      if (element.roleName != userRoleConstant.fairGameAdmin && element.roleName != userRoleConstant.fairGameWallet && !element.isUrl) {
        oldBetFairUserIds.push(element);
      }
      else if (element.roleName != userRoleConstant.fairGameAdmin && element.roleName != userRoleConstant.fairGameWallet) {
        const doaminData =await getDomainByUserId(element.id);

          const response = await apiCall(apiMethod.get, doaminData?.domain + allApiRoutes.userProfitLoss + matchId, null, {}, {
            userIds: JSON.stringify(element),
          })
            .then((data) => data)
            .catch((err) => {
              logger.error({
                context: `error in ${doaminData?.domain} getting user rofit loss`,
                process: `User ID : ${req.user.id} `,
                error: err.message,
                stake: err.stack,
              });
              throw err;
            });

            userProfitLossData.push(...response?.data);
      }
      else {
        const isUserExist=await hasUserInCache(element?.id);
        let currUserProfitLossData={};
  
        if (isUserExist) {
          let betsData = await getUserRedisKeys(element?.id, [redisKeys.userTeamARate + matchId, redisKeys.userTeamBRate + matchId, redisKeys.userTeamCRate + matchId]);
          currUserProfitLossData.teamRateA = betsData?.[0] ? parseFloat(betsData?.[0])?.toFixed(2) : 0;
          currUserProfitLossData.teamRateB = betsData?.[1] ? parseFloat(betsData?.[1])?.toFixed(2) : 0;
          currUserProfitLossData.teamRateC = betsData?.[2] ? parseFloat(betsData?.[2])?.toFixed(2) : 0;

          currUserProfitLossData.percentTeamRateA = betsData?.[0] ? parseFloat(parseFloat(parseFloat(betsData?.[0])?.toFixed(2))*parseFloat(element?.partnerShip)/100).toFixed(2) : 0;
          currUserProfitLossData.percentTeamRateB = betsData?.[1] ? parseFloat(parseFloat(parseFloat(betsData?.[1])?.toFixed(2))*parseFloat(element?.partnerShip)/100).toFixed(2) : 0;
          currUserProfitLossData.percentTeamRateC = betsData?.[2] ? parseFloat(parseFloat(parseFloat(betsData?.[2])?.toFixed(2))*parseFloat(element?.partnerShip)/100).toFixed(2) : 0;
        }
        else {
          let betsData = await settingBetsDataAtLogin(element);
          currUserProfitLossData = {
            teamRateA: betsData?.[redisKeys.userTeamARate + matchId]? parseFloat(betsData?.[redisKeys.userTeamARate + matchId]).toFixed(2) : 0, teamRateB: betsData?.[redisKeys.userTeamBRate + matchId]? parseFloat(betsData?.[redisKeys.userTeamBRate + matchId]).toFixed(2) : 0, teamRateC: betsData?.[redisKeys.userTeamCRate + matchId]? parseFloat(betsData?.[redisKeys.userTeamCRate + matchId]).toFixed(2) : 0,
            percentTeamRateA: betsData?.[redisKeys.userTeamARate + matchId]? parseFloat(parseFloat(parseFloat(betsData?.[redisKeys.userTeamARate + matchId]).toFixed(2))*parseFloat(element.partnerShip)/100).toFixed(2) : 0, percentTeamRateB: betsData?.[redisKeys.userTeamBRate + matchId]? parseFloat(parseFloat(parseFloat(betsData?.[redisKeys.userTeamBRate + matchId]).toFixed(2))*parseFloat(element.partnerShip)/100).toFixed(2) : 0, percentTeamRateC: betsData?.[redisKeys.userTeamCRate + matchId]? parseFloat(parseFloat(parseFloat(betsData?.[redisKeys.userTeamCRate + matchId]).toFixed(2))*parseFloat(element.partnerShip)/100).toFixed(2) : 0
          }
      }
      currUserProfitLossData.userName = element?.userName;
      userProfitLossData.push(currUserProfitLossData);
    };
  }
    if (oldBetFairUserIds?.length > 0) {
      let response = await apiCall(apiMethod.get, oldBetFairDomain + allApiRoutes.userProfitLoss + matchId, null,{}, {
        userIds: oldBetFairUserIds.map((item) => JSON.stringify(item)).join("|")
      })
        .then((data) => data)
        .catch((err) => {
          logger.error({
            context: `error in ${oldBetFairUserIds?.join(",")} getting user list`,
            process: `User ID : ${req.user.id} `,
            error: err.message,
            stake: err.stack,
          });
          throw err;
        });

        userProfitLossData.push(...response?.data);
    }

    return SuccessResponse(
      {
        statusCode: 200,
        data:userProfitLossData
      },
      req,
      res
    );
  } catch (error) {
    logger.error({
      error: `Error at get user profit loss match.`,
      stack: error.stack,
      message: error.message,
    });
    return ErrorResponse(
      {
        statusCode: 500,
        message: error.message,
      },
      req,
      res
    );
  }
}