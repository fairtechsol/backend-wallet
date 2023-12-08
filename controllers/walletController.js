const { userRoleConstant, transType } = require("../config/contants");
const { insertTransactions } = require("../services/transactionService");
const { addInitialUserBalance, getUserBalanceDataByUserId, updateUserBalanceByUserid } = require("../services/userBalanceService");
const { getUserByUserName, addUser } = require("../services/userService");
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
        insertUserBalanceData = await addInitialUserBalance(insertUserBalanceData)
        return SuccessResponse(
            { statusCode: 200, message: { msg: "add",keys:{key: "Wallet"} }, data: insertUser },
            req,
            res
        );
    } catch (err) {
        return ErrorResponse(err, req, res);
    }
};

exports.updateBalance = async (req, res) => {
    try {
        let { transactionType, amount, transactionPassword, remark } = req.body
        let reqUser = req.user
        amount = parseFloat(amount)

        let loginUserBalanceData =await  getUserBalanceDataByUserId(reqUser.id);
        
        if (!loginUserBalanceData)
            return ErrorResponse({ statusCode: 400, message: { msg: "notFound" ,keys :{name : "Balance"} } }, req, res);

        // let updatedLoginUserBalanceData = {};
        let updatedUpdateUserBalanceData = {};

        if (transactionType == transType.add) {
            updatedUpdateUserBalanceData.currentBalance = parseFloat(loginUserBalanceData.currentBalance) + parseFloat(amount);
            updatedUpdateUserBalanceData.profitLoss = parseFloat(loginUserBalanceData.profitLoss) + parseFloat(amount)
            let newUserBalanceData = await updateUserBalanceByUserid(reqUser.id, updatedUpdateUserBalanceData)
        } else if (transactionType == transType.withDraw) {
            if (amount > loginUserBalanceData.currentBalance)
                return ErrorResponse({ statusCode: 400, message: { msg: "userBalance.insufficientBalance" } }, req, res);

            updatedUpdateUserBalanceData.currentBalance = parseFloat(loginUserBalanceData.currentBalance) - parseFloat(amount);
            updatedUpdateUserBalanceData.profitLoss = parseFloat(loginUserBalanceData.profitLoss) - parseFloat(amount);
            let newUserBalanceData = await updateUserBalanceByUserid(reqUser.id, updatedUpdateUserBalanceData)
        } else {
            return ErrorResponse({ statusCode: 400, message: { msg: "invalidData" } }, req, res);
        }

        let transactionArray = [{
            actionBy: reqUser.id,
            searchId: reqUser.id,
            userId: reqUser.id,
            amount: transactionType == transType.add ? amount : -amount,
            transType: transactionType,
            currentAmount: updatedUpdateUserBalanceData.currentBalance,
            description: remark
        }]

        const transactioninserted = await insertTransactions(transactionArray);
        return SuccessResponse(
            {
                statusCode: 200,
                message: { msg: "userBalance.BalanceAddedSuccessfully" },
                data:  updatedUpdateUserBalanceData ,
            },
            req,
            res
        );
    } catch (error) {
        return ErrorResponse(error, req, res);
    }
};