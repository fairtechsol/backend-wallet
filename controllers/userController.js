const {
  userRoleConstant,
  transType,
  walletDescription,
  blockType,
  lockType,
  fileType,
  expertDomain,
  oldBetFairDomain,
  uplinePartnerShipForAllUsers,
  parmanentDeletePassType,
} = require("../config/contants");
const FileGenerate = require("../utils/generateFile");
const {
  getUserById,
  addUser,
  getUserByUserName,
  updateUser,
  getUser,
  getChildUser,
  getUsers,
  getFirstLevelChildUser,
  getUsersWithUserBalance,
  userBlockUnblock,
  betBlockUnblock,
  getUsersWithUsersBalanceData,
  getUsersWithTotalUsersBalanceData,
  getUserDataWithUserBalance,
  getChildUserBalanceAndData,
  softDeleteAllUsers,
  addUpdateDeleteParmanentDelete,

} = require("../services/userService");
const { ErrorResponse, SuccessResponse } = require("../utils/response");
const { insertTransactions } = require("../services/transactionService");
const bcrypt = require("bcryptjs");
const lodash = require("lodash");
const {
  getUserBalanceDataByUserId,
  getAllchildsCurrentBalanceSum,
  getAllChildProfitLossSum,
  updateUserBalanceByUserId,
  addInitialUserBalance,
  getBalanceSumByRoleName,
} = require("../services/userBalanceService");
const { ILike, In } = require("typeorm");
const {
  getDomainByUserId,
  getUserDomainWithFaId,
  getDomainDataByUserId,
  updateDomain,
} = require("../services/domainDataService");
const {
  calculatePartnership,
  checkUserCreationHierarchy,
  forceLogoutUser,
  getFaAdminDomain,
  forceLogoutIfLogin,
} = require("../services/commonService");
const crypto = require('crypto');
const { apiMethod, apiCall, allApiRoutes } = require("../utils/apiService");
const { logger } = require("../config/logger");
const { commissionReport, commissionMatchReport } = require("../services/commissionService");
const { hasUserInCache, updateUserDataRedis } = require("../services/redis/commonFunctions");
const { constants } = require("buffer");
exports.createUser = async (req, res) => {
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
      matchComissionType,
      sessionCommission,
      matchCommission,
      remark
    } = req.body;
    let reqUser = req.user || {};
    let creator = await getUserById(reqUser.id);
    if (!creator)
      return ErrorResponse(
        { statusCode: 400, message: { msg: "invalidData" } },
        req,
        res
      );

    if (
      creator.roleName != userRoleConstant.fairGameWallet ||
      roleName !== userRoleConstant.fairGameAdmin
    )
      return ErrorResponse(
        { statusCode: 400, message: { msg: "user.invalidRole" } },
        req,
        res
      );

    if (!checkUserCreationHierarchy(creator, roleName))
      return ErrorResponse(
        { statusCode: 400, message: { msg: "user.InvalidHierarchy" } },
        req,
        res
      );
    creator.myPartnership = parseInt(myPartnership);
    userName = userName.toUpperCase();
    let userExist = await getUserByUserName(userName);
    if (userExist)
      return ErrorResponse(
        { statusCode: 400, message: { msg: "user.userExist" } },
        req,
        res
      );
    // if (creator.roleName != userRoleConstant.fairGameWallet) {
    if (exposureLimit && exposureLimit > creator.exposureLimit)
      return ErrorResponse(
        { statusCode: 400, message: { msg: "user.InvalidExposureLimit", keys: { amount: creator.exposureLimit } } },
        req,
        res
      );
    // }
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
      betBlockedBy: creator.betBlockedBy,
      userBlockedBy: creator.userBlockedBy,
      creditRefrence: creditRefrence,
      exposureLimit: exposureLimit,
      maxBetLimit: maxBetLimit,
      minBetLimit: minBetLimit,
      sessionCommission,
      matchComissionType,
      matchCommission,
      remark
    };
    let partnerships = await calculatePartnership(userData, creator);
    userData = { ...userData, ...partnerships };
    let insertUser = await addUser(userData);
    let updateUser = {};
    if (creditRefrence) {
      updateUser = await addUser({
        id: creator.id,
        downLevelCreditRefrence:
          creditRefrence + parseInt(creator.downLevelCreditRefrence),
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
        currentAmount: insertUser.creditRefrence,
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

    let response = lodash.omit(insertUser, ["password", "transPassword"]);
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
    return ErrorResponse(err, req, res);
  }
};
exports.updateUser = async (req, res) => {
  try {
    let { matchComissionType, sessionCommission, matchCommission, id, remark } =
      req.body;
    let reqUser = req.user || {};
    let updateUser = await getUser({ id, createBy: reqUser.id }, [
      "id",
      "createBy",
      "sessionCommission",
      "matchComissionType",
      "matchCommission",
    ]);
    if (!updateUser)
      return ErrorResponse(
        { statusCode: 400, message: { msg: "invalidData" } },
        req,
        res
      );

    updateUser.sessionCommission = sessionCommission ?? updateUser.sessionCommission;
    updateUser.matchCommission = matchCommission ?? updateUser.matchCommission;
    updateUser.matchComissionType =
      matchComissionType || updateUser.matchComissionType;
    updateUser.remark = remark || updateUser.remark;
    updateUser = await addUser(updateUser);
    let response = lodash.pick(updateUser, [
      "id",
      "sessionCommission",
      "matchCommission",
      "matchComissionType",
    ]);
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

exports.isUserExist = async (req, res) => {
  try {
    let { userName } = req.query;
    let isExist = false;

    const isUserExist = await getUserByUserName(userName);
    isExist = Boolean(isUserExist);
    if (isExist) {
      return SuccessResponse({ statusCode: 200, data: { isUserExist: isExist } }, req, res);
    }

    let data = await apiCall(apiMethod.get, expertDomain + allApiRoutes.EXPERTS.isUserExist, null, {}, {
      userName: userName
    }).then((data) => data).catch((err) => {
      logger.error({
        context: `error in expert is user exist`,
        error: err.message,
        stake: err.stack,
      });
      throw err;
    });

    if (data?.data?.isExist) {
      isExist = true;
    }

    return SuccessResponse({ statusCode: 200, data: { isUserExist: isExist } }, req, res);
  }
  catch (err) {
    logger.error({
      message: err.message,
      stake: err.stack
    });
    return ErrorResponse(err, req, res);
  }
}

const generateTransactionPass = () => {
  return crypto.randomInt(0, 999999).toString().padStart(6, '0');
}

// Check old password against the stored password
const checkOldPassword = async (userId, oldPassword) => {
  // Retrieve user's password from the database
  const user = await getUserById(userId, ["password"]);
  if (!user) {
    // User not found, return error response
    throw {
      msg: "notFound",
      keys: { name: "User" },
    };
  }
  // Compare old password with the stored password
  return bcrypt.compareSync(oldPassword, user.password);
};

// Check old transaction password against the stored transaction password
const checkTransactionPassword = async (userId, oldTransactionPass) => {
  // Retrieve user's transaction password from the database
  const user = await getUserById(userId, ["transPassword", "id"]);

  if (!user) {
    // User not found, return error response
    throw {
      msg: "notFound",
      keys: { name: "User" },
    };
  }
  if (!user.transPassword) {
    // User not found, return error response
    throw {
      msg: "TransactionPasswordNotExist"
    };
  }
  // Compare old transaction password with the stored transaction password
  return bcrypt.compareSync(oldTransactionPass, user.transPassword);
};

// API endpoint for changing password
exports.changePassword = async (req, res, next) => {
  try {
    // Destructure request body
    const { oldPassword, newPassword, transactionPassword } = req.body;

    // Hash the new password
    const password = bcrypt.hashSync(newPassword, 10);

    // If user is changing its password after login or logging in for the first time
    if (oldPassword && !transactionPassword) {
      // Check if the old password is correct
      const userId = req.user.id;
      const isPasswordMatch = await checkOldPassword(userId, oldPassword);

      if (!isPasswordMatch) {
        return ErrorResponse(
          {
            statusCode: 403,
            message: { msg: "auth.invalidPass", keys: { type: "old" } },
          },
          req,
          res
        );
      }

      // Retrieve additional user information
      const user = await getUserById(userId, ["loginAt", "roleName"]);

      // Update loginAt and generate new transaction password if conditions are met
      if (user.loginAt == null && user.roleName !== userRoleConstant.user) {
        const generatedTransPass = generateTransactionPass();
        await updateUser(userId, {
          loginAt: new Date(),
          transPassword: bcrypt.hashSync(generatedTransPass, 10),
          password,
        });
        await forceLogoutUser(userId, true);
        return SuccessResponse(
          {
            statusCode: 200,
            message: { msg: "auth.passwordChanged" },
            data: { transactionPassword: generatedTransPass },
          },
          req,
          res
        );
      }

      // Update only the password if conditions are not met
      await updateUser(userId, { loginAt: new Date(), password });
      await forceLogoutUser(userId);

      return SuccessResponse(
        {
          statusCode: 200,
          message: { msg: "auth.passwordChanged" },
        },
        req,
        res
      );
    }
    // if password is changed by parent of users
    const userId = req.body.userId;
    const isPasswordMatch = await checkTransactionPassword(
      req.user.id,
      transactionPassword
    );

    if (!isPasswordMatch) {
      return ErrorResponse(
        {
          statusCode: 403,
          message: { msg: "auth.invalidPass", keys: { type: "transaction" } },
        },
        req,
        res
      );
    }

    // Update loginAt, password, and reset transactionPassword
    await updateUser(userId, {
      loginAt: null,
      password,
      transPassword: null,
    });
    await forceLogoutUser(userId);
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

exports.setExposureLimit = async (req, res, next) => {
  try {
    let { amount, userId, transactionPassword } = req.body;

    let reqUser = req.user || {};
    let loginUser = await getUserById(reqUser.id, [
      "id",
      "exposureLimit",
      "roleName",
    ]);
    if (!loginUser)
      return ErrorResponse(
        { statusCode: 400, message: { msg: "invalidData" } },
        req,
        res
      );


    if (parseFloat(amount) > loginUser.exposureLimit)
      return ErrorResponse({ statusCode: 400, message: { msg: "user.InvalidExposureLimit", keys: { amount: loginUser.exposureLimit } } }, req, res);

    let user = await getUser({ id: userId, createBy: reqUser.id }, [
      "id",
      "exposureLimit",
      "roleName",
    ]);

    if (!user)
      return ErrorResponse(
        { statusCode: 400, message: { msg: "invalidData" } },
        req,
        res
      );

    amount = parseInt(amount);
    user.exposureLimit = amount;
    let childUsers = await getChildUser(user.id);

    childUsers.map(async (childObj) => {
      let childUser = await getUserById(childObj.id);
      if (childUser.exposureLimit > amount || childUser.exposureLimit == 0) {
        childUser.exposureLimit = amount;
        await addUser(childUser);
      }
    });
    await addUser(user);


    const domainData = await getFaAdminDomain(user);

    for (let url of domainData) {
      await apiCall(apiMethod.post, url?.domain + allApiRoutes.checkExposureLimit, { id: userId, exposureLimit: amount, roleName: user.roleName }).then((data) => data).catch((err) => {
        logger.error({
          context: `error in ${url?.domain} exposure limit`,
          process: `User ID : ${user.id} `,
          error: err.message,
          stake: err.stack,
        });
      });

    }
    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "updated", keys: { name: "Exposure limit " } },
        data: {
          user: {
            id: user.id,
            exposureLimit: user.exposureLimit,
          },
        },
      },
      req,
      res
    );
  } catch (error) {
    return ErrorResponse(error, req, res);
  }
};
exports.userList = async (req, res, next) => {
  try {
    let reqUser = req.user;
    // let loginUser = await getUserById(reqUser.id)
    const { type, userId, domain, roleName, ...apiQuery } = req.query;

    if (domain) {
      let response = await apiCall(apiMethod.get, domain + allApiRoutes.userList, null, {}, {
        ...(type ? { type: type } : {}), roleName, userId, ...apiQuery
      })
        .then((data) => data)
        .catch((err) => {
          logger.error({
            context: `error in ${domain} getting user list`,
            process: `User ID : ${req.user.id} `,
            error: err.message,
            stake: err.stack,
          });
          throw err;
        });

      return SuccessResponse(
        {
          statusCode: 200,
          data: response?.data
        },
        req,
        res
      );
    }

    let userRole = roleName || reqUser.roleName;
    let where = {
      createBy: userId || reqUser.id,
    };

    let users = await getUsersWithUsersBalanceData(where, apiQuery);

    let response = {
      count: 0,
      list: [],
    };
    if (!users[1]) {
      return SuccessResponse(
        {
          statusCode: 200,
          message: { msg: "fetched", keys: { name: "User list" } },
          data: response,
        },
        req,
        res
      );
    }
    response.count = users[1];
    let partnershipCol = [];
    if (userRole == userRoleConstant.agent) {
      partnershipCol = [
        "agPartnership",
        "mPartnership",
        "smPartnership",
        "aPartnership",
        "saPartnership",
        "faPartnership",
        "fwPartnership",
      ];
    }
    if (userRole == userRoleConstant.master) {
      partnershipCol = [
        "mPartnership",
        "smPartnership",
        "aPartnership",
        "saPartnership",
        "faPartnership",
        "fwPartnership",
      ];
    }
    if (userRole == userRoleConstant.superMaster) {
      partnershipCol = [
        "smPartnership",
        "aPartnership",
        "saPartnership",
        "faPartnership",
        "fwPartnership",
      ];
    }
    if (userRole == userRoleConstant.admin) {
      partnershipCol = [
        "aPartnership",
        "saPartnership",
        "faPartnership",
        "fwPartnership",
      ];
    }
    if (userRole == userRoleConstant.superAdmin) {
      partnershipCol = ["saPartnership", "faPartnership", "fwPartnership"];
    }
    if (userRole == userRoleConstant.fairGameAdmin) {
      partnershipCol = ["faPartnership", "fwPartnership"];
    }
    if (
      userRole == userRoleConstant.fairGameWallet ||
      userRole == userRoleConstant.expert
    ) {
      partnershipCol = ["fwPartnership"];
    }
    let usersBalance = {};

    let oldBetFairUserIds = [];
    for (let element of users[0]?.filter((item) => item?.roleName != userRoleConstant.user)) {


      if (element?.roleName == userRoleConstant.fairGameAdmin) {
        const faDomains = await getFaAdminDomain(element);
        for (let usersDomain of faDomains) {

          const response = await apiCall(apiMethod.get, usersDomain?.domain + allApiRoutes.userBalanceSum + element.id, null, {}, {
            roleName: element.roleName,

          })
            .then((data) => data)
            .catch((err) => {
              logger.error({
                context: `error in ${usersDomain?.domain} getting user list`,
                process: `User ID : ${req.user.id} `,
                error: err.message,
                stake: err.stack,
              });
              throw err;
            });

          usersBalance[element.id] = (usersBalance[element.id] || 0) + parseFloat(response?.data?.balance[element.id] || 0);
        };

      }
      else {
        if (!element.isUrl && element.roleName != userRoleConstant.fairGameAdmin && element.roleName != userRoleConstant.fairGameWallet) {
          oldBetFairUserIds.push(element.id);
        }
        else {
          const userDomain = await getDomainDataByUserId(element.id, ["domain"]);
          let response = await apiCall(apiMethod.get, userDomain?.domain + allApiRoutes.userBalanceSum + element.id, null, {}, {
            roleName: element.roleName
          })
            .then((data) => data)
            .catch((err) => {
              logger.error({
                context: `error in ${userDomain?.domain} getting user list`,
                process: `User ID : ${req.user.id} `,
                error: err.message,
                stake: err.stack,
              });
              throw err;
            });

          usersBalance[element.id] = (usersBalance[element.id] || 0) + parseFloat(response?.data?.balance[element.id] || 0);
        }
      }
    };

    if (oldBetFairUserIds?.length > 0) {
      let response = await apiCall(apiMethod.get, oldBetFairDomain + allApiRoutes.userBalanceSum + oldBetFairUserIds?.join(","), null, {})
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

      usersBalance = { ...usersBalance, ...(response?.data?.balance ?? {}) };
    }

    let data = await Promise.all(
      users[0].map(async (element) => {

        if (!element.isUrl && element.roleName != userRoleConstant.fairGameAdmin && element.roleName != userRoleConstant.fairGameWallet) {
          element.domain = oldBetFairDomain;
        }
        else {
          element.domain = element?.domainData?.domain;
        }

        element["percentProfitLoss"] = element.userBal["myProfitLoss"];
        let partner_ships = 100;
        if (partnershipCol && partnershipCol.length) {
          partner_ships = partnershipCol.reduce((partialSum, a) => partialSum + element[a], 0);
          element["percentProfitLoss"] = ((element.userBal["profitLoss"] / 100) * partner_ships).toFixed(2);
        }
        if (element.roleName != userRoleConstant.user) {
          element["availableBalance"] = Number(parseFloat(element.userBal["currentBalance"]).toFixed(2));
          //  - Number(parseFloat(element.userBal["exposure"]).toFixed(2));

          if (element.roleName == userRoleConstant.fairGameAdmin) {
            element["balance"] = Number((parseFloat(element.userBal["currentBalance"] || 0) + parseFloat(usersBalance[element.id] || 0)).toFixed(2));
          }
          else {
            element["balance"] = Number((parseFloat(usersBalance[element.id] || 0)).toFixed(2));
          }
        } else {
          element["availableBalance"] = Number((parseFloat(element.userBal["currentBalance"]) - element.userBal["exposure"]).toFixed(2));
          element["balance"] = Number((parseFloat(element.userBal["currentBalance"])));
        }
        element["percentProfitLoss"] = element.userBal["myProfitLoss"];
        element["commission"] = element?.userBal?.["totalCommission"];
        if (partnershipCol && partnershipCol.length) {
          let partnerShips = partnershipCol.reduce((partialSum, a) => partialSum + element[a], 0);
          element["percentProfitLoss"] = ((element.userBal["profitLoss"] / 100) * partnerShips).toFixed(2);
          element["commission"] = (element?.userBal?.["totalCommission"]).toFixed(2) + "(" + partnerShips + "%)";
          element['upLinePartnership'] = partnerShips;
        }

        return element;
      })
    );

    if (type) {
      const header = [
        { excelHeader: "User Name", dbKey: "userName" },
        { excelHeader: "Role", dbKey: "roleName" },
        { excelHeader: "Credit Ref", dbKey: "creditRefrence" },
        { excelHeader: "Balance", dbKey: "balance" },
        { excelHeader: "Client P/L", dbKey: "userBal.profitLoss" },
        { excelHeader: "% P/L", dbKey: "percentProfitLoss" },
        { excelHeader: "Comission", dbKey: "commission" },
        { excelHeader: "Exposure", dbKey: "userBal.exposure" },
        { excelHeader: "Available Balance", dbKey: "availableBalance" },
        { excelHeader: "UL", dbKey: "userBlock" },
        { excelHeader: "BL", dbKey: "betBlock" },
        { excelHeader: "S Com %", dbKey: "sessionCommission" },
        { excelHeader: "Match Com Type", dbKey: "matchComissionType" },
        { excelHeader: "M Com %", dbKey: "matchCommission" },
        { excelHeader: "Exposure Limit", dbKey: "exposureLimit" },
        ...(type == fileType.excel
          ? [
            {
              excelHeader: "FairGameWallet Partnership",
              dbKey: "fwPartnership",
            },
            {
              excelHeader: "FairGameAdmin Partnership",
              dbKey: "faPartnership",
            },
            { excelHeader: "SuperAdmin Partnership", dbKey: "saPartnership" },
            { excelHeader: "Admin Partnership", dbKey: "aPartnership" },
            {
              excelHeader: "SuperMaster Partnership",
              dbKey: "smPartnership",
            },
            { excelHeader: "Master Partnership", dbKey: "mPartnership" },
            { excelHeader: "Agent Partnership", dbKey: "agPartnership" },
            { excelHeader: "Full Name", dbKey: "fullName" },
            { excelHeader: "City", dbKey: "city" },
            { excelHeader: "Phone Number", dbKey: "phoneNumber" },
          ]
          : []),
      ];

      const total = data?.reduce((prev, curr) => {
        prev["creditRefrence"] = (prev["creditRefrence"] || 0) + (curr["creditRefrence"] || 0);
        prev["balance"] = (prev["balance"] || 0) + (curr["balance"] || 0);
        prev["availableBalance"] = (prev["availableBalance"] || 0) + (curr["availableBalance"] || 0);

        if (prev["userBal"]) {
          prev["userBal"] = {
            profitLoss: (prev["userBal"]["profitLoss"] || 0) + (curr["userBal"]["profitLoss"] || 0),
            exposure: (prev["userBal"]["exposure"] || 0) + (curr["userBal"]["exposure"] || 0)
          }
        }
        else {
          prev["userBal"] = {
            profitLoss: (curr["userBal"]["profitLoss"] || 0),
            exposure: (curr["userBal"]["exposure"] || 0),
          }
        }
        return prev
      }, {});
      data?.unshift(total);

      const fileGenerate = new FileGenerate(type);
      const file = await fileGenerate.generateReport(data, header, "Client List Report");
      const fileName = `accountList_${new Date()}`;

      return SuccessResponse(
        {
          statusCode: 200,
          message: { msg: "user.userList" },
          data: { file: file, fileName: fileName },
        },
        req,
        res
      );
    }

    response.list = data;

    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "fetched", keys: { name: "User list" } },
        data: response,
      },
      req,
      res
    );
  } catch (error) {
    return ErrorResponse(error, req, res);
  }
};

exports.getTotalUserListBalance = async (req, res, next) => {
  try {

    let reqUser = req.user;
    // let loginUser = await getUserById(reqUser.id)
    const { type, userId, domain, roleName, ...apiQuery } = req.query;

    if (domain) {
      let response = await apiCall(apiMethod.get, domain + allApiRoutes.userTotalBalance, null, {}, {
        ...(type ? { type: type } : {}), roleName, userId, ...apiQuery
      })
        .then((data) => data)
        .catch((err) => {
          logger.error({
            context: `error in ${domain} getting user list`,
            process: `User ID : ${req.user.id} `,
            error: err.message,
            stake: err.stack,
          });
          throw err;
        });

      return SuccessResponse(
        {
          statusCode: 200,
          data: response?.data
        },
        req,
        res
      );
    }

    let userRole = roleName || reqUser.roleName;
    let where = {
      createBy: userId || reqUser.id,
    };

    let queryColumns = `SUM(user.creditRefrence) as "totalCreditReference", SUM(UB.profitLoss) as profitSum, SUM(UB.currentBalance) as "availableBalance",SUM(UB.downLevelBalance) as "downLevelBalance", SUM(UB.exposure) as "totalExposure",SUM(CASE WHEN user.roleName = 'user' THEN UB.exposure ELSE 0 END) as "totalExposureOnlyUser", SUM(UB.totalCommission) as totalCommission`;

    switch (userRole) {
      case (userRoleConstant.fairGameWallet):
      case (userRoleConstant.expert): {
        queryColumns = queryColumns + `, ROUND(SUM(UB.profitLoss / 100 * (user.fwPartnership)), 2) as percentProfitLoss`;
        break;
      }
      case (userRoleConstant.fairGameAdmin): {
        queryColumns = queryColumns + `, ROUND(SUM(UB.profitLoss / 100 * (user.faPartnership + user.fwPartnership)), 2) as percentProfitLoss`;
        break;
      }
      case (userRoleConstant.superAdmin): {
        queryColumns = queryColumns + `, ROUND(SUM(UB.profitLoss / 100 * (user.saPartnership + user.faPartnership + user.fwPartnership )), 2) as percentProfitLoss`;
        break;
      }
      case (userRoleConstant.admin): {
        queryColumns = queryColumns + `, ROUND(SUM(UB.profitLoss / 100 * (user.aPartnership + user.saPartnership + user.faPartnership + user.fwPartnership )), 2) as percentProfitLoss`;
        break;
      }
      case (userRoleConstant.superMaster): {
        queryColumns = queryColumns + `, ROUND(SUM(UB.profitLoss / 100 * (user.smPartnership + user.aPartnership + user.saPartnership + user.faPartnership + user.fwPartnership )), 2) as percentProfitLoss`;
        break;
      }
      case (userRoleConstant.master): {
        queryColumns = queryColumns + `, ROUND(SUM(UB.profitLoss / 100 * (user.mPartnership + user.smPartnership + user.aPartnership + user.saPartnership + user.faPartnership + user.fwPartnership )), 2) as percentProfitLoss`;
        break;
      }
      case (userRoleConstant.agent): {
        queryColumns = queryColumns + `, ROUND(SUM(UB.profitLoss / 100 * (user.agPartnership + user.mPartnership + user.smPartnership + user.aPartnership + user.saPartnership + user.faPartnership + user.fwPartnership )), 2) as percentProfitLoss`;
        break;
      }
    }
    let totalCurrentBalance = 0;

    if (userRole == userRoleConstant.fairGameWallet) {
      const fgAdminBalanceSum = await getBalanceSumByRoleName(userRoleConstant.fairGameAdmin);
      totalCurrentBalance += parseFloat(parseFloat(fgAdminBalanceSum?.balance).toFixed(2));
      let domainData = await getUserDomainWithFaId();

      for (let usersDomain of domainData) {
        const response = await apiCall(apiMethod.get, usersDomain?.domain + allApiRoutes.userBalanceSum + where.createBy, null, {}, {
          roleName: userRole,

        })
          .then((data) => data)
          .catch((err) => {
            logger.error({
              context: `error in ${usersDomain?.domain} getting user list`,
              process: `User ID : ${req.user.id} `,
              error: err.message,
              stake: err.stack,
            });
            throw err;
          });

        totalCurrentBalance = (totalCurrentBalance || 0) + parseFloat(response?.data?.balance[where.createBy] || 0);
      }

    }
    else if (userRole == userRoleConstant.fairGameAdmin) {
      const faDomains = await getFaAdminDomain({ id: where.createBy });
      for (let usersDomain of faDomains) {

        const response = await apiCall(apiMethod.get, usersDomain?.domain + allApiRoutes.userBalanceSum + where.createBy, null, {}, {
          roleName: userRole,

        })
          .then((data) => data)
          .catch((err) => {
            logger.error({
              context: `error in ${usersDomain?.domain} getting user list`,
              process: `User ID : ${req.user.id} `,
              error: err.message,
              stake: err.stack,
            });
            throw err;
          });

        totalCurrentBalance = (totalCurrentBalance || 0) + parseFloat(response?.data?.balance[where.createBy] || 0);
      };

    }

    // const userTotalBalance = await getUserBalanceDataByUserId(where.createBy, ["currentBalance"]);

    const totalBalance = await getUsersWithTotalUsersBalanceData(where, apiQuery, queryColumns);
    totalBalance.currBalance = totalCurrentBalance;
    totalBalance.availableBalance = parseFloat(totalBalance.availableBalance || 0) - parseFloat(totalBalance.totalExposureOnlyUser || 0);

    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "fetched", keys: { name: "User list" } },
        data: totalBalance,
      },
      req,
      res
    );
  } catch (error) {
    logger.error({
      message: "Error in user list total balance.",
      context: error.message,
      stake: error.stack
    });
    return ErrorResponse(error, req, res);
  }
}

exports.userSearchList = async (req, res, next) => {
  try {
    let { userName, createdBy, isUser } = req.query;
    if (!userName || userName.length < 0) {
      return SuccessResponse(
        {
          statusCode: 200,
          message: { msg: "fetched", keys: { name: "User list" } },
          data: { users: [], count: 0 },
        },
        req,
        res
      );
    }
    let where = {};
    if (userName) { where.userName = ILike(`%${userName}%`); }
    if (createdBy) { where.createdBy = createdBy; }
    else {
      const childIds = await getChildUser(req.user.id);
      where.id = In(childIds?.map((item) => item.id));
      where.roleName = In([userRoleConstant.fairGameAdmin, userRoleConstant.fairGameWallet])
    }
    let response;
    if (!isUser) {
      let users = await getUsers(where, ["id", "userName"]);
      response = {
        users: (users[0] || []),
        count: (users[1] || 0),
      };
    }
    else {
      response = {
        users: [],
        count: 0,
      };
    }

    const faDomains = req.user.roleName == userRoleConstant.fairGameAdmin ? await getFaAdminDomain(req.user) : await getUserDomainWithFaId();
    for (let usersDomain of faDomains) {
      let data = await apiCall(apiMethod.get, usersDomain?.domain + allApiRoutes.getSearchList, null, {}, { id: req.user.id, roleName: req.user.roleName, userName: userName, isUser: isUser })
        .then((data) => data)
        .catch((err) => {
          logger.error({
            context: `error in ${usersDomain?.domain} checking deleting user balance`,
            process: `User ID : ${req.user.id} `,
            error: err.message,
            stake: err.stack,
          });
          throw err?.response?.data;
        });

      response?.users?.push(...(data?.data?.map((item) => {
        return { ...item, domain: usersDomain.domain };
      }) || []));
      response.count += (data?.data?.length || 0);
    };

    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "fetched", keys: { name: "User list" } },
        data: response,
      },
      req,
      res
    );
  } catch (error) {
    return ErrorResponse(error, req, res);
  }
};

exports.userBalanceDetails = async (req, res, next) => {
  try {
    // Retrieve user information from the request
    const { user: reqUser } = req;
    const userId = req.query?.id || reqUser?.id;

    // Fetch details of the logged-in user
    const loginUser = await getUserById(userId);

    // Ensure the user exists and matches the logged-in user
    if (!loginUser || userId !== loginUser.id) {
      return ErrorResponse(
        {
          statusCode: 400,
          message: { msg: "notFound", keys: { name: "User" } }
        },
        req,
        res
      );
    }

    // Retrieve first-level child users and their IDs
    const firstLevelChildUsers = await getFirstLevelChildUser(loginUser.id);
    const firstLevelChildUserIds = firstLevelChildUsers.map(user => user.id);

    // Fetch user balance data
    const userBalanceData = getUserBalanceDataByUserId(loginUser.id, ["id", "currentBalance", "profitLoss", "myProfitLoss"]);

    // Fetch profit/loss sum for first-level child users
    const firstLevelChildBalanceData = getAllChildProfitLossSum(firstLevelChildUserIds, reqUser?.roleName);

    let totalCurrentBalance = 0;

    if (loginUser.roleName == userRoleConstant.fairGameWallet) {
      const fgAdminBalanceSum = await getBalanceSumByRoleName(userRoleConstant.fairGameAdmin);
      totalCurrentBalance += parseFloat(parseFloat(fgAdminBalanceSum?.balance).toFixed(2));
      let domainData = await getUserDomainWithFaId();

      for (let usersDomain of domainData) {
        const response = await apiCall(apiMethod.get, usersDomain?.domain + allApiRoutes.userBalanceSum + loginUser.id, null, {}, {
          roleName: loginUser.roleName,

        })
          .then((data) => data)
          .catch((err) => {
            logger.error({
              context: `error in ${usersDomain?.domain} getting user list`,
              process: `User ID : ${req.user.id} `,
              error: err.message,
              stake: err.stack,
            });
            throw err;
          });

        totalCurrentBalance = (totalCurrentBalance || 0) + parseFloat(response?.data?.balance[loginUser.id] || 0);
      }

    }
    else if (loginUser.roleName == userRoleConstant.fairGameAdmin) {
      const faDomains = await getFaAdminDomain({ id: loginUser.id });
      for (let usersDomain of faDomains) {

        const response = await apiCall(apiMethod.get, usersDomain?.domain + allApiRoutes.userBalanceSum + loginUser.id, null, {}, {
          roleName: loginUser.roleName,

        })
          .then((data) => data)
          .catch((err) => {
            logger.error({
              context: `error in ${usersDomain?.domain} getting user list`,
              process: `User ID : ${req.user.id} `,
              error: err.message,
              stake: err.stack,
            });
            throw err;
          });

        totalCurrentBalance = (totalCurrentBalance || 0) + parseFloat(response?.data?.balance[loginUser.id] || 0);
      };

    }

    // Wait for all promises to settle
    const [userBalance, firstLevelChildBalance] = await Promise.allSettled([userBalanceData, firstLevelChildBalanceData]);

    // Calculate various balance-related metrics
    const response = {
      userCreditReference: parseFloat(loginUser?.creditRefrence),
      downLevelOccupyBalance: parseFloat(totalCurrentBalance || 0),
      downLevelCreditReference: loginUser?.downLevelCreditRefrence,
      availableBalance: parseFloat(userBalance?.value?.currentBalance || 0),
      totalMasterBalance: parseFloat(userBalance?.value?.currentBalance || 0) + parseFloat(totalCurrentBalance || 0),
      upperLevelBalance: -parseFloat((parseFloat(userBalance?.value?.profitLoss) * parseFloat(uplinePartnerShipForAllUsers[loginUser.roleName]?.reduce((prev, curr) => {
        return (parseFloat(loginUser[`${curr}Partnership`]) + prev);
      }, 0)) / 100).toFixed(2)),
      downLevelProfitLoss: -parseFloat((parseFloat(firstLevelChildBalance?.value?.firstlevelchildsprofitlosssum || 0) + parseFloat((parseFloat(firstLevelChildBalance?.value?.profitLoss) * parseFloat(uplinePartnerShipForAllUsers[loginUser.roleName]?.reduce((prev, curr) => {
        return (parseFloat(loginUser[`${curr}Partnership`]) + prev);
      }, 0)) / 100).toFixed(2))).toFixed(2)),
      availableBalanceWithProfitLoss: ((parseFloat(userBalance?.value?.currentBalance || 0) + parseFloat(-firstLevelChildBalance?.value?.firstlevelchildsprofitlosssum || 0))),
      profitLoss: -firstLevelChildBalance?.value?.firstlevelchildsprofitlosssum || 0,
      totalProfitLossUpperlevel: parseFloat(userBalance?.value?.profitLoss || 0),
      totalProfitLossDownlevel: parseFloat(firstLevelChildBalance?.value?.profitLoss),
      upperLevelProfitLossPercent: parseFloat(uplinePartnerShipForAllUsers[loginUser.roleName]?.reduce((prev, curr) => {
        return (parseFloat(loginUser[`${curr}Partnership`]) + prev);
      }, 0))
    };

    // Send success response
    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "user.UserBalanceFetchSuccessfully" },
        data: { response },
      },
      req,
      res
    );
  } catch (error) {
    // Handle errors and send error response
    return ErrorResponse(error, req, res);
  }
};

exports.setCreditReferrence = async (req, res, next) => {
  try {
    let { userId, amount, transactionPassword, remark } = req.body;
    let reqUser = req.user;
    amount = parseFloat(amount);

    let loginUser = await getUserById(reqUser.id, [
      "id",
      "creditRefrence",
      "downLevelCreditRefrence",
      "roleName",
    ]);
    if (!loginUser)
      return ErrorResponse(
        {
          statusCode: 400,
          message: { msg: "notFound", keys: { name: "Login user" } },
        },
        req,
        res
      );

    let user = await getUser({ id: userId, createBy: reqUser.id }, [
      "id",
      "creditRefrence",
      "roleName",
    ]);
    if (!user)
      return ErrorResponse(
        {
          statusCode: 400,
          message: { msg: "notFound", keys: { name: "User" } },
        },
        req,
        res
      );

    let userBalance = await getUserBalanceDataByUserId(user.id);
    if (!userBalance)
      return ErrorResponse(
        {
          statusCode: 400,
          message: { msg: "notFound", keys: { name: "User balance" } },
        },
        req,
        res
      );

    let previousCreditReference = parseFloat(user.creditRefrence);
    let updateData = {
      creditRefrence: amount,
    };

    let profitLoss =
      parseFloat(userBalance.profitLoss) + previousCreditReference - amount;
    let newUserBalanceData = await updateUserBalanceByUserId(user.id, {
      profitLoss,
    });

    const userExistRedis = await hasUserInCache(user.id);

    if (userExistRedis) {

      await updateUserDataRedis(user.id, { profitLoss });
    }

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
        parseInt(loginUser.downLevelCreditRefrence) -
        previousCreditReference +
        amount,
    };
    await updateUser(user.id, updateData);
    await updateUser(loginUser.id, updateLoginUser);
    updateData["id"] = user.id;
    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "updated", keys: { name: "Credit reference" } },
        data: updateData,
      },
      req,
      res
    );
  } catch (error) {
    return ErrorResponse(error, req, res);
  }
};

// Controller function for locking/unlocking a user
exports.lockUnlockUser = async (req, res, next) => {
  try {
    // Extract relevant data from the request body and user object
    const { userId, betBlock, userBlock } = req.body;
    const { id: loginId } = req.user;
    // Fetch user details of the current user, including block information
    const select = ["userBlock", "betBlock", "roleName"];

    const userDetails = await getUserById(loginId, select);
    // update select 
    select.push("createBy")
    // Fetch details of the user who is performing the block/unblock operation,
    // including the hierarchy and block information
    const blockingUserDetail = await getUserById(userId, select);

    if (
      userDetails?.userBlock &&
      blockingUserDetail.roleName != userRoleConstant.fairGameWallet &&
      userDetails.roleName != userRoleConstant.fairGameWallet
    ) {
      throw new Error("user.userBlockError");
    }

    // Check if the block type is 'betBlock' and the user is already bet-blocked
    if (
      !betBlock &&
      userDetails?.betBlock &&
      blockingUserDetail.roleName != userRoleConstant.fairGameWallet &&
      userDetails.roleName != userRoleConstant.fairGameWallet
    ) {
      throw new Error("user.betBlockError");
    }

    // Check if the user performing the block/unblock operation has the right access
    if (
      blockingUserDetail?.createBy != loginId &&
      blockingUserDetail.roleName != userRoleConstant.fairGameWallet &&
      userDetails.roleName != userRoleConstant.fairGameWallet
    ) {
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
      await performBlockOperation(lockType.user, userId, loginId, userBlock)
    }

    // Check if the user is already bet-blocked or unblocked (prevent redundant operations)
    if (blockingUserDetail?.betBlock != betBlock) {
      await performBlockOperation(lockType.bet, userId, loginId, betBlock)

    }

    // Return success response
    return SuccessResponse(
      { statusCode: 200, message: { msg: "user.lock/unlockSuccessfully" } },
      req,
      res
    );
  } catch (error) {
    return ErrorResponse(error, req, res);
  }
};


exports.generateTransactionPassword = async (req, res) => {
  const { id } = req.user;
  const { transactionPassword } = req.body;

  const encryptTransPass = bcrypt.hashSync(transactionPassword, 10);
  await updateUser(id, {
    transPassword: encryptTransPass,
  });

  return SuccessResponse(
    {
      statusCode: 200,
      message: {
        msg: "updated",
        keys: { name: "Transaction Password" },
      },
    },
    req,
    res
  );
};

exports.getProfile = async (req, res) => {
  let reqUser = req.user || {};
  let userId = reqUser?.id;
  if (req.query?.userId) {
    userId = req.query.userId;
  }
  let where = {
    id: userId,
  };
  let user = await getUsersWithUserBalance(where);
  let response = lodash.omit(user, ["password", "transPassword"]);
  return SuccessResponse(
    { statusCode: 200, message: { msg: "user.profile" }, data: response },
    req,
    res
  );
};

exports.getTotalProfitLoss = async (req, res) => {
  try {
    const { roleName } = req.user;
    let { startDate, endDate, id } = req.query;
    let domainData;
    let where = {};

    if (roleName == userRoleConstant.fairGameAdmin) {
      domainData = await getFaAdminDomain(req.user, null, where);
    }
    else {
      domainData = await getUserDomainWithFaId(where);
    }

    let profitLoss = [];
    let newUserTemp = JSON.parse(JSON.stringify(req.user));
    if (roleName === userRoleConstant.fairGameWallet && id) {
      id = await updateNewUserTemp(newUserTemp, id)
    }

    for (let url of domainData) {
      let data = await apiCall(apiMethod.post, url?.domain + allApiRoutes.profitLoss, {
        user: newUserTemp, startDate: startDate, endDate: endDate, searchId: id
      }, {})
        .then((data) => data)
        .catch((err) => {
          logger.error({
            context: `error in ${url?.domain} getting profitloss`,
            process: `User ID : ${req.user.id} `,
            error: err.message,
            stake: err.stack,
          });
          throw err;
        });

      profitLoss.push(...(data?.data || []));
    }

    const resultArray = Object.values(profitLoss.reduce((accumulator, currentValue) => {
      const eventType = currentValue.eventType;

      accumulator[eventType] = accumulator[eventType] || {
        eventType,
        totalLoss: 0,
        totalBet: 0,
        totalDeduction: 0
      };

      accumulator[eventType].totalLoss += parseFloat(currentValue.totalLoss);
      accumulator[eventType].totalBet += parseFloat(currentValue.totalBet);
      accumulator[eventType].totalDeduction += parseFloat(currentValue.totalDeduction);
      // accumulator[eventType].domainData.push(currentValue);

      return accumulator;
    }, {}));

    return SuccessResponse(
      { statusCode: 200, data: resultArray },
      req,
      res
    );

  } catch (error) {
    logger.error({
      context: `error in get total profit loss`,
      error: error.message,
      stake: error.stack,
    });
    return ErrorResponse(error, req, res);
  }
};

exports.getDomainProfitLoss = async (req, res) => {
  try {
    let { startDate, endDate, type, id, isRacing } = req.query;

    let domainData;
    let where = {};

    if (req.user.roleName == userRoleConstant.fairGameAdmin) {
      domainData = await getFaAdminDomain(req.user, null, where);
    }
    else {
      domainData = await getUserDomainWithFaId(where);
    }

    let profitLoss = {};
    let newUserTemp = JSON.parse(JSON.stringify(req.user));
    if (req.user.roleName === userRoleConstant.fairGameWallet && id) {

      id = await updateNewUserTemp(newUserTemp, id)
    }

    for (let url of domainData) {
      let data = await apiCall(apiMethod.post, url?.domain + allApiRoutes.matchWiseProfitLoss, { user: newUserTemp, startDate: startDate, endDate: endDate, type: type, searchId: id, isRacing: isRacing }, {})
        .then((data) => data)
        .catch((err) => {
          logger.error({
            context: `error in ${url?.domain} getting profit loss for specific domain.`,
            process: `User ID : ${req.user.id} `,
            error: err.message,
            stake: err.stack,
          });
          throw err;
        });
      data?.data?.result?.forEach((item) => {
        if (profitLoss[item?.matchId]) {
          profitLoss[item?.matchId] = {
            ...profitLoss[item?.matchId],
            rateProfitLoss: parseFloat((parseFloat(item?.rateProfitLoss) + parseFloat(profitLoss?.[item?.matchId]?.rateProfitLoss)).toFixed(2)),
            sessionProfitLoss: parseFloat((parseFloat(item?.sessionProfitLoss) + parseFloat(profitLoss?.[item?.matchId]?.sessionProfitLoss)).toFixed(2)),
            totalBet: parseFloat((parseFloat(item?.totalBet) + parseFloat(profitLoss?.[item?.matchId]?.totalBet)).toFixed(2)),
            totalDeduction: parseFloat((parseFloat(item?.totalDeduction) + parseFloat(profitLoss?.[item?.matchId]?.totalDeduction)).toFixed(2)),
          }
        }
        else {
          profitLoss[item?.matchId] = item;
        }
      });
    }


    return SuccessResponse(
      { statusCode: 200, data: Object.values(profitLoss)?.sort((a, b) => new Date(b.startAt) - new Date(a.startAt)) },
      req,
      res
    );

  } catch (error) {
    logger.error({
      context: `error in get total domain wise profit loss`,
      error: error.message,
      stake: error.stack,
    });
    return ErrorResponse(error, req, res);
  }
}

exports.getResultBetProfitLoss = async (req, res) => {
  try {
    let { matchId, betId, isSession, url, id, userId, roleName } = req.query;
    let data = [];

    let newUserTemp = JSON.parse(JSON.stringify(req.user||{}));
    if (req.user?.roleName === userRoleConstant.fairGameWallet && id) {
      id = await updateNewUserTemp(newUserTemp, id)
    }
    newUserTemp.roleName = roleName || newUserTemp.roleName;
    newUserTemp.id = userId || newUserTemp.id;
    if (url) {

      let response = await apiCall(apiMethod.post, url + allApiRoutes.betWiseProfitLoss, { user: newUserTemp, matchId: matchId, betId: betId, isSession: isSession == 'true', searchId: userId || id, partnerShipRoleName: req.user?.roleName || userRoleConstant.fairGameWallet }, {})
        .then((data) => data)
        .catch((err) => {
          logger.error({
            context: `error in ${url} getting profit loss for all bets.`,
            process: `User ID : ${req.user.id} `,
            error: err.message,
            stake: err.stack,
          });
          throw err;
        });

      data = response?.data;
    }
    else {
      let domainData;
      let where = {};

      if (req.user.roleName == userRoleConstant.fairGameAdmin) {
        domainData = await getFaAdminDomain(req.user, null, where);
      }
      else {
        domainData = await getUserDomainWithFaId(where);
      }

      for (let domain of domainData) {
        let response = await apiCall(apiMethod.post, domain?.domain + allApiRoutes.betWiseProfitLoss, { user: newUserTemp, matchId: matchId, betId: betId, isSession: isSession == 'true', searchId: id, partnerShipRoleName: req.user.roleName }, {})
          .then((data) => data)
          .catch((err) => {
            logger.error({
              context: `error in ${domain?.domain} getting profit loss for all bets.`,
              process: `User ID : ${req.user.id} `,
              error: err.message,
              stake: err.stack,
            });
            throw err;
          });

        data?.push(...response?.data);
      }
    }
    return SuccessResponse(
      { statusCode: 200, data: data },
      req,
      res
    );

  } catch (error) {
    logger.error({
      context: `error in get all bets profit loss`,
      error: error.message,
      stake: error.stack,
    });
    return ErrorResponse(error, req, res);
  }
}

exports.getCardTotalProfitLoss = async (req, res) => {
  try {
    const { roleName } = req.user;
    let { startDate, endDate, id } = req.query;
    let domainData;
    let where = {};

    if (roleName == userRoleConstant.fairGameAdmin) {
      domainData = await getFaAdminDomain(req.user, null, where);
    }
    else {
      domainData = await getUserDomainWithFaId(where);
    }

    let profitLoss = [];
    let newUserTemp = JSON.parse(JSON.stringify(req.user));
    if (roleName === userRoleConstant.fairGameWallet && id) {
      id = await updateNewUserTemp(newUserTemp, id)
    }

    for (let url of domainData) {
      let data = await apiCall(apiMethod.post, url?.domain + allApiRoutes.cardProfitLoss, {
        user: newUserTemp, startDate: startDate, endDate: endDate, searchId: id
      }, {})
        .then((data) => data)
        .catch((err) => {
          logger.error({
            context: `error in ${url?.domain} getting profitloss`,
            process: `User ID : ${req.user.id} `,
            error: err.message,
            stake: err.stack,
          });
          throw err;
        });

      profitLoss.push(...(data?.data || []));
    }

    const resultArray = Object.values(profitLoss.reduce((accumulator, currentValue) => {
      const matchId = currentValue.matchId;

      accumulator[matchId] = accumulator[matchId] || {
        ...currentValue,
        totalLoss: 0,
        totalBet: 0,
      };

      accumulator[matchId].totalLoss += parseFloat(currentValue.totalLoss);
      accumulator[matchId].totalBet += parseFloat(currentValue.totalBet);

      return accumulator;
    }, {}));

    return SuccessResponse(
      { statusCode: 200, data: resultArray },
      req,
      res
    );

  } catch (error) {
    logger.error({
      context: `error in get total profit loss`,
      error: error.message,
      stake: error.stack,
    });
    return ErrorResponse(error, req, res);
  }
};

exports.getCardDomainProfitLoss = async (req, res) => {
  try {
    let { startDate, endDate, id, matchId } = req.query;

    let domainData;
    let where = {};

    if (req.user.roleName == userRoleConstant.fairGameAdmin) {
      domainData = await getFaAdminDomain(req.user, null, where);
    }
    else {
      domainData = await getUserDomainWithFaId(where);
    }

    let profitLoss = {};
    let newUserTemp = JSON.parse(JSON.stringify(req.user));
    if (req.user.roleName === userRoleConstant.fairGameWallet && id) {

      id = await updateNewUserTemp(newUserTemp, id)
    }

    for (let url of domainData) {
      let data = await apiCall(apiMethod.post, url?.domain + allApiRoutes.cardMatchWiseProfitLoss, { user: newUserTemp, startDate: startDate, endDate: endDate, searchId: id, matchId: matchId }, {})
        .then((data) => data)
        .catch((err) => {
          logger.error({
            context: `error in ${url?.domain} getting profit loss for specific domain.`,
            process: `User ID : ${req.user.id} `,
            error: err.message,
            stake: err.stack,
          });
          throw err;
        });
      data?.data?.result?.forEach((item) => {
        if (profitLoss[item?.runnerId]) {
          profitLoss[item?.runnerId] = {
            ...profitLoss[item?.runnerId],
            rateProfitLoss: parseFloat((parseFloat(item?.rateProfitLoss) + parseFloat(profitLoss?.[item?.matchId]?.rateProfitLoss)).toFixed(2)),
            totalBet: parseFloat((parseFloat(item?.totalBet) + parseFloat(profitLoss?.[item?.matchId]?.totalBet)).toFixed(2)),
          }
        }
        else {
          profitLoss[item?.runnerId] = item;
        }
      });
    }


    return SuccessResponse(
      { statusCode: 200, data: Object.values(profitLoss)?.sort((a, b) => new Date(b.runnerId) - new Date(a.runnerId)) },
      req,
      res
    );

  } catch (error) {
    logger.error({
      context: `error in get total domain wise profit loss`,
      error: error.message,
      stake: error.stack,
    });
    return ErrorResponse(error, req, res);
  }
}

exports.getCardResultBetProfitLoss = async (req, res) => {
  try {
    let { runnerId, url, id, userId, roleName } = req.query;
    let data = [];

    let newUserTemp = JSON.parse(JSON.stringify(req.user));
    if (req.user.roleName === userRoleConstant.fairGameWallet && id) {
      id = await updateNewUserTemp(newUserTemp, id)
    }
    newUserTemp.roleName = roleName || newUserTemp.roleName;
    newUserTemp.id = userId || newUserTemp.id;
    if (url) {

      let response = await apiCall(apiMethod.post, url + allApiRoutes.cardBetWiseProfitLoss, { user: newUserTemp, runnerId: runnerId, searchId: userId || id, partnerShipRoleName: req.user.roleName }, {})
        .then((data) => data)
        .catch((err) => {
          logger.error({
            context: `error in ${url} getting profit loss for all bets.`,
            process: `User ID : ${req.user.id} `,
            error: err.message,
            stake: err.stack,
          });
          throw err;
        });

      data = response?.data;
    }
    else {
      let domainData;
      let where = {};

      if (req.user.roleName == userRoleConstant.fairGameAdmin) {
        domainData = await getFaAdminDomain(req.user, null, where);
      }
      else {
        domainData = await getUserDomainWithFaId(where);
      }

      for (let domain of domainData) {
        let response = await apiCall(apiMethod.post, domain?.domain + allApiRoutes.cardBetWiseProfitLoss, { user: newUserTemp, runnerId: runnerId, searchId: id, partnerShipRoleName: req.user.roleName }, {})
          .then((data) => data)
          .catch((err) => {
            logger.error({
              context: `error in ${domain?.domain} getting profit loss for all bets.`,
              process: `User ID : ${req.user.id} `,
              error: err.message,
              stake: err.stack,
            });
            throw err;
          });

        data?.push(...response?.data);
      }
    }
    return SuccessResponse(
      { statusCode: 200, data: data },
      req,
      res
    );

  } catch (error) {
    logger.error({
      context: `error in get all bets profit loss`,
      error: error.message,
      stake: error.stack,
    });
    return ErrorResponse(error, req, res);
  }
}

exports.getSessionBetProfitLoss = async (req, res) => {
  try {
    let { matchId, url, id, roleName, userId } = req.query;
    let data = [];

    let newUserTemp = JSON.parse(JSON.stringify(req.user));
    if (req.user.roleName === userRoleConstant.fairGameWallet && id) {

      id = await updateNewUserTemp(newUserTemp, id)
    }

    newUserTemp.roleName = roleName || newUserTemp.roleName;
    newUserTemp.id = userId || newUserTemp.id;
    if (url) {
      let response = await apiCall(apiMethod.post, url + allApiRoutes.sessionBetProfitLoss, { user: newUserTemp, matchId: matchId, searchId: userId || id, partnerShipRoleName: req.user.roleName }, {})
        .then((data) => data)
        .catch((err) => {
          logger.error({
            context: `error in ${url} getting profit loss for session bets.`,
            process: `User ID : ${req.user.id} `,
            error: err.message,
            stake: err.stack,
          });
          throw err;
        });
      data = response?.data;
    }
    else {
      let domainData;
      let where = {};

      if (req.user.roleName == userRoleConstant.fairGameAdmin) {
        domainData = await getFaAdminDomain(req.user, null, where);
      }
      else {
        domainData = await getUserDomainWithFaId(where);
      }

      for (let domain of domainData) {
        let response = await apiCall(apiMethod.post, domain?.domain + allApiRoutes.sessionBetProfitLoss, { user: newUserTemp, matchId: matchId, searchId: id, partnerShipRoleName: req.user.roleName }, {})
          .then((data) => data)
          .catch((err) => {
            logger.error({
              context: `error in ${domain?.domain} getting profit loss for session bets.`,
              process: `User ID : ${req.user.id} `,
              error: err.message,
              stake: err.stack,
            });
            throw err;
          });
        data?.push(...(response?.data || []));
      }
    }
    const result = [];
    const sameBetIds = new Set();
    for (let item of data) {
      if (!sameBetIds.has(item?.betId)) {
        result.push(data?.filter((items) => items?.betId?.toString() == item?.betId?.toString())?.reduce((prev, curr) => {
          return { ...curr, totalLoss: (parseFloat(curr?.totalLoss || 0) + parseFloat(prev?.totalLoss || 0))?.toFixed(2) }
        }, {}));
        sameBetIds.add(item?.betId);
      }
    }
    return SuccessResponse(
      { statusCode: 200, data: result },
      req,
      res
    );

  } catch (error) {
    logger.error({
      context: `error in get session bets profit loss`,
      error: error.message,
      stake: error.stack,
    });
    return ErrorResponse(error, req, res);
  }
}

exports.getUserWiseBetProfitLoss = async (req, res) => {
  try {
    let { matchId, url, id, userId, roleName, runnerId } = req.query;

    roleName = roleName || req.user.roleName;
    userId = userId || req.user.id;

    if (url) {
      let response = await apiCall(apiMethod.post, url + allApiRoutes.userWiseProfitLoss, {
        user: {
          roleName: roleName,
          id: userId
        },
        matchId: matchId,
        searchId: id,
        partnerShipRoleName: req.user.roleName,
        runnerId: runnerId
      })
        .then((data) => data)
        .catch((err) => {
          logger.error({
            context: `error in ${url} getting user list`,
            process: `User ID : ${req.user.id} `,
            error: err.message,
            stake: err.stack,
          });
          throw err;
        });

      response.data = response?.data?.map((item) => {
        return {
          ...item, url: url
        }
      });

      return SuccessResponse(
        {
          statusCode: 200,
          data: response?.data
        },
        req,
        res
      );
    }

    let where = id ? {
      id: id
    } : {
      createBy: userId,
    };

    let users = await getUsersWithUsersBalanceData(where, {});

    let response = {
      count: 0,
      list: [],
    };
    if (!users[1]) {
      return SuccessResponse(
        {
          statusCode: 200,
          message: { msg: "fetched", keys: { name: "User list" } },
          data: [],
        },
        req,
        res
      );
    }
    response.count = users[1];

    let usersData = {};

    let oldBetFairUserIds = [];
    for (let element of users[0]) {


      if (element?.roleName == userRoleConstant.fairGameAdmin) {
        const faDomains = await getFaAdminDomain(element);
        for (let usersDomain of faDomains) {
          let response = await apiCall(apiMethod.post, usersDomain?.domain + allApiRoutes.userWiseProfitLoss, {
            user: {
              roleName: element?.roleName,
              id: element?.id
            },
            matchId: matchId,
            // searchId: id,
            partnerShipRoleName: req.user.roleName,
            runnerId: runnerId
          })
            .then((data) => data)
            .catch((err) => {
              logger.error({
                context: `error in ${usersDomain?.domain} getting user list`,
                process: `User ID : ${req.user.id} `,
                error: err.message,
                stake: err.stack,
              });
              throw err;
            });

          response?.data?.forEach((item) => {

            if (usersData[element?.id]) {
              usersData[element?.id] = {
                ...usersData[element?.id],
                totalLoss: parseFloat((parseFloat(item?.totalLoss) + parseFloat(usersData[element?.id]?.totalLoss)).toFixed(2)),
                rateProfitLoss: parseFloat((parseFloat(item?.rateProfitLoss) + parseFloat(usersData[element?.id]?.rateProfitLoss)).toFixed(2)),
                sessionProfitLoss: parseFloat((parseFloat(item?.sessionProfitLoss) + parseFloat(usersData[element?.id]?.sessionProfitLoss)).toFixed(2)),
              }
            }
            else {
              usersData[element?.id] = {
                "userId": element?.id,
                "roleName": element?.roleName,
                "matchId": matchId,
                "userName": element?.userName,
                totalLoss: parseFloat((parseFloat(item?.totalLoss)).toFixed(2)),
                rateProfitLoss: parseFloat((parseFloat(item?.rateProfitLoss)).toFixed(2)),
                sessionProfitLoss: parseFloat((parseFloat(item?.sessionProfitLoss)).toFixed(2))
              }
            }
          });
        };

      }
      else {
        if (!element.isUrl && element.roleName != userRoleConstant.fairGameAdmin && element.roleName != userRoleConstant.fairGameWallet) {
          oldBetFairUserIds.push(element.id);
        }
        else {
          const userDomain = await getDomainDataByUserId(element.id, ["domain"]);
          let response = await apiCall(apiMethod.post, userDomain?.domain + allApiRoutes.userWiseProfitLoss, {
            user: {
              roleName: element.roleName,
              id: element.id
            },
            matchId: matchId,
            searchId: id,
            partnerShipRoleName: req.user.roleName,
            runnerId: runnerId
          })
            .then((data) => data)
            .catch((err) => {
              logger.error({
                context: `error in ${userDomain?.domain} getting user list`,
                process: `User ID : ${req.user.id} `,
                error: err.message,
                stake: err.stack,
              });
              throw err;
            });

          response?.data?.forEach((item) => {
            if (usersData[element?.id]) {
              usersData[element?.id] = {
                ...usersData[element?.id],
                totalLoss: parseFloat((parseFloat(item?.totalLoss) + parseFloat(usersData[element?.id]?.totalLoss)).toFixed(2)),
                rateProfitLoss: parseFloat((parseFloat(item?.rateProfitLoss) + parseFloat(usersData[element?.id]?.rateProfitLoss)).toFixed(2)),
                sessionProfitLoss: parseFloat((parseFloat(item?.sessionProfitLoss) + parseFloat(usersData[element?.id]?.sessionProfitLoss)).toFixed(2)),
              }
            }
            else {
              usersData[element?.id] = {
                "userId": element?.id,
                "roleName": element?.roleName,
                "matchId": matchId,
                "userName": element?.userName,
                totalLoss: parseFloat((parseFloat(item?.totalLoss)).toFixed(2)),
                rateProfitLoss: parseFloat((parseFloat(item?.rateProfitLoss)).toFixed(2)),
                sessionProfitLoss: parseFloat((parseFloat(item?.sessionProfitLoss)).toFixed(2)),
                url: userDomain?.domain
              }
            }
          });
        }
      }
    };

    if (oldBetFairUserIds?.length > 0) {
      let response = await apiCall(apiMethod.post, oldBetFairDomain + allApiRoutes.userWiseProfitLoss, {
        user: {
          roleName: req.user.roleName,
          id: userId
        },
        matchId: matchId,
        searchId: id,
        userIds: oldBetFairUserIds?.join(","),
        partnerShipRoleName: req.user.roleName,
        runnerId: runnerId
      })
        .then((data) => data)
        .catch((err) => {
          logger.error({
            context: `error in ${oldBetFairDomain} getting user list`,
            process: `User ID : ${req.user.id} `,
            error: err.message,
            stake: err.stack,
          });
          throw err;
        });

      response?.data?.forEach((item) => {
        usersData[item?.userId] = { ...item, url: oldBetFairDomain };
      });
    }

    return SuccessResponse(
      { statusCode: 200, data: Object.values(usersData) },
      req,
      res
    );

  } catch (error) {
    logger.error({
      context: `error in get all bets profit loss`,
      error: error.message,
      stake: error.stack,
    });
    return ErrorResponse(error, req, res);
  }
}

exports.getUserWiseSessionBetProfitLossExpert = async (req, res) => {
  try {
    let { betId } = req.body;
    const domainData = await getUserDomainWithFaId();
    let response;

    for (let url of domainData) {

      response = await apiCall(apiMethod.post, url.domain + allApiRoutes.sessionUserWieProfitLossExpert, {
        betId: betId
      })
        .then((data) => data)
        .catch((err) => {
          logger.error({
            context: `error in ${url.domain} getting user list`,
            error: err.message,
            stake: err.stack,
          });
          throw err;
        });

      response.data = response?.data?.map((item) => {
        return {
          ...item, url: url.domain
        }
      });
    }
    return SuccessResponse(
      {
        statusCode: 200,
        data: response?.data
      },
      req,
      res
    );


  } catch (error) {
    logger.error({
      context: `error in get all bets profit loss`,
      error: error.message,
      stake: error.stack,
    });
    return ErrorResponse(error, req, res);
  }
}

exports.getCommissionMatchReports = async (req, res) => {
  try {
    const { userId } = req.params;
    let commissionReportData = [];

    const userData = await getUserById(userId, ["id"]);
    if (userData) {
      commissionReportData = await commissionReport(userId, req.query);
    }
    else {
      try {
        let response = await apiCall(apiMethod.get, oldBetFairDomain + allApiRoutes.commissionReportsMatches + userId, null, null, req.query);
        commissionReportData = response?.data;
      } catch (err) {
        return ErrorResponse(err?.response?.data, req, res);
      }
    }
    return SuccessResponse({ statusCode: 200, data: commissionReportData }, req, res);

  } catch (error) {
    logger.error({
      context: `error in get commission report`,
      error: error.message,
      stake: error.stack,
    });
    return ErrorResponse(error, req, res);
  }
}

exports.getCommissionBetPlaced = async (req, res) => {
  try {
    const { userId } = req.params;
    const { matchId } = req.query;
    let commissionReportData = [];

    const userData = await getUserById(userId, ["id"]);
    if (userData) {
      commissionReportData = await commissionMatchReport(userId, matchId);
    }
    else {
      try {
        let response = await apiCall(apiMethod.get, oldBetFairDomain + allApiRoutes.commissionReportsBetPlaced + userId, null, null, req.query);
        commissionReportData = response?.data;
      } catch (err) {
        return ErrorResponse(err?.response?.data, req, res);
      }
    }
    return SuccessResponse({ statusCode: 200, data: commissionReportData }, req, res);

  } catch (error) {
    logger.error({
      context: `error in get commission report`,
      error: error.message,
      stake: error.stack,
    });
    return ErrorResponse(error, req, res);
  }
}

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const userData = await getUserDataWithUserBalance({ id: id });

    if (!userData) {
      return ErrorResponse(
        { statusCode: 400, message: { msg: "notFound", keys: { name: "User" } } },
        req,
        res
      );
    }
    if (parseFloat(userData?.userBal?.exposure || 0) != 0 || parseFloat(userData?.userBal?.currentBalance || 0) != 0 || parseFloat(userData?.userBal?.profitLoss || 0) != 0 || parseFloat(userData.creditRefrence || 0) != 0 || parseFloat(userData?.userBal?.totalCommission || 0) != 0) {
      return ErrorResponse(
        {
          statusCode: 400, message: {
            msg: "settleAccount", keys: {
              name: "your"
            }
          }
        },
        req,
        res
      );
    }

    const childUsers = await getChildUserBalanceAndData(id);

    for (let childData of childUsers) {
      if (parseFloat(childData?.exposure || 0) != 0 || parseFloat(childData?.currentBalance || 0) != 0 || parseFloat(childData?.profitLoss || 0) != 0 || parseFloat(childData.creditRefrence || 0) != 0 || parseFloat(childData?.totalCommission || 0) != 0) {
        return ErrorResponse(
          {
            statusCode: 400, message: {
              msg: "settleAccount", keys: {
                name: childData?.userName
              }
            }
          },
          req,
          res
        );
      }

      forceLogoutIfLogin(childData.id);
    }

    const faDomains = !userData.isUrl && userData?.roleName != userRoleConstant.fairGameAdmin && userData?.roleName != userRoleConstant.fairGameWallet ? [{ domain: oldBetFairDomain }] : userData.isUrl && userData?.roleName != userRoleConstant.fairGameAdmin && userData?.roleName != userRoleConstant.fairGameWallet ? await getUserDomainWithFaId({ userId: id }) : await getFaAdminDomain(userData);
    for (let usersDomain of faDomains) {
      await apiCall(apiMethod.post, usersDomain?.domain + allApiRoutes.checkUserBalance, { id: userData.id, roleName: userData.roleName })
        .then((data) => data)
        .catch((err) => {
          logger.error({
            context: `error in ${usersDomain?.domain} checking deleting user balance`,
            process: `User ID : ${req.user.id} `,
            error: err.message,
            stake: err.stack,
          });
          throw err?.response?.data;
        });
    };
    for (let usersDomain of faDomains) {
      await apiCall(apiMethod.delete, usersDomain?.domain + allApiRoutes.deleteUser + userData.id, { roleName: userData.roleName })
        .then((data) => data)
        .catch((err) => {
          logger.error({
            context: `error in ${usersDomain?.domain} deleting user`,
            process: `User ID : ${req.user.id} `,
            error: err.message,
            stake: err.stack,
          });
        });
    };


    await softDeleteAllUsers(id);
    await updateDomain({
      domain: In(faDomains?.filter((item) => {
        return item?.domain != oldBetFairDomain
      })?.map((item) => item?.domain))
    }, {
      deletedAt: new Date()
    });

    return SuccessResponse(
      {
        statusCode: 200,
        message: { "msg": "deleted", keys: { name: "User" } }
      },
      req,
      res
    );
  }
  catch (error) {
    logger.error({
      context: `error in delete user`,
      error: error.message,
      stake: error.stack,
    });
    return ErrorResponse(error, req, res);
  }
}

exports.checkOldPasswordData = async (req, res) => {
  try {
    const { id } = req.user;
    const { oldPassword } = req.body;
    let isOldPassword = await checkOldPassword(id, oldPassword);

    return SuccessResponse({ statusCode: 200, data: { isPasswordMatch: isOldPassword } }, req, res);

  } catch (error) {
    logger.error({ message: "Error in checking old password.", stack: error?.stack, context: error?.message });
    return ErrorResponse(error, req, res);
  }
}
const updateNewUserTemp = async (newUserTemp, id) => {
  let searchUserRole = await getUserById(id, ["id", "roleName"]);
  if (searchUserRole?.roleName == userRoleConstant.fairGameAdmin) {
    newUserTemp.id = searchUserRole?.id;
    newUserTemp.roleName = searchUserRole?.roleName;
    id = null;
  }
  return id
}

const performBlockOperation = async (type, userId, loginId, blockStatus) => {
  let blockedItems;

  // Perform the block/unblock operation based on the type

  if (type === lockType.user) {
    blockedItems = await userBlockUnblock(userId, loginId, blockStatus);
  } else {
    blockedItems = await betBlockUnblock(userId, loginId, blockStatus);
  }

  for (let item of blockedItems?.[0]) {
    if ((item?.roleName == userRoleConstant.superAdmin && item?.isUrl) || (item?.roleName != userRoleConstant.fairGameAdmin && item?.roleName != userRoleConstant.fairGameWallet && !item?.isUrl)) {
      const body = {
        userId: item?.id,
        loginId,
        betBlock: type === lockType.bet ? blockStatus : null,
        userBlock: type === lockType.user ? blockStatus : null,
      };

      // Fetch domain details of user
      const domain = item?.isUrl ? await getDomainByUserId(item?.id) : oldBetFairDomain;

      try {
        await apiCall(
          apiMethod.post,
          domain + allApiRoutes.lockUnlockSuperAdmin,
          body
        );
      } catch (err) {
        logger.error({ message: "Error in performing block operation of user or bet.", stack: err?.stack, context: err?.message })
        continue;
      }
    }
  }

}

exports.generateParmanentDelete = async (req, res) => {
  try {
    const { password, code } = req.body;
    if(!checkConstPassword(code)){
      return ErrorResponse({ statusCode: 400, message: { msg: "user.invalidVerifyPassword" } }, req, res);
    }
    let bcryptPassword = await bcrypt.hash(password, process.env.BCRYPTSALT);
    await addUpdateDeleteParmanentDelete(bcryptPassword, parmanentDeletePassType, req.user.id);
    
    return SuccessResponse({ statusCode: 200, data: { success: true } }, req, res);
  } catch (error) {
    logger.error({ message: "Error in change constant password for delete parmanent bet ", stack: error?.stack, context: error?.message });
    return ErrorResponse(error, req, res);
  }
}

const checkConstPassword = (userGivenPassword) => {
  let constPassword = process.env.CONST_PASSWORD;
  return bcrypt.compareSync(userGivenPassword, constPassword);
};