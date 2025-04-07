const { transType, socketData, matchComissionTypeConstant, userRoleConstant } = require('../config/contants');
const { getUser, getUsersWithUserBalance, getUserDataWithUserBalance, } = require('../services/userService');
const { ErrorResponse, SuccessResponse } = require('../utils/response')
const { insertTransactions } = require('../services/transactionService')
const { getUserBalanceDataByUserId, updateUserBalanceData } = require('../services/userBalanceService');
const { sendMessageToUser } = require('../sockets/socketManager');
const { logger } = require('../config/logger');
const { settleCommission, insertCommissions } = require('../services/commissionService');
const { apiCall, apiMethod, allApiRoutes } = require('../utils/apiService');
const { hasUserInCache, updateUserDataRedis } = require('../services/redis/commonFunctions');
const { __mf } = require('i18n');
const { settleCommissionHandler } = require('../grpc/grpcClient/handlers/wallet/commissionHandler');

exports.updateUserBalance = async (req, res) => {
    try {
        let { userId, transactionType, amount, remark } = req.body
        let reqUser = req.user;

        const userExistRedis = await hasUserInCache(userId);


        amount = parseFloat(amount);
       
        let user = await getUser({ id: userId, createBy: reqUser.id }, ["id", "roleName"])
        if (!user) return ErrorResponse({ statusCode: 400, message: { msg: "notFound", keys: { name: "User" } } }, req, res);

        let loginUserBalanceData = getUserBalanceDataByUserId(reqUser.id);
        let insertUserBalanceData = getUserBalanceDataByUserId(user.id);
        let usersBalanceData = await Promise.all([loginUserBalanceData, insertUserBalanceData])
        if (!usersBalanceData.length || !usersBalanceData[1])
            return ErrorResponse({ statusCode: 400, message: { msg: "notFound", keys: { name: "User balance" } } }, req, res);

        loginUserBalanceData = usersBalanceData[0]
        let updatedLoginUserBalanceData = {}
        let updatedUpdateUserBalanceData = {}
        let loginUserBalanceChange = 0;
        if (transactionType == transType.add) {
            if (amount > loginUserBalanceData.currentBalance)
                return ErrorResponse({ statusCode: 400, message: { msg: "userBalance.insufficientBalance" } }, req, res);
            insertUserBalanceData = usersBalanceData[1]
            updatedUpdateUserBalanceData.currentBalance = parseFloat(insertUserBalanceData.currentBalance) + parseFloat(amount);
            updatedUpdateUserBalanceData.profitLoss = parseFloat(insertUserBalanceData.profitLoss) + parseFloat(amount);
            let updateMyProfitLoss = parseFloat(amount);
            if (parseFloat(insertUserBalanceData.myProfitLoss) + parseFloat(amount) > 0) {
                updateMyProfitLoss = insertUserBalanceData.myProfitLoss;
                updatedUpdateUserBalanceData.myProfitLoss = 0;
            }
            else {
                updatedUpdateUserBalanceData.myProfitLoss = parseFloat(insertUserBalanceData.myProfitLoss) + parseFloat(amount);
            }
            // updateUserBalanceByUserId(user.id, updatedUpdateUserBalanceData);
            await updateUserBalanceData(user.id, { 
                profitLoss: parseFloat(amount), 
                myProfitLoss: updateMyProfitLoss, 
                exposure: 0, 
                totalCommission: 0, 
                balance: parseFloat(amount)});

            if (userExistRedis) {
                await updateUserDataRedis(userId, updatedUpdateUserBalanceData);
            }

            updatedLoginUserBalanceData.currentBalance = parseFloat(loginUserBalanceData.currentBalance) - parseFloat(amount);
            loginUserBalanceChange = -parseFloat(amount);
        } else if (transactionType == transType.withDraw) {
            insertUserBalanceData = usersBalanceData[1]
            if (amount > insertUserBalanceData.currentBalance- (user.roleName == userRoleConstant.user ? insertUserBalanceData.exposure : 0))
                return ErrorResponse({ statusCode: 400, message: { msg: "userBalance.insufficientBalance" } }, req, res);
            updatedUpdateUserBalanceData.currentBalance = parseFloat(insertUserBalanceData.currentBalance) - parseFloat(amount);
            updatedUpdateUserBalanceData.profitLoss = parseFloat(insertUserBalanceData.profitLoss) - parseFloat(amount);
            let updateMyProfitLoss = -parseFloat(amount);
            if (parseFloat(insertUserBalanceData.myProfitLoss) - parseFloat(amount) < 0) {
                updateMyProfitLoss = -insertUserBalanceData.myProfitLoss
                updatedUpdateUserBalanceData.myProfitLoss = 0;
            }
            else {
                updatedUpdateUserBalanceData.myProfitLoss = parseFloat(insertUserBalanceData.myProfitLoss) - parseFloat(amount);
            }
            // updateUserBalanceByUserId(user.id, updatedUpdateUserBalanceData);
            await updateUserBalanceData(user.id, { 
                profitLoss: -parseFloat(amount), 
                myProfitLoss: updateMyProfitLoss, 
                exposure: 0, 
                totalCommission: 0, 
                balance: -parseFloat(amount)});

            if (userExistRedis) {
                await updateUserDataRedis(userId, updatedUpdateUserBalanceData);
            }

            updatedLoginUserBalanceData.currentBalance = parseFloat(loginUserBalanceData.currentBalance) + parseFloat(amount);
            loginUserBalanceChange = parseFloat(amount);
        } else {
            return ErrorResponse({ statusCode: 400, message: { msg: "userBalance.InvalidTransactionType" } }, req, res);
        }

        // updateUserBalanceByUserId(reqUser.id, updatedLoginUserBalanceData)
        await updateUserBalanceData(reqUser.id, { 
            profitLoss: 0, 
            myProfitLoss: 0, 
            exposure: 0, 
            totalCommission: 0, 
            balance: loginUserBalanceChange});
        const parentUserExistRedis = await hasUserInCache(reqUser.id);

        if (parentUserExistRedis) {
            await updateUserDataRedis(reqUser.id, updatedLoginUserBalanceData);
        }
        let transactionArray = [{
            actionBy: reqUser.id,
            searchId: user.id,
            userId: user.id,
            amount: transactionType == transType.add ? amount : -amount,
            transType: transactionType,
            closingBalance: updatedUpdateUserBalanceData.currentBalance,
            description: remark
        }, {
            actionBy: reqUser.id,
            searchId: reqUser.id,
            userId: user.id,
            amount: transactionType == transType.add ? -amount : amount,
            transType: transactionType == transType.add ? transType.withDraw : transType.add,
            closingBalance: updatedLoginUserBalanceData.currentBalance,
            description: remark
        }]
        sendMessageToUser(userId, socketData.userBalanceUpdateEvent, updatedUpdateUserBalanceData);
        insertTransactions(transactionArray);
        updatedUpdateUserBalanceData["id"] = user.id

        return SuccessResponse(
            {
                statusCode: 200,
                message: { msg: "updated", keys: { name: "User Balance" } },
                data: updatedUpdateUserBalanceData,
            },
            req,
            res
        );
    } catch (error) {
        return ErrorResponse(error, req, res);
    }
}

exports.settleCommissions = async (req, res) => {
    try {
        const { userId, domain } = req.body;
        const userData = await getUserDataWithUserBalance({ id: userId });

        if (userData?.userBal?.totalCommission == 0) {
            return ErrorResponse({ statusCode: 400, message: { msg: "userBalance.commissionAlreadySettled" } }, req, res);
        }

        if (domain) {
            await settleCommissionHandler({ userId: userId }, domain)
                .catch((err) => {
                    if(err.details.message == __mf("userBalance.commissionAlreadySettled")){
                        return null;
                    }
                    logger.error({
                        context: `error in ${domain} settling commission`,
                        process: `User ID : ${req.user.id} `,
                        error: err.message,
                        stake: err.stack,
                    });
                    throw err;
                });
        }
        if (userData) {
            await settleCommission(userId);
            await insertCommissions({
                userName: userData.userName,
                commissionAmount: userData.userBal.totalCommission,
                createBy: userData.id,
                parentId: userData.id,
                commissionType: matchComissionTypeConstant.settled,
                settled: true
            });

            // userData.userBal.totalCommission = 0;
            await updateUserBalanceData(userId, {
                balance: 0,
                totalCommission: -userData.userBal.totalCommission
              });
            // await addInitialUserBalance(userData.userBal);

        }
        return SuccessResponse(
            {
                statusCode: 200,
                message: { msg: "settledCommission" },
                data: userData,
            },
            req,
            res
        );

    } catch (error) {
        logger.error({
            message: "Error in settle commission.",
            context: error.message,
            stake: error.stack
        });
        return ErrorResponse(error, req, res);
    }
}

