const { userRoleConstant,acceptUserRole, transType, defaultButtonValue, buttonType, walletDescription,blockType } = require('../config/contants');
const { getUserById, addUser, getUserByUserName, updateUser, getUser, getChildUser, getUsers, getFirstLevelChildUser, getUsersWithUserBalance ,userBlockUnblock} = require('../services/userService');
const { ErrorResponse, SuccessResponse } = require('../utils/response')
const { insertTransactions } = require('../services/transactionService')
const { insertButton } = require('../services/buttonService')
const bcrypt = require("bcryptjs");
const lodash = require('lodash')
const { forceLogoutIfLogin } = require("../services/commonService");
const internalRedis = require("../config/internalRedisConnection");
const { getUserBalanceDataByUserId, getAllchildsCurrentBalanceSum, getAllChildProfitLossSum, updateUserBalanceByUserid, addInitialUserBalance } = require('../services/userBalanceService');
const { ILike } = require('typeorm');
const { addDomainData, getDomainData, getDomainDataByUserId } = require('../services/domainDataService');
const {apiCall,apiMethod,allApiRoutes} = require("../utils/apiService")
const {calculatePartnership,checkUserCreationHierarchy} = require("../services/commonService")

exports.createUser = async (req, res) => {
  try {
    let { userName, fullName, password, confirmPassword, phoneNumber, city, roleName, myPartnership,creditRefrence, exposureLimit, maxBetLimit, minBetLimit } = req.body;
    let reqUser = req.user || {}
    let creator = await getUserById(reqUser.id);
    if (!creator) return ErrorResponse({ statusCode: 400, message: { msg: "invalidData" } }, req, res);

    if(creator.roleName != userRoleConstant.fairGameWallet || roleName !== userRoleConstant.fairGameAdmin)
    return ErrorResponse({ statusCode: 400, message: { msg: "user.invalidRole" } }, req, res);

    if (!checkUserCreationHierarchy(creator, roleName))
      return ErrorResponse({ statusCode: 400, message: { msg: "user.InvalidHierarchy" } }, req, res);
    creator.myPartnership = parseInt(myPartnership)
    userName = userName.toUpperCase();
    let userExist = await getUserByUserName(userName);
    if (userExist) return ErrorResponse({ statusCode: 400, message: { msg: "user.userExist" } }, req, res);
    // if (creator.roleName != userRoleConstant.fairGameWallet) {
      if (exposureLimit && exposureLimit > creator.exposureLimit)
        return ErrorResponse({ statusCode: 400, message: { msg: "user.InvalidExposureLimit" } }, req, res);
    // }
    password = await bcrypt.hash(
      password,
      process.env.BCRYPTSALT
    );

    creditRefrence = creditRefrence ? parseFloat(creditRefrence) : 0;
    exposureLimit = exposureLimit ? exposureLimit : creator.exposureLimit
    maxBetLimit = maxBetLimit ? maxBetLimit : creator.maxBetLimit
    minBetLimit = minBetLimit ? minBetLimit : creator.minBetLimit

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
      minBetLimit: minBetLimit
    }
    let partnerships = await calculatePartnership(userData, creator)
    userData = { ...userData, ...partnerships };
    let insertUser = await addUser(userData);
    let updateUser = {}
    if (creditRefrence) {
      updateUser = await addUser({
        id: creator.id,
        downLevelCreditRefrence: creditRefrence + parseInt(creator.downLevelCreditRefrence)
      })
    }
    let transactionArray = [{
      actionBy: insertUser.createBy,
      searchId: insertUser.createBy,
      userId: insertUser.id,
      amount: 0,
      transType: transType.add,
      currentAmount: insertUser.creditRefer,
      description: walletDescription.userCreate
    }]
    if (insertUser.createdBy != insertUser.id) {
      transactionArray.push({
        actionBy: insertUser.createBy,
        searchId: insertUser.id,
        userId: insertUser.id,
        amount: 0,
        transType: transType.withDraw,
        currentAmount: insertUser.creditRefer,
        description: walletDescription.userCreate
      });
    }

    const transactioninserted = await insertTransactions(transactionArray);
    let insertUserBalanceData = {
      currentBalance: 0,
      userId: insertUser.id,
      profitLoss: -creditRefrence,
      myProfitLoss: 0,
      downLevelBalance: 0,
      exposure: 0
    }
    insertUserBalanceData = await addInitialUserBalance(insertUserBalanceData)

    let response = lodash.omit(insertUser, ["password", "transPassword"])
    return SuccessResponse({ statusCode: 200, message: { msg: "add",keys : {key : "User"} }, data: response }, req, res)
  } catch (err) {
    return ErrorResponse(err, req, res);
  }
};
exports.updateUser = async (req, res) => {
  try {
    let { sessionCommission, matchComissionType, matchCommission, id } = req.body;
    let reqUser = req.user || {}
    let updateUser = await getUser({ id, createBy : reqUser.id }, ["id", "createBy", "sessionCommission", "matchComissionType", "matchCommission"])
    if (!updateUser) return ErrorResponse({ statusCode: 400, message: { msg: "invalidData" } }, req, res);
    updateUser.sessionCommission = sessionCommission ?? updateUser.sessionCommission;
    updateUser.matchCommission = matchCommission ?? updateUser.matchCommission;
    updateUser.matchComissionType = matchComissionType || updateUser.matchComissionType;
    updateUser = await addUser(updateUser);
    let response = lodash.pick(updateUser, ["id","sessionCommission", "matchCommission", "matchComissionType"])
    return SuccessResponse({ statusCode: 200, message: { msg: "login" }, data: response }, req, res)
  } catch (err) {
    return ErrorResponse(err, req, res);
  }
};


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
  // Compare old transaction password with the stored transaction password
  return bcrypt.compareSync(oldTransactionPass, user.transPassword);
};

const forceLogoutUser = async (userId, stopForceLogout) => {

  if (!stopForceLogout) {
    await forceLogoutIfLogin(userId);
  }
  await internalRedis.hdel(userId, "token");

};

// API endpoint for changing password
exports.changePassword = async (req, res, next) => {
  try {
    // Destructure request body
    const {
      oldPassword,
      newPassword,
      transactionPassword
    } = req.body;

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
    let { amount, userid, transPassword } = req.body

    let reqUser = req.user || {}
    let loginUser = await getUserById(reqUser.id, ["id", "exposureLimit", "roleName"])
    let user = await getUser({ id: userid, createBy:reqUser.id }, ["id", "exposureLimit", "roleName"])

    if (!user) return ErrorResponse({ statusCode: 400, message: { msg: "invalidData" } }, req, res);

    if (loginUser.exposureLimit < amount && loginUser.roleName != userRoleConstant.fairGameWallet) {
      return ErrorResponse({ statusCode: 400, message: { msg: "user.InvalidExposureLimit" } }, req, res);
    }
    amount = parseInt(amount);
    user.exposureLimit = amount
    let childUsers = await getChildUser(user.id)


    childUsers.map(async childObj => {
      let childUser = await getUserById(childObj.id);
      if (childUser.exposureLimit > amount || childUser.exposureLimit == 0) {
        childUser.exposureLimit = amount;
        await addUser(childUser);
      }
    });
    await addUser(user)
    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "user.ExposurelimitSet" },
        data: {
          user: {
            id: user.id,
            exposureLimit: user.exposureLimit
          }
        },
      },
      req,
      res
    );
  } catch (error) {
    return ErrorResponse(error, req, res);
  }
}
exports.userList = async (req, res, next) => {
  try {
    let reqUser = req.user
    let { userName, roleName, offset, limit } = req.query
    // let loginUser = await getUserById(reqUser.id)
    let userRole = reqUser.roleName
    let where = {
      createBy: reqUser.id
    }
    if (userName) where.userName = ILike(`%${userName}%`);
    if (roleName) where.roleName = roleName;

    let relations = ['user']
    let users = await getUsersWithUserBalance(where, offset, limit)

    let response = {
      count: 0,
      list: []
    }
    if (!users[1]) {
      return SuccessResponse(
        {
          statusCode: 200,
          message: { msg: "user.userList" },
          data: response,
        },
        req,
        res
      );
    }
    response.count = users[1]
    let partnershipCol = [];
    if (userRole == userRoleConstant.master) {
      partnershipCol = ['mPartnership', 'smPartnership', 'aPartnership', 'saPartnership', 'faPartnership', 'fwPartnership'];
    }
    if (userRole == userRoleConstant.superMaster) {
      partnershipCol = ['smPartnership', 'aPartnership', 'saPartnership', 'faPartnership', 'fwPartnership'];
    }
    if (userRole == userRoleConstant.admin) {
      partnershipCol = ['aPartnership', 'saPartnership', 'faPartnership', 'fwPartnership'];
    }
    if (userRole == userRoleConstant.superAdmin) {
      partnershipCol = ['saPartnership', 'faPartnership', 'fwPartnership'];
    }
    if (userRole == userRoleConstant.fairGameAdmin) {
      partnershipCol = ['faPartnership', 'fwPartnership'];
    }
    if (userRole == userRoleConstant.fairGameWallet || userRole == userRoleConstant.expert) {
      partnershipCol = ['fwPartnership'];
    }

    let data = await Promise.all(users[0].map(async element => {
      let elementData = {}
      elementData = {
        ...element,
        ...element.userBal
      };

      delete elementData.userBal

      elementData['percentProfitLoss'] = elementData['myProfitLoss'];
      let partner_ships = 100;
      if (partnershipCol && partnershipCol.length) {
        partner_ships = partnershipCol.reduce((partialSum, a) => partialSum + elementData[a], 0);
        elementData['percentProfitLoss'] = ((elementData['profitLoss'] / 100) * partner_ships).toFixed(2);
      }
      if (elementData.roleName != userRoleConstant.user) {
        elementData['available_balance'] = Number((parseFloat(elementData['currentBalance'])).toFixed(2));
        let childUsers = await getChildUser(element.id)
        let allChildUserIds = childUsers.map(obj => obj.id)
        let balancesum = 0

        if (allChildUserIds.length) {
          let allChildBalanceData = await getAllchildsCurrentBalanceSum(allChildUserIds)
          balancesum = parseFloat(allChildBalanceData.allchildscurrentbalancesum) ? parseFloat(allChildBalanceData.allchildscurrentbalancesum) : 0;
        }

        elementData['balance'] = Number(parseFloat(d['currentBalance']) + balancesum).toFixed(2);
      } else {
        elementData['available_balance'] = Number((parseFloat(elementData['currentBalance']) - elementData['exposure']).toFixed(2));
        elementData['balance'] = elementData['currentBalance'];
      }
      elementData['percentProfitLoss'] = elementData['myProfitLoss'];
      elementData['TotalComission'] = elementData['TotalComission']
      if (partnershipCol && partnershipCol.length) {
        let partner_ships = partnershipCol.reduce((partialSum, a) => partialSum + elementData[a], 0);
        elementData['percentProfitLoss'] = ((elementData['profitLoss'] / 100) * partner_ships).toFixed(2);
        elementData['TotalComission'] = ((elementData['TotalComission'] / 100) * partner_ships).toFixed(2) + '(' + partner_ships + '%)';
      }
      return elementData;
    }))

    response.list = data
    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "user.userList" },
        data: response,
      },
      req,
      res
    );
  } catch (error) {
    return ErrorResponse(error, req, res);
  }
}


exports.userSearchList = async (req, res, next) => {
  try {
    let { userName, createdBy } = req.query
    if (!userName || userName.length < 0) {
      return SuccessResponse(
        {
          statusCode: 200,
          message: { msg: "user.userList" },
          data: { users: [],count : 0 },
        },
        req,
        res
      );
    }
    let where = {};
    if (userName) where.userName = ILike(`%${userName}%`);
    if (createdBy) where.createdBy = createdBy

    let users = await getUsers(where, ["id", "userName"])
    let response = {
      users: users[0],
      count : users[1]
    }
    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "user.userList" },
        data: response,
      },
      req,
      res
    );
  } catch (error) {
    return ErrorResponse(error, req, res);
  }
}


exports.userBalanceDetails = async (req, res, next) => {
  try {
    let reqUser = req.user || {}
    let { id } = req.query
    let loginUser = await getUserById(id)
    if (!loginUser) return ErrorResponse({ statusCode: 400, message: { msg: "invalidData" } }, req, res);

    let firstLevelChildUser = await getFirstLevelChildUser(loginUser.id)

    let firstLevelChildUserIds = await firstLevelChildUser.map(obj => obj.id)

    let childUsers = await getChildUser(loginUser.id)

    let allChildUserIds = childUsers.map(obj => obj.id)

    let userBalanceData = getUserBalanceDataByUserId(loginUser.id, ["id", "currentBalance", "profitLoss"])

    let FirstLevelChildBalanceData = getAllChildProfitLossSum(firstLevelChildUserIds)

    let allChildBalanceData = getAllchildsCurrentBalanceSum(allChildUserIds)

    let AggregateBalanceData = await Promise.all([userBalanceData, FirstLevelChildBalanceData, allChildBalanceData])

    userBalanceData = AggregateBalanceData[0] ? AggregateBalanceData[0] : {};
    FirstLevelChildBalanceData = AggregateBalanceData[1] ? AggregateBalanceData[1] : {};
    allChildBalanceData = AggregateBalanceData[2] ? AggregateBalanceData[2] : {};

    let response = {
      userCreditReference: parseFloat(loginUser.creditRefrence),
      downLevelOccupyBalance: allChildBalanceData.allchildscurrentbalancesum ? parseFloat(allChildBalanceData.allchildscurrentbalancesum) : 0,
      downLevelCreditReference: loginUser.downLevelCreditReference,
      availableBalance: userBalanceData.currentBalance ? parseFloat(userBalanceData.currentBalance) : 0,
      totalMasterBalance: (userBalanceData.currentBalance ? parseFloat(userBalanceData.currentBalance) : 0) + (allChildBalanceData.allchildscurrentbalancesum ? parseFloat(allChildBalanceData.allchildscurrentbalancesum) : 0),
      upperLevelBalance: userBalanceData.profitLoss ? userBalanceData.profitLoss : 0,
      downLevelProfitLoss: FirstLevelChildBalanceData.firstlevelchildsprofitlosssum ? FirstLevelChildBalanceData.firstlevelchildsprofitlosssum : 0,
      availableBalanceWithProfitLoss: ((userBalanceData.currentBalance ? parseFloat(userBalanceData.currentBalance) : 0) + (allChildBalanceData.allchildscurrentbalancesum ? parseFloat(allChildBalanceData.allchildscurrentbalancesum) : 0)) + (userBalanceData.profitLoss ? userBalanceData.profitLoss : 0),
      profitLoss: 0
    };
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
    return ErrorResponse(error, req, res);
  }
}

exports.setCreditReferrence = async (req, res, next) => {
    try {
  
      let { userId, amount, transactionPassword, remark, createBy } = req.body;
      let reqUser = req.user || { id: createBy };
      amount = parseFloat(amount);
  
      let loginUser = await getUserById(reqUser.id, ["id", "creditRefrence","downLevelCreditRefrence", "roleName"]);
      let user = await getUser({ id: userId, createBy: reqUser.id }, ["id", "creditRefrence", "roleName"]);
      if (!user) return ErrorResponse({ statusCode: 400, message: { msg: "invalidData" } }, req, res);
  
      let userBalance = await getUserBalanceDataByUserId(user.id);
      if(!userBalance)
      return ErrorResponse({ statusCode: 400, message: { msg: "invalidData" } }, req, res);
      let previousCreditReference = user.creditRefrence
      let updateData = {
        creditRefrence: amount
      }
  
      let profitLoss = userBalance.profitLoss + previousCreditReference - amount;
      let newUserBalanceData = await updateUserBalanceByUserid(user.id, { profitLoss })
      
      let transactionArray = [{
        actionBy: reqUser.id,
        searchId: user.id,
        userId: user.id,
        amount: previousCreditReference,
        transType: transType.creditRefer,
        currentAmount: amount,
        description: "CREDIT REFRENCE " + remark
      }, {
        actionBy: reqUser.id,
        searchId: reqUser.id,
        userId: user.id,
        amount: previousCreditReference,
        transType: transType.creditRefer,
        currentAmount: amount,
        description: "CREDIT REFRENCE " + remark
      }]
      const transactioninserted = await insertTransactions(transactionArray);
      let updateLoginUser = {
        downLevelCreditRefrence: parseInt(loginUser.downLevelCreditRefrence) - previousCreditReference + amount
      }
      await updateUser(user.id, updateData);
      await updateUser(loginUser.id, updateLoginUser);
      return SuccessResponse(
        {
          statusCode: 200,
          message: { msg: "userBalance.BalanceAddedSuccessfully" },
          data: { user },
        },
        req,
        res
      );
  
    } catch (error) {
      return ErrorResponse(error, req, res);
    }
  
  }

// Controller function for locking/unlocking a user
exports.lockUnlockUser = async (req, res, next) => {
    try {
      // Extract relevant data from the request body and user object
      const { userId, block, type,transPassword } = req.body;
      const { id:loginId } = req.user;

      const isPasswordMatch = await checkTransactionPassword(
        loginId,
        transPassword
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
  
      // Fetch user details of the current user, including block information
      const userDetails = await getUserById(loginId, ["userBlock", "betBlock"]);
  
      // Fetch details of the user who is performing the block/unblock operation,
      // including the hierarchy and block information
      const blockingUserDetail = await getUserById(userId, [
        "createBy",
        "userBlock",
        "betBlock",
      ]);
  
      // Check if the current user is already blocked
      if (userDetails?.userBlock) {
        throw new Error("user.userBlockError");
      }
  
      // Check if the block type is 'betBlock' and the user is already bet-blocked
      if (type == blockType.betBlock && userDetails?.betBlock) {
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
      if (
        blockingUserDetail?.userBlock === block &&
        type === blockType.userBlock
      ) {
        return ErrorResponse(
          {
            statusCode: 400,
            message: {
              msg: "user.alreadyBlocked",
              keys: {
                name: "User",
                type: block ? "blocked" : "unblocked",
              },
            },
          },
          req,
          res
        );
      }
  
      // Check if the user is already bet-blocked or unblocked (prevent redundant operations)
      if (
        blockingUserDetail?.betBlock === block &&
        type === blockType.betBlock
      ) {
        return ErrorResponse(
          {
            statusCode: 400,
            message: {
              msg: "user.alreadyBlocked",
              keys: {
                name: "Bet",
                type: block ? "blocked" : "unblocked",
              },
            },
          },
          req,
          res
        );
      }
  
      // Perform the user block/unblock operation
      const blockedUsers=await userBlockUnblock(userId, loginId, block, type);


    //   if blocktype is user and its block then user would be logout by socket
      if(type==blockType.userBlock&&block){
        blockedUsers?.[0]?.forEach((item)=>{
            forceLogoutUser(item?.id);
        })
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
  
exports.generateTransactionPassword = async (req, res) => {
  const { id } = req.user;
  const { transPassword } = req.body;

  const encryptTransPass = bcrypt.hashSync(transPassword, 10);
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

 

