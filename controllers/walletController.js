const { userRoleConstant, transType } = require("../config/contants");
const { hasUserInCache, updateUserDataRedis } = require("../services/redis/commonFunctions");
const { insertTransactions } = require("../services/transactionService");
const { addInitialUserBalance, getUserBalanceDataByUserId, updateUserBalanceByUserId } = require("../services/userBalanceService");
const { getUserByUserName, addUser, getUserById, getChildUser, updateUser } = require("../services/userService");
const { ErrorResponse, SuccessResponse } = require("../utils/response");
const bcrypt = require('bcryptjs')
exports.insertWallet = async (req, res) => {
    try {
        let wallet = {
            userName: "FGWALLET",
            fullName: "fair game wallet",
            password: "FGwallet@123",
            phoneNumber: "1234567890",
            city: "india",
            roleName: userRoleConstant.fairGameWallet,
            userBlock: false,
            betBlock: false,
            createdBy: null,
            fwPartnership: 0,
            faPartnership: 0,
            saPartnership: 0,
            aPartnership: 0,
            smPartnership: 0,
            mPartnership: 0,
            agPartnership: 0,
        };
        let user = await getUserByUserName(wallet.userName);
        if (user)
            return ErrorResponse(
                { statusCode: 400, message: { msg: "user.userExist" } },
                req,
                res
            );

        wallet.password = await bcrypt.hash(
            wallet.password,
            process.env.BCRYPTSALT
        );
        let insertUser = await addUser(wallet);
        let insertUserBalanceData = {
            currentBalance: 0,
            userId: insertUser.id,
            profitLoss: 0,
            myProfitLoss: 0,
            downLevelBalance: 0,
            exposure: 0
        }
        insertUserBalanceData = await addInitialUserBalance(insertUserBalanceData);
        const { password, ...data } = insertUser;
        return SuccessResponse(
            { statusCode: 200, message: { msg: "add", keys: { key: "Wallet" } }, data: data },
            req,
            res
        );
    } catch (err) {
        return ErrorResponse(err, req, res);
    }
};

exports.updateBalance = async (req, res) => {
    try {
        let { transactionType, amount, transactionPassword, remark } = req.body;
        let reqUser = req.user;
        const userExistRedis = await hasUserInCache(reqUser.id);

        if (reqUser.roleName != userRoleConstant.fairGameWallet) {
            return ErrorResponse({ statusCode: 401, message: { msg: "auth.unauthorize" } }, req, res);
        }


        amount = parseFloat(amount);
        let loginUserBalanceData = await getUserBalanceDataByUserId(reqUser.id);

        if (!loginUserBalanceData)
            return ErrorResponse({ statusCode: 400, message: { msg: "notFound", keys: { name: "Balance" } } }, req, res);
        // let updatedLoginUserBalanceData = {};
        let updatedUpdateUserBalanceData = {};

        if (transactionType == transType.add) {
            updatedUpdateUserBalanceData.currentBalance = parseFloat(loginUserBalanceData.currentBalance) + parseFloat(amount);
            updatedUpdateUserBalanceData.profitLoss = parseFloat(loginUserBalanceData.profitLoss) + parseFloat(amount);
            let newUserBalanceData = await updateUserBalanceByUserId(reqUser.id, updatedUpdateUserBalanceData);

            if (userExistRedis) {
                await updateUserDataRedis(reqUser.id, updatedUpdateUserBalanceData);

            }

        } else if (transactionType == transType.withDraw) {
            if (amount > loginUserBalanceData.currentBalance)
                return ErrorResponse({ statusCode: 400, message: { msg: "userBalance.insufficientBalance" } }, req, res);

            updatedUpdateUserBalanceData.currentBalance = parseFloat(loginUserBalanceData.currentBalance) - parseFloat(amount);
            updatedUpdateUserBalanceData.profitLoss = parseFloat(loginUserBalanceData.profitLoss) - parseFloat(amount);
            let newUserBalanceData = await updateUserBalanceByUserId(reqUser.id, updatedUpdateUserBalanceData);

            if (userExistRedis) {
                await updateUserDataRedis(reqUser.id, updatedUpdateUserBalanceData);

            }

        } else {
            return ErrorResponse({ statusCode: 400, message: { msg: "invalidData" } }, req, res);
        }

        let transactionArray = [{
            actionBy: reqUser.id,
            searchId: reqUser.id,
            userId: reqUser.id,
            amount: transactionType == transType.add ? amount : -amount,
            transType: transactionType,
            closingBalance: updatedUpdateUserBalanceData.currentBalance,
            description: remark
        }]

        const transactioninserted = await insertTransactions(transactionArray);
        return SuccessResponse(
            {
                statusCode: 200,
                message: { msg: "userBalance.BalanceAddedSuccessfully" },
                data: updatedUpdateUserBalanceData,
            },
            req,
            res
        );
    } catch (error) {
        return ErrorResponse(error, req, res);
    }
};

exports.setExposureLimit = async (req, res, next) => {
    try {
        let { amount, transactionPassword } = req.body

        let reqUser = req.user || {};

        if (reqUser.roleName != userRoleConstant.fairGameWallet) {
            return ErrorResponse({ statusCode: 401, message: { msg: "auth.unauthorize" } }, req, res);
        }

        let loginUser = await getUserById(reqUser.id, ["id", "exposureLimit", "roleName"]);
        amount = parseInt(amount);
        loginUser.exposureLimit = amount;
        let childUsers = await getChildUser(reqUser.id);


        childUsers.map(async childObj => {
            let childUser = await getUserById(childObj.id);
            if (childUser.exposureLimit > amount || childUser.exposureLimit == 0) {
                childUser.exposureLimit = amount;
                await addUser(childUser);
            }
        });
        await addUser(loginUser)
        return SuccessResponse(
            {
                statusCode: 200,
                message: { msg: "user.ExposurelimitSet" },
                data: {
                    user: {
                        id: loginUser.id,
                        exposureLimit: loginUser.exposureLimit
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

exports.setCreditReferrence = async (req, res, next) => {
    try {

        let { amount, transactionPassword, remark } = req.body;
        let reqUser = req.user;

        if (reqUser.roleName != userRoleConstant.fairGameWallet) {
            return ErrorResponse({ statusCode: 401, message: { msg: "auth.unauthorize" } }, req, res);
        }
        amount = parseFloat(amount);

        let loginUser = await getUserById(reqUser.id, ["id", "creditRefrence", "roleName"]);
        if (!loginUser) return ErrorResponse({ statusCode: 400, message: { msg: "invalidData" } }, req, res);

        let userBalance = await getUserBalanceDataByUserId(loginUser.id);
        if (!userBalance)
            return ErrorResponse({ statusCode: 400, message: { msg: "invalidData" } }, req, res);
        let previousCreditReference = loginUser.creditRefrence
        let updateData = {
            creditRefrence: amount
        }

        let profitLoss = userBalance.profitLoss + previousCreditReference - amount;
        let newUserBalanceData = await updateUserBalanceByUserId(loginUser.id, { profitLoss })

        const userExistRedis = await hasUserInCache(loginUser.id);

        if (userExistRedis) {

            await updateUserDataRedis(loginUser.id, { profitLoss });
        }

        let transactionArray = [{
            actionBy: reqUser.id,
            searchId: loginUser.id,
            userId: loginUser.id,
            amount: previousCreditReference,
            transType: transType.creditRefer,
            closingBalance: updateData.creditRefrence,
            description: "CREDIT REFRENCE " + remark
        }]

        const transactioninserted = await insertTransactions(transactionArray);
        await updateUser(loginUser.id, updateData);
        return SuccessResponse(
            {
                statusCode: 200,
                message: { msg: "userBalance.BalanceAddedSuccessfully" },
                data: { user: updateData },
            },
            req,
            res
        );

    } catch (error) {
        return ErrorResponse(error, req, res);
    }

}