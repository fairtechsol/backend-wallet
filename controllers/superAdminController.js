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
            "password"
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
        let user = await getUser({ id: userId, createBy: reqUser.id }, ["id", "exposureLimit", "roleName"])
        if (!user) return ErrorResponse({ statusCode: 400, message: { msg: "invalidData" } }, req, res);
        let domain = await getDomainByUserId(userId);
        if (!domain) return ErrorResponse({ statusCode: 400, message: { msg: "invalidData" } }, req, res);

        if (loginUser.exposureLimit < amount) {
            return ErrorResponse({ statusCode: 400, message: { msg: "user.InvalidExposureLimit" } }, req, res);
        }
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
        updateUser = await addUser({
            id: creator.id,
            downLevelCreditRefrence: parseInt(creditRefrence) + parseInt(creator.downLevelCreditRefrence)
        })
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



exports.updateUserBalance = async (req, res) => {
    try {
        let { userId, transactionType, amount, transactionPassword, remark } = req.body
        let reqUser = req.user
        amount = parseFloat(amount)

        let user = await getUser({ id: userId, createBy: reqUser.id }, ["id"])
        if (!user) return ErrorResponse({ statusCode: 400, message: { msg: "invalidData" } }, req, res);

        let domainData = getDomainByUserId(user.id)
        let loginUserBalanceData = getUserBalanceDataByUserId(reqUser.id);
        let insertUserBalanceData = getUserBalanceDataByUserId(user.id);

        let usersBalanceData = await Promise.all([loginUserBalanceData, insertUserBalanceData, domainData])
        if (!usersBalanceData.length || !usersBalanceData[1] || usersBalanceData[2])
            return ErrorResponse({ statusCode: 400, message: { msg: "invalidData" } }, req, res);

        loginUserBalanceData = usersBalanceData[0]
        domainData = usersBalanceData[2]
        let updatedLoginUserBalanceData = {}
        let updatedUpdateUserBalanceData = {}
        let body = {
            userId: user.id,
            amount,
            transactionType,
            remark
        }
        //let APIDATA = await apiCall(apiMethod.post,domainData+allApiRoutes.updateUserBalance,body)
        if (APIDATA.statusCode != 200) {
            return ErrorResponse({ statusCode: 400, message: { msg: APIDATA.data.message } }, req, res);
        }

        if (transactionType == transType.add) {
            if (amount > loginUserBalanceData.currentBalance)
                return ErrorResponse({ statusCode: 400, message: { msg: "userBalance.insufficientBalance" } }, req, res);
            insertUserBalanceData = usersBalanceData[1]
            updatedUpdateUserBalanceData.currentBalance = parseFloat(insertUserBalanceData.currentBalance) + parseFloat(amount);
            updatedUpdateUserBalanceData.profitLoss = parseFloat(insertUserBalanceData.profitLoss) + parseFloat(amount)
            let newUserBalanceData = await updateUserBalanceByUserid(user.id, updatedUpdateUserBalanceData)
            updatedLoginUserBalanceData.currentBalance = parseFloat(loginUserBalanceData.currentBalance) - parseFloat(amount);
        } else if (transactionType == transType.withDraw) {
            insertUserBalanceData = usersBalanceData[1]
            if (amount > insertUserBalanceData.currentBalance)
                return ErrorResponse({ statusCode: 400, message: { msg: "userBalance.insufficientBalance" } }, req, res);
            updatedUpdateUserBalanceData.currentBalance = parseFloat(insertUserBalanceData.currentBalance) - parseFloat(amount);
            updatedUpdateUserBalanceData.profitLoss = parseFloat(insertUserBalanceData.profitLoss) - parseFloat(amount);
            let newUserBalanceData = await updateUserBalanceByUserid(user.id, updatedUpdateUserBalanceData)
            updatedLoginUserBalanceData.currentBalance = parseFloat(loginUserBalanceData.currentBalance) + parseFloat(amount);
        } else {
            return ErrorResponse({ statusCode: 400, message: { msg: "invalidData" } }, req, res);
        }

        let newLoginUserBalanceData = await updateUserBalanceByUserid(reqUser.id, updatedLoginUserBalanceData)

        let transactionArray = [{
            actionBy: reqUser.id,
            searchId: reqUser.id,
            userId: user.id,
            amount: transactionType == transType.add ? amount : -amount,
            transType: transactionType,
            currentAmount: insertUserBalanceData.currentBalance,
            description: remark
        }, {
            actionBy: reqUser.id,
            searchId: user.id,
            userId: user.id,
            amount: transactionType == transType.add ? -amount : amount,
            transType: transactionType == transType.add ? transType.withDraw : transType.add,
            currentAmount: newLoginUserBalanceData.currentBalance,
            description: remark
        }]

        const transactioninserted = await insertTransactions(transactionArray);
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


