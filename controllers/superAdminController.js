const { userRoleConstant, acceptUserRole, transType, defaultButtonValue, buttonType, walletDescription, blockType } = require('../config/contants');
const { getUserById, addUser, getUserByUserName, updateUser, getUser, getChildUser, getUsers, getFirstLevelChildUser, getUsersWithUserBalance, userBlockUnblock } = require('../services/userService');
const { ErrorResponse, SuccessResponse } = require('../utils/response')
const { insertTransactions } = require('../services/transactionService')
const { insertButton } = require('../services/buttonService')
const bcrypt = require("bcryptjs");
const lodash = require('lodash')
const { forceLogoutIfLogin } = require("../services/commonService");
const internalRedis = require("../config/internalRedisConnection");
const { getUserBalanceDataByUserId, getAllchildsCurrentBalanceSum, getAllChildProfitLossSum, updateUserBalanceByUserid, addInitialUserBalance } = require('../services/userBalanceService');
const { ILike } = require('typeorm');
const { addDomainData, getDomainData, getDomainDataByUserId, getDomainByUserId, updateDomain } = require('../services/domainDataService');
const { apiCall, apiMethod, allApiRoutes } = require("../utils/apiService")
const { calculatePartnership, checkUserCreationHierarchy } = require("../services/commonService")

exports.createSuperAdmin = async (req, res) => {
    try {
        let { userName, fullName, password, confirmPassword, phoneNumber, city, roleName, myPartnership, creditRefrence, exposureLimit, maxBetLimit, minBetLimit, domain, logo, sidebarColor, headerColor, footerColor } = req.body;
        let reqUser = req.user || {}
        let creator = await getUserById(reqUser.id);
        if (!creator) return ErrorResponse({ statusCode: 400, message: { msg: "invalidData" } }, req, res);

        if (roleName !== userRoleConstant.superAdmin || creator.roleName != userRoleConstant.fairGameAdmin)
            return ErrorResponse({ statusCode: 400, message: { msg: "user.invalidRole" } }, req, res);

        let checkDomainData = await getDomainData([{ domain }, { userName }], ["id", "userName", "domain"])
        if (checkDomainData)
            return ErrorResponse({ statusCode: 400, message: { msg: "user.domainExist" } }, req, res);

        if (!checkUserCreationHierarchy(creator, roleName))
            return ErrorResponse({ statusCode: 400, message: { msg: "user.InvalidHierarchy" } }, req, res);

        creator.myPartnership = parseInt(myPartnership)
        userName = userName.toUpperCase();
        let userExist = await getUserByUserName(userName);
        if (userExist) return ErrorResponse({ statusCode: 400, message: { msg: "user.userExist" } }, req, res);

        if (exposureLimit && exposureLimit > creator.exposureLimit)
            return ErrorResponse({ statusCode: 400, message: { msg: "user.InvalidExposureLimit" } }, req, res);

        password = await bcrypt.hash(
            password,
            process.env.BCRYPTSALT
        );
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
            creditRefrence: creditRefrence ? creditRefrence : creator.creditRefrence,
            exposureLimit: exposureLimit ? exposureLimit : creator.exposureLimit,
            maxBetLimit: maxBetLimit ? maxBetLimit : creator.maxBetLimit,
            minBetLimit: minBetLimit ? minBetLimit : creator.minBetLimit,
            isUrl: true
        }
        let partnerships = await calculatePartnership(userData, creator)
        userData = { ...userData, ...partnerships };
        let insertUser = await addUser(userData);
        let updateUser = {}
        if (creditRefrence) {
            updateUser = await addUser({
                id: creator.id,
                downLevelCreditRefrence: parseInt(creditRefrence) + parseInt(creator.downLevelCreditRefrence)
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
            profitLoss: 0,
            myProfitLoss: 0,
            downLevelBalance: 0,
            exposure: 0
        }
        insertUserBalanceData = await addInitialUserBalance(insertUserBalanceData)

        const insertDomainData = {
            userName, domain, sidebarColor, headerColor, footerColor, logo,
            createBy: creator.id,
            userId: insertUser.id
        }
        let DomainData = await addDomainData(insertDomainData)

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
        ])
        response = {
            ...response,
            domain: lodash.pick(DomainData, [
                "domain",
                "sidebarColor",
                "headerColor",
                "footerColor",
                "logo"
            ])
        }

        //await apiCall(apiMethod.post,domain+allApiRoutes.createSuperAdmin,response)
        return SuccessResponse({ statusCode: 200, message: { msg: "login" }, data: response }, req, res)
    } catch (err) {
        return ErrorResponse(err, req, res);
    }
};
exports.updateSuperAdmin = async (req, res) => {
    try {
        let { sessionCommission, matchComissionType, matchCommission, id, logo, sidebarColor, headerColor, footerColor } = req.body;
        let reqUser = req.user || {}
        let updateUser = await getUser({ id, createBy: reqUser.id }, ["id", "createBy", "sessionCommission", "matchComissionType", "matchCommission"])
        if (!updateUser) return ErrorResponse({ statusCode: 400, message: { msg: "userNotFound" } }, req, res);
        updateUser.sessionCommission = sessionCommission ?? updateUser.sessionCommission;
        updateUser.matchCommission = matchCommission ?? updateUser.matchCommission;
        updateUser.matchComissionType = matchComissionType || updateUser.matchComissionType;
        updateUser = await addUser(updateUser);
        let domainData = {};
        let response = {};
        if (logo || sidebarColor || headerColor || footerColor) {
            let domain = await getDomainDataByUserId(updateUser.id, ["logo", "sidebarColor", "footerColor", "headerColor", "domain"]);
            if (!domain)
                return ErrorResponse({ statusCode: 400, message: { msg: "invalidData" } }, req, res);
            domainData = {
                logo: logo || domain.logo,
                sidebarColor: sidebarColor || domain.sidebarColor,
                headerColor: headerColor || domain.headerColor,
                footerColor: footerColor || domain.footerColor,
            }
            const update = await updateDomain(updateUser.id, domainData);
            response["domain"] = domainData
        } else {
            domainData = await getDomainDataByUserId(id, ["domain"])
        }
        response = { ...response, ...lodash.pick(updateUser, ["sessionCommission", "matchCommission", "matchComissionType", "id"]) }
        //await apiCall("post",domainData.domain+allApiRoutes.updateSuperAdmin,response)
        return SuccessResponse({ statusCode: 200, message: { msg: "login" }, data: response }, req, res)
    } catch (err) {
        return ErrorResponse(err, req, res);
    }
};

exports.setExposureLimit = async (req, res, next) => {
    try {
        let { amount, userId, transPassword } = req.body

        let reqUser = req.user || {}
        let loginUser = await getUserById(reqUser.id, ["id", "exposureLimit", "roleName"])
        let user = await getUser({ id: userId, createBy:reqUser.id }, ["id", "exposureLimit", "roleName"])
        if (!user) return ErrorResponse({ statusCode: 400, message: { msg: "invalidData" } }, req, res);
        let domain = await getDomainByUserId(userId);
        if (!domain) return ErrorResponse({ statusCode: 400, message: { msg: "invalidData" } }, req, res);

        // if (loginUser.exposureLimit < amount && loginUser.roleName != userRoleConstant.fairGameWallet) {
        //     return ErrorResponse({ statusCode: 400, message: { msg: "user.InvalidExposureLimit" } }, req, res);
        // }
        amount = parseInt(amount);
        user.exposureLimit = amount
        await addUser(user);
        let response = lodash.pick(user, ["id", "exposureLimit"])
        //await apiCall("post",domain+allApiRoutes.setExposureLimit,response)
        return SuccessResponse(
            {
                statusCode: 200,
                message: { msg: "user.ExposurelimitSet" },
                data: {
                    user: response
                },
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
        let reqUser = req.user || {};
        amount = parseFloat(amount);

        let loginUser = await getUserById(reqUser.id, ["id", "creditRefrence", "roleName"]);
        let user = await getUser({ id: userId, createBy: reqUser.id }, ["id", "creditRefrence", "roleName"]);
        if (!user) return ErrorResponse({ statusCode: 400, message: { msg: "invalidData" } }, req, res);
        let domain = await getDomainByUserId(userId);
        if (!domain) return ErrorResponse({ statusCode: 400, message: { msg: "notFound", keys: { name: "Domain data" } } }, req, res);
        let userBalance = await getUserBalanceDataByUserId(user.id);
        if (!userBalance)
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
            currentAmount: user.creditRefrence,
            description: "CREDIT REFRENCE " + remark
        }, {
            actionBy: reqUser.id,
            searchId: reqUser.id,
            userId: user.id,
            amount: previousCreditReference,
            transType: transType.creditRefer,
            currentAmount: user.creditRefrence,
            description: "CREDIT REFRENCE " + remark
        }]

        const transactioninserted = await insertTransactions(transactionArray);
        await updateUser(user.id, updateData);
        let data = {
            amount, remark, userId
        }
        //apiCall(apiMethod.post,domain+allApiRoutes.setCreditReferrence,data)
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
        const { userId, block, type, transPassword } = req.body;
        const { id: loginId } = req.user;

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
        const blockedUsers = await userBlockUnblock(userId, loginId, block, type);


        //   if blocktype is user and its block then user would be logout by socket
        if (type == blockType.userBlock && block) {
            blockedUsers?.[0]?.forEach((item) => {
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


