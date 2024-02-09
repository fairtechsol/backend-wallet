const {
  userRoleConstant,
  redisTimeOut,
  partnershipPrefixByRole,
  differLoginTypeByRoles,
} = require("../config/contants");
const internalRedis = require("../config/internalRedisConnection");
const { ErrorResponse, SuccessResponse } = require("../utils/response");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { getUserById, getUserWithUserBalance } = require("../services/userService");
const { userLoginAtUpdate } = require("../services/authService");
const { forceLogoutIfLogin, settingBetsDataAtLogin } = require("../services/commonService");
const { logger } = require("../config/logger");
const { updateUserDataRedis } = require("../services/redis/commonFunctions");

// Function to validate a user by username and password
const validateUser = async (userName, password) => {
  // Find user by username and select specific fields
  const user = await getUserWithUserBalance(userName);

  // Check if the user is found
  if (user) {
    // Check if the provided password matches the hashed password in the database
    if (bcrypt.compareSync(password, user.password)) {
      // If the passwords match, create a result object without the password field
      const { password, ...result } = user;
      return result;
    }

    // If the passwords don't match, return an error object
    return {
      error: true,
      message: { msg: "auth.invalidPass", keys: { type: "user" } },
      statusCode: 403,
    };
  }

  // If the user is not found, return null
  return null;
};

const setUserDetailsRedis = async (user) => {
  logger.info({ message: "Setting exposure at login time.", data: user });
  
  // Fetch user details from Redis
  const redisUserData = await internalRedis.hget(user.id, "userName");

  if (!redisUserData) {
    // Fetch and set betting data at login
    let betData = await settingBetsDataAtLogin(user);

    // Set user details and partnerships in Redis
    await updateUserDataRedis(user.id, {
      exposure: user?.userBal?.exposure || 0,
      profitLoss: user?.userBal?.profitLoss || 0,
      myProfitLoss: user?.userBal?.myProfitLoss || 0,
      userName: user.userName,
      currentBalance: user?.userBal?.currentBalance || 0,
      roleName: user.roleName,
      ...(betData || {}),
      ...(user.roleName === userRoleConstant.user
        ? {
          partnerShips: await findUserPartnerShipObj(user),
          userRole: user.roleName,
        }
        : {}),
    });

    // Expire user data in Redis
    await internalRedis.expire(user.id, redisTimeOut);
  }
  else{
     // Expire user data in Redis
     await internalRedis.expire(user.id, redisTimeOut);
  }
};

const findUserPartnerShipObj = async (user) => {
  const obj = {};

  if (
    user.roleName == userRoleConstant.user ||
    user.roleName == userRoleConstant.expert
  ) {
    return JSON.stringify(obj);
  }

  const updateObj = (prefix, id) => {
    obj[`${prefix}Partnership`] = user[`${prefix}Partnership`];
    obj[`${prefix}PartnershipId`] = id;
  };

  const traverseHierarchy = async (currentUser) => {
    if (!currentUser) {
      return;
    }

    updateObj(partnershipPrefixByRole[currentUser.roleName], currentUser.id);

    if (currentUser.createBy) {
      const createdByUser = await getUserById(
        currentUser.createBy,
        ["id", "roleName", "createBy"]
      );
      await traverseHierarchy(createdByUser);
    }
  };

  await traverseHierarchy(user);

  return JSON.stringify(obj);
};

exports.login = async (req, res) => {
  try {
    const { password, loginType } = req.body;
    const userName = req.body.userName.trim();
    const user = await validateUser(userName, password);

    if (user?.error) {
      return ErrorResponse(
        {
          statusCode: 404,
          message: user.message,
        },
        req,
        res
      );
    }

    if (!user) {
      return ErrorResponse(
        {
          statusCode: 404,
          message: {
            msg: "notFound",
            keys: { name: "User" },
          },
        },
        req,
        res
      );
    } else if (user.userBlock&&user.roleName!=userRoleConstant.fairGameWallet) {
      return ErrorResponse(
        {
          statusCode: 403,
          message: {
            msg: "user.blocked",
          },
        },
        req,
        res
      );
    }
    const { roleName } = user;

    const throwUserNotCorrectError = () => {
      return ErrorResponse(
        {
          statusCode: 404,
          message: {
            msg: "auth.roleNotCorrectLogin",
          },
        },
        req,
        res
      );
    };

    switch (loginType) {
      case userRoleConstant.user:
      case userRoleConstant.expert:
        if (roleName !== loginType) {
          return throwUserNotCorrectError();
        }
        break;

      case userRoleConstant.admin:
        if (!differLoginTypeByRoles.admin.includes(roleName)) {
          return throwUserNotCorrectError();
        }
        break;

      case "wallet":
        if (!differLoginTypeByRoles.wallet.includes(roleName)) {
          return throwUserNotCorrectError();
        }
        break;
      default:
        return throwUserNotCorrectError();
    }

    // force logout user if already login on another device
    await forceLogoutIfLogin(user.id);

    setUserDetailsRedis(user);
    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, roleName: user.roleName, userName: user.userName },
      process.env.JWT_SECRET || "secret"
    );


    // checking transition password
    const isTransPasswordCreated = Boolean(user.transPassword);
    const forceChangePassword = !Boolean(user.loginAt);

    if (!forceChangePassword) {
      userLoginAtUpdate(user.id);
    }
    // setting token in redis for checking if user already loggedin
    await internalRedis.hmset(user.id, { token: token });

    // Return token and user information

    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "auth.loginSuccess" },
        data: {
          token,
          isTransPasswordCreated: isTransPasswordCreated,
          roleName: roleName,
          forceChangePassword,
        },
      },
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

// Function to handle user logout
exports.logout = async (req, res) => {
  try {
    // Get the user from the request object
    const user = req.user;

    // If the user is an expert, remove their ID from the "expertLoginIds" set in Redis
    if (user.roleName === userRoleConstant.expert) {
      await internalRedis.srem("expertLoginIds", user.id);
    }

    // Remove the user's token from Redis using their ID as the key
    await internalRedis.del(user.id);

    return SuccessResponse(
      {
        statusCode: 200,
        message: { msg: "auth.logoutSuccess" },
      },
      req,
      res
    );
  } catch (error) {
    // If an error occurs during the logout process, return an error response
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


