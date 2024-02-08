const {
  userRoleConstant,
  transType,
  walletDescription,
  blockType,
  fileType,
  expertDomain,
  oldBetFairDomain,
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
} = require("../services/userBalanceService");
const { ILike } = require("typeorm");
const {
  getDomainDataByUserIds,
  getDomainByUserId,
  getDomainDataByFaId,
  getUserDomainWithFaId,
} = require("../services/domainDataService");
const {
  calculatePartnership,
  checkUserCreationHierarchy,
  forceLogoutUser,
  getFaAdminDomain,
} = require("../services/commonService");
const { apiMethod, apiCall, allApiRoutes } = require("../utils/apiService");
const { logger } = require("../config/logger");
const { commissionReport, commissionMatchReport } = require("../services/commissionService");
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
      sessionCommission,
      matchComissionType,
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
        { statusCode: 400, message: { msg: "user.InvalidExposureLimit" } },
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
    let { sessionCommission, matchComissionType, matchCommission, id ,remark} =
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
    updateUser.sessionCommission =
      sessionCommission ?? updateUser.sessionCommission;
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
  const randomNumber = Math.floor(100000 + Math.random() * 900000);
  return `${randomNumber}`;
};

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
    const { type, userId,domain,roleName, ...apiQuery } = req.query;

    if(domain){
      let response = await apiCall(apiMethod.get, domain + allApiRoutes.userList,null,{}, {
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

    let userRole = reqUser.roleName;
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
          partner_ships = partnershipCol.reduce(
            (partialSum, a) => partialSum + element[a],
            0
          );
          element["percentProfitLoss"] = (
            (element.userBal["profitLoss"] / 100) *
            partner_ships
          ).toFixed(2);
        }
        if (element.roleName != userRoleConstant.user) {
          element["availableBalance"] = Number(
            parseFloat(element.userBal["currentBalance"]).toFixed(2)
          ) - Number(
            parseFloat(element.userBal["exposure"]).toFixed(2)
          );
          // let childUsers = await getChildUser(element.id);
          // let allChildUserIds = childUsers.map((obj) => obj.id);
          // let balancesum = 0;

          // if (allChildUserIds.length) {
          //   let allChildBalanceData = await getAllchildsCurrentBalanceSum(
          //     allChildUserIds
          //   );
          //   balancesum = parseFloat(
          //     allChildBalanceData.allchildscurrentbalancesum
          //   )
          //     ? parseFloat(allChildBalanceData.allchildscurrentbalancesum)
          //     : 0;
          // }

          element["balance"] = Number((parseFloat(element.userBal["currentBalance"]) + parseFloat(element.userBal["downLevelBalance"])).toFixed(2));
        } else {
          element["availableBalance"] = Number(
            (
              parseFloat(element.userBal["currentBalance"]) -
              element.userBal["exposure"]
            ).toFixed(2)
          );
          element["balance"] = Number((parseFloat(element.userBal["currentBalance"]) + parseFloat(element.userBal["downLevelBalance"])).toFixed(2));
        }
        element["percentProfitLoss"] = element.userBal["myProfitLoss"];
        element["commission"] = element?.userBal?.["totalCommission"];
        if (partnershipCol && partnershipCol.length) {
          let partnerShips = partnershipCol.reduce(
            (partialSum, a) => partialSum + element[a],
            0
          );
          element["percentProfitLoss"] = (
            (element.userBal["profitLoss"] / 100) *
            partnerShips
          ).toFixed(2);
          element["commission"] =
            ((element?.userBal?.["totalCommission"] / 100) * partnerShips).toFixed(2) +
            "(" +
            partnerShips +
            "%)";
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
        { excelHeader: "Client P/L", dbKey: "profit_loss" },
        { excelHeader: "% P/L", dbKey: "percentProfitLoss" },
        { excelHeader: "Comission", dbKey: "TotalCommission" },
        { excelHeader: "Exposure", dbKey: "exposure" },
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

      const fileGenerate = new FileGenerate(type);
      const file = await fileGenerate.generateReport(data, header);
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
    let queryColumns = `SUM(user.creditRefrence) as "totalCreditReference", SUM(UB.profitLoss) as profitSum, SUM(UB.currentBalance) as "availableBalance",SUM(UB.downLevelBalance) as "downLevelBalance", SUM(UB.exposure) as "totalExposure", SUM(UB.totalCommission) as totalCommission`;

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

    const totalBalance = await getUsersWithTotalUsersBalanceData(where, apiQuery, queryColumns);
    totalBalance.currBalance = parseFloat(totalBalance.downLevelBalance) + parseFloat(totalBalance.availableBalance);
    totalBalance.availableBalance = parseFloat(totalBalance.availableBalance) - parseFloat(totalBalance.totalExposure);

    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "fetched", keys: { name: "User list" } },
        data: { ...response, totalBalance },
      },
      req,
      res
    );
  } catch (error) {
    return ErrorResponse(error, req, res);
  }
};

exports.userSearchList = async (req, res, next) => {
  try {
    let { userName, createdBy } = req.query;
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
    if (userName) where.userName = ILike(`%${userName}%`);
    if (createdBy) where.createdBy = createdBy;

    let users = await getUsers(where, ["id", "userName"]);
    let response = {
      users: users[0],
      count: users[1],
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
    let reqUser = req.user || {};
    let id = req.query?.id || reqUser.id;
    let loginUser = await getUserById(id);
    if (!loginUser || id != loginUser.id)
      return ErrorResponse(
        {
          statusCode: 400,
          message: { msg: "notFound", keys: { name: "Login user" } },
        },
        req,
        res
      );

    let firstLevelChildUser = await getFirstLevelChildUser(loginUser.id);

    let firstLevelChildUserIds = await firstLevelChildUser.map((obj) => obj.id);

    let childUsers = await getChildUser(loginUser.id);

    let allChildUserIds = childUsers.map((obj) => obj.id);

    let userBalanceData = getUserBalanceDataByUserId(loginUser.id, [
      "id",
      "currentBalance",
      "profitLoss",
      "myProfitLoss"
    ]);

    let FirstLevelChildBalanceData = getAllChildProfitLossSum(
      firstLevelChildUserIds
    );

    let allChildBalanceData = getAllchildsCurrentBalanceSum(allChildUserIds);

    let AggregateBalanceData = await Promise.allSettled([
      userBalanceData,
      FirstLevelChildBalanceData,
      allChildBalanceData,
    ]);

    userBalanceData = AggregateBalanceData[0] && AggregateBalanceData[0].value ? AggregateBalanceData[0].value : {};
    FirstLevelChildBalanceData = AggregateBalanceData[1] && AggregateBalanceData[1].value ? AggregateBalanceData[1].value : {};
    allChildBalanceData = AggregateBalanceData[2] && AggregateBalanceData[2].value ? AggregateBalanceData[2].value : {};

    let response = {
      userCreditReference: parseFloat(loginUser.creditRefrence),
      downLevelOccupyBalance: allChildBalanceData.allchildscurrentbalancesum
        ? parseFloat(allChildBalanceData.allchildscurrentbalancesum)
        : 0,
      downLevelCreditReference: loginUser.downLevelCreditRefrence,
      availableBalance: userBalanceData.currentBalance
        ? parseFloat(userBalanceData.currentBalance)
        : 0,
      totalMasterBalance:
        (userBalanceData.currentBalance
          ? parseFloat(userBalanceData.currentBalance)
          : 0) +
        (allChildBalanceData.allchildscurrentbalancesum
          ? parseFloat(allChildBalanceData.allchildscurrentbalancesum)
          : 0),
      upperLevelBalance: userBalanceData.profitLoss
        ? -userBalanceData.profitLoss
        : 0,
      downLevelProfitLoss:
        FirstLevelChildBalanceData.firstlevelchildsprofitlosssum
          ? -FirstLevelChildBalanceData.firstlevelchildsprofitlosssum
          : 0,
      availableBalanceWithProfitLoss:
        (userBalanceData.currentBalance
          ? parseFloat(userBalanceData.currentBalance)
          : 0) +
        // (allChildBalanceData.allchildscurrentbalancesum
        //   ? parseFloat(allChildBalanceData.allchildscurrentbalancesum)
        //   : 0) +
        parseFloat(userBalanceData.myProfitLoss ? userBalanceData.myProfitLoss : 0),
      profitLoss: 0,
    };
    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "fetched", keys: { name: "User balance" } },
        data: { response },
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
    const userDetails = await getUserById(loginId, [
      "userBlock",
      "betBlock",
      "roleName",
    ]);

    // Fetch details of the user who is performing the block/unblock operation,
    // including the hierarchy and block information
    const blockingUserDetail = await getUserById(userId, [
      "createBy",
      "userBlock",
      "betBlock",
      "roleName",
    ]);

    // Check if the current user is already blocked
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
      // Perform the user block/unblock operation
      const blockedUsers = await userBlockUnblock(userId, loginId, userBlock);
      //   if blocktype is user and its block then user would be logout by socket

      for (let item of blockedUsers?.[0]) {
        if (item?.roleName == userRoleConstant.superAdmin) {
          const body = {
            userId: item?.id,

            loginId,
            betBlock: null,
            userBlock,
          };
          //fetch domain details of user
          const domain = await getDomainByUserId(item?.id);
          try {
            await apiCall(
              apiMethod.post,
              domain + allApiRoutes.lockUnlockSuperAdmin,
              body
            );
          } catch (err) {
            return ErrorResponse(err?.response?.data, req, res);
          }
        } else if (userBlock) {
          forceLogoutUser(item?.id);
        }
      }
    }

    // Check if the user is already bet-blocked or unblocked (prevent redundant operations)
    if (blockingUserDetail?.betBlock != betBlock) {
      // Perform the bet block/unblock operation

      const blockedBet = await betBlockUnblock(userId, loginId, betBlock);
      for (let item of blockedBet?.[0]) {
        if (item?.roleName == userRoleConstant.superAdmin) {
          const body = {
            userId: item?.id,
            loginId,
            betBlock,
            userBlock: null,
          };
          //fetch domain details of user
          const domain = await getDomainByUserId(item?.id);
          try {
            await apiCall(
              apiMethod.post,
              domain + allApiRoutes.lockUnlockSuperAdmin,
              body
            );
          } catch (err) {
            return ErrorResponse(err?.response?.data, req, res);
          }
        }
      }
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
    const { startDate, endDate, id } = req.query;
    let domainData;
    let where = {};

    if (roleName == userRoleConstant.fairGameAdmin) {
      domainData = await getFaAdminDomain(req.user, null, where);
    }
    else {
      domainData = await getUserDomainWithFaId(where);
    }

    let profitLoss = [];

    for (let url of domainData) {
      let data = await apiCall(apiMethod.post, url?.domain + allApiRoutes.profitLoss, {
        user: req.user, startDate: startDate, endDate: endDate, searchId: id
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
      data.data = (data?.data || [])?.map((item) => {
        return {
          ...item,
          domainUrl: url?.domain
        }
      });
      profitLoss.push(...(data?.data || []));
    }

    const resultArray = Object.values(profitLoss.reduce((accumulator, currentValue) => {
      const eventType = currentValue.eventType;

      accumulator[eventType] = accumulator[eventType] || {
        eventType,
        totalLoss: 0,
        totalBet: 0,
        domainData: []
      };

      accumulator[eventType].totalLoss += parseFloat(currentValue.totalLoss);
      accumulator[eventType].totalBet += parseFloat(currentValue.totalBet);
      accumulator[eventType].domainData.push(currentValue);

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
    const { startDate, endDate, url, type, id } = req.query;

    let data = await apiCall(apiMethod.post, url + allApiRoutes.matchWiseProfitLoss, { user: req.user, startDate: startDate, endDate: endDate, type: type, searchId: id }, {})
      .then((data) => data)
      .catch((err) => {
        logger.error({
          context: `error in ${url} getting profit loss for specific domain.`,
          process: `User ID : ${req.user.id} `,
          error: err.message,
          stake: err.stack,
        });
        throw err;
      });

    return SuccessResponse(
      { statusCode: 200, data: data },
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
    const { matchId, betId, isSession, url, id } = req.query;

    let data = await apiCall(apiMethod.post, url + allApiRoutes.betWiseProfitLoss, { user: req.user, matchId: matchId, betId: betId, isSession: isSession == 'true',searchId: id }, {})
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
    const { matchId, url,id } = req.query;

    let data = await apiCall(apiMethod.post, url + allApiRoutes.sessionBetProfitLoss, { user: req.user, matchId: matchId,searchId: id }, {})
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

    return SuccessResponse(
      { statusCode: 200, data: data },
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