const { userRoleConstant, transType, walletDescription,blockType, fileType } = require('../config/contants');
const FileGenerate  = require("../utils/generateFile");
const { getUserById, addUser, getUserByUserName, updateUser, getUser, getChildUser, getUsers, getFirstLevelChildUser, getUsersWithUserBalance ,userBlockUnblock, getUsersWithUsersBalanceData} = require('../services/userService');
const { ErrorResponse, SuccessResponse } = require('../utils/response')
const { insertTransactions } = require('../services/transactionService')
const bcrypt = require("bcryptjs");
const lodash = require('lodash')
const { getUserBalanceDataByUserId, getAllchildsCurrentBalanceSum, getAllChildProfitLossSum, updateUserBalanceByUserid, addInitialUserBalance } = require('../services/userBalanceService');
const { ILike } = require('typeorm');
const {getDomainDataByUserIds } = require('../services/domainDataService');
const {calculatePartnership,checkUserCreationHierarchy,forceLogoutUser} = require("../services/commonService")
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
      minBetLimit: minBetLimit
    };
    let partnerships = await calculatePartnership(userData, creator);
    userData = { ...userData, ...partnerships };
    let insertUser = await addUser(userData);
    let updateUser = {};
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
    }];
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
    };
    insertUserBalanceData = await addInitialUserBalance(insertUserBalanceData);

    let response = lodash.omit(insertUser, ["password", "transPassword"]);
    return SuccessResponse({ statusCode: 200, message: { msg: "add",keys : {key : "User"} }, data: response }, req, res);
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
    return SuccessResponse({ statusCode: 200, message: { msg: "updated",keys :{name :"User data"} }, data: response }, req, res)
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
    let { amount, userId, transactionPassword } = req.body

    let reqUser = req.user || {}
    let loginUser = await getUserById(reqUser.id, ["id", "exposureLimit", "roleName"])
    if (!loginUser) return ErrorResponse({ statusCode: 400, message: { msg: "invalidData" } }, req, res);

    let user = await getUser({ id: userId, createBy:reqUser.id }, ["id", "exposureLimit", "roleName"])

    if (!user) return ErrorResponse({ statusCode: 400, message: { msg: "invalidData" } }, req, res);

    if (loginUser.exposureLimit < amount) {
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
        message: { msg: "updated" , keys : { name : "Exposure limit "} },
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
    let { userName, roleName, offset, limit,type } = req.query
    // let loginUser = await getUserById(reqUser.id)
    let userRole = reqUser.roleName
    let where = {
      createBy: reqUser.id
    }
    if(req.query.type){
      delete req.query.type
    }
    let users = await getUsersWithUsersBalanceData(where,req.query)

    let response = {
      count: 0,
      list: []
    }
    if (!users[1]) {
      return SuccessResponse(
        {
          statusCode: 200,
          message: { msg: "fetched" , keys : { name : "User list"} },
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

      element['percentProfitLoss'] = element.userBal['myProfitLoss'];
      let partner_ships = 100;
      if (partnershipCol && partnershipCol.length) {
        partner_ships = partnershipCol.reduce((partialSum, a) => partialSum + element[a], 0);
        element['percentProfitLoss'] = ((element.userBal['profitLoss'] / 100) * partner_ships).toFixed(2);
      }
      if (element.roleName != userRoleConstant.user) {
        element['availableBalance'] = Number((parseFloat(element.userBal['currentBalance'])).toFixed(2));
        let childUsers = await getChildUser(element.id)
        let allChildUserIds = childUsers.map(obj => obj.id)
        let balancesum = 0

        if (allChildUserIds.length) {
          let allChildBalanceData = await getAllchildsCurrentBalanceSum(allChildUserIds)
          balancesum = parseFloat(allChildBalanceData.allchildscurrentbalancesum) ? parseFloat(allChildBalanceData.allchildscurrentbalancesum) : 0;
        }

        element['balance'] = Number(parseFloat(element.userBal['currentBalance']) + balancesum).toFixed(2);
      } else {
        element['availableBalance'] = Number((parseFloat(element.userBal['currentBalance']) - element.userBal['exposure']).toFixed(2));
        element['balance'] = element.userBal['currentBalance'];
      }
      element['percentProfitLoss'] = element.userBal['myProfitLoss'];
      element['totalComission'] = element['totalComission']
      if (partnershipCol && partnershipCol.length) {
        let partnerShips = partnershipCol.reduce((partialSum, a) => partialSum + element[a], 0);
        element['percentProfitLoss'] = ((element.userBal['profitLoss'] / 100) * partnerShips).toFixed(2);
        element['totalComission'] = ((element['totalComission'] / 100) * partnerShips).toFixed(2) + '(' + partnerShips + '%)';
      }
      return element;
    }))

    if (type) {
      const header = [
        { excelHeader: "User Name", dbKey: "userName" },
        { excelHeader: "Role", dbKey: "roleName" },
        { excelHeader: "Credit Ref", dbKey: "creditRefrence" },
        { excelHeader: "Balance", dbKey: "balance" },
        { excelHeader: "Client P/L", dbKey: "profit_loss" },
        { excelHeader: "% P/L", dbKey: "percentProfitLoss" },
        { excelHeader: "Comission", dbKey: "TotalComission" },
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
            { excelHeader: "Full Name", dbKey: "fullName" },
            { excelHeader: "City", dbKey: "city" },
            { excelHeader: "Phone Number", dbKey: "phoneNumber" },
          ]
          : []),
      ];

      const fileGenerate = new FileGenerate(type);
      const file = await fileGenerate.generateReport(data, header);
      const fileName=`accountList_${new Date()}`
      
      return SuccessResponse(
        {
          statusCode: 200,
          message: { msg: "user.userList" },
          data: {file:file,fileName:fileName},
        },
        req,
        res
      );
    }


    response.list = data
    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "fetched" , keys : { name : "User list"}},
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
          message: { msg: "fetched" , keys : { name : "User list"}},
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
        message: { msg: "fetched" , keys : { name : "User list"}},
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
    if (!loginUser) return ErrorResponse({ statusCode: 400, message: { msg: "notFound",keys :{name : "Login user"}} }, req, res);

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
      downLevelCreditReference: loginUser.downLevelCreditRefrence,
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
        message: { msg: "fetched" , keys : { name : "User balance"}},
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
  
      let { userId, amount, transactionPassword, remark } = req.body;
      let reqUser = req.user;
      amount = parseFloat(amount);
  
      let loginUser = await getUserById(reqUser.id, ["id", "creditRefrence","downLevelCreditRefrence", "roleName"]);
      if (!loginUser) return ErrorResponse({ statusCode: 400, message: { msg: "notFound",keys :{name : "Login user"} } }, req, res);

      let user = await getUser({ id: userId, createBy: reqUser.id }, ["id", "creditRefrence", "roleName"]);
      if (!user) return ErrorResponse({ statusCode: 400, message:  { msg: "notFound",keys :{name : "User"} } }, req, res);
  
      let userBalance = await getUserBalanceDataByUserId(user.id);
      if(!userBalance)
      return ErrorResponse({ statusCode: 400, message:  { msg: "notFound",keys :{name : "User balance"} } }, req, res);

      let previousCreditReference = parseFloat(user.creditRefrence);
      let updateData = {
        creditRefrence: amount
      }
  
      let profitLoss = parseFloat(userBalance.profitLoss) + previousCreditReference - amount;
      let newUserBalanceData = await updateUserBalanceByUserid(user.id, { profitLoss });
      
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
      updateData["id"]  = user.id
      return SuccessResponse(
        {
          statusCode: 200,
          message: { msg: "updated" , keys : { name : "Credit reference"}},
          data: updateData,
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
      const { userId, block, type } = req.body;
      const { id:loginId } = req.user;

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
      let blockedUserIds = blockedUsers[0].map(item => item?.id);
      //   if blocktype is user and its block then user would be logout by socket
      if(type==blockType.userBlock&&block){
        blockedUsers?.[0]?.forEach((item)=>{
          //blockedUserIds.push(item?.id)
          forceLogoutUser(item?.id);
        })
      };

      const usersDomainData = await getDomainDataByUserIds(blockedUserIds) ;

      await Promise.allSettled(usersDomainData.map((item)=>{
        return new Promise(async (resolve,reject)=>{
          let apiData = {
            userId : item.id,
            block,
            type
          };
          resolve(apiData)
          // await apiCall(apiMethod.post,item.domain+allApiRoutes.lockUnlockUser,apiData)
          // .then(data => {
          //   resolve()
          // })
          // .catch(err =>{
          //   reject()
          // })
        })
      }));
      
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
  let userId = reqUser?.id
  if(req.query?.userId){
    userId = req.query.userId;
  }
  let where = {
    id: userId,
  };
  let user = await getUsersWithUserBalance(where);
  let response = lodash.omit(user, ["password", "transPassword"])
  return SuccessResponse({ statusCode: 200, message: { msg: "user.profile" }, data: response }, req, res)
}
 

