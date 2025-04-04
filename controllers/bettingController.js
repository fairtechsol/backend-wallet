const { expertDomain, redisKeys, socketData } = require('../config/contants.js');
const { deleteMultipleBetHandler } = require('../grpc/grpcClient/handlers/wallet/betsHandler.js');
const { getUserRedisKeys } = require('../services/redis/commonFunctions.js');
const { sendMessageToUser } = require('../sockets/socketManager.js');
const { allApiRoutes, apiCall, apiMethod } = require('../utils/apiService.js');
const { ErrorResponse, SuccessResponse } = require('../utils/response.js');

exports.deleteMultipleBet = async (req, res) => {
    try {
        let { matchId, deleteReason, urlData, isPermanentDelete } = req.body;
        let domain = expertDomain;
        let matchExist = {};
        try {
            matchExist = await apiCall(
                apiMethod.get,
                domain + allApiRoutes.MATCHES.matchDetails + matchId
            );
            if (!matchExist) {
                return ErrorResponse(
                    { statusCode: 404, message: { msg: "notFound", keys: { name: "Match" } } },
                    req,
                    res
                );
            }
        } catch (error) {
            throw error?.response?.data;
        }
        if (!Object.keys(urlData).length) {
            return ErrorResponse({ statusCode: 400, message: { msg: "invalid", keys: { name: "url data" } } }, req, res);
        }
        let promiseArray = []
        for (let url in urlData) {
            let promise = deleteMultipleBetHandler({ data: JSON.stringify(urlData[url]), deleteReason, matchId, isPermanentDelete }, url);
            promiseArray.push(promise);
        }
        let failedUrl = new Set();
        await Promise.allSettled(promiseArray)
            .then(results => {
                let urlDataArray = Object.keys(urlData);
                results.forEach((result, index) => {
                    if (result.status === 'rejected') {
                        failedUrl.add(urlDataArray[index]);
                    }
                });
            })
            .catch(error => {
                console.error('Error in handling settled promises:', error);
            });
        if (failedUrl.size) {
            return ErrorResponse({ statusCode: 400, message: { msg: "deleteBetError", keys: { urlData: Array.from(failedUrl).join(', ') } } }, req, res);
        }
        return SuccessResponse({ statusCode: 200, message: { msg: "updated", keys: { name: "Bet" } } }, req, res);
    } catch (err) {
        return ErrorResponse(err, req, res);
    }
};

exports.getSessionProfitLoss = async (req, res) => {
    try {
        const { id: userId } = req.user;
        const { betId } = req.params;

        const sessionProfitLoss = await getUserRedisKeys(userId, betId + redisKeys.profitLoss);

        return SuccessResponse({ statusCode: 200, message: { msg: "fetched", keys: { type: "Session profit loss" } }, data: { profitLoss: sessionProfitLoss } }, req, res);
    } catch (err) {
        return ErrorResponse(err, req, res);
    }
};

exports.changeBetsDeleteReason = async (req, res) => {
    try {
        let { deleteReason, betData, matchId } = req.body;

        const domains = Object.keys(betData);
        let promiseArray = [];
        for (let domain of domains) {
            let promise = apiCall(
                apiMethod.post,
                domain + allApiRoutes.changeDeleteBetReason,
                { betIds: betData[domain], deleteReason: deleteReason, matchId: matchId }
            );
            promiseArray.push(promise);
        }
        let failedUrl = new Set();
        await Promise.allSettled(promiseArray)
            .then(results => {
                let urlDataArray = Object.keys(betData);
                results.forEach((result, index) => {
                    if (result.status === 'rejected') {
                        failedUrl.add(urlDataArray[index]);
                    }
                    else if (result.status == "fulfilled") {

                        Object.keys(result?.value?.data)?.forEach((item) => {
                            sendMessageToUser(item, socketData.updateDeleteReason, {
                                betIds: result?.value?.data?.[item]?.bets,
                                deleteReason: deleteReason,
                                matchId: matchId
                            });
                        });
                    }
                });
            })
            .catch(error => {
                console.error('Error in handling settled promises:', error);
            });
        if (failedUrl.size) {
            return ErrorResponse({ statusCode: 400, message: { msg: "deleteBetError", keys: { urlData: Array.from(failedUrl).join(', ') } } }, req, res);
        }


        await apiCall(
            apiMethod.post,
            expertDomain + allApiRoutes.EXPERTS.updateDeleteReason,
            { betIds: Object.values(betData)?.flat(2), deleteReason: deleteReason, matchId: matchId }
        );
        return SuccessResponse({ statusCode: 200, message: { msg: "updated", keys: { name: "Bet" } } }, req, res);
    } catch (err) {
        return ErrorResponse(err, req, res);
    }
};
