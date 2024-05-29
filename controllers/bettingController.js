const { expertDomain, redisKeys } = require('../config/contants.js');
const { getUserRedisKeys } = require('../services/redis/commonFunctions.js');
const { allApiRoutes, apiCall, apiMethod } = require('../utils/apiService.js');
const { ErrorResponse, SuccessResponse } = require('../utils/response.js');

exports.deleteMultipleBet = async (req, res) => {
    try {
        let { matchId, deleteReason, urlData } = req.body;
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
            let promise = apiCall(
                apiMethod.post,
                url + allApiRoutes.deleteMultipleBet,
                { data: urlData[url], deleteReason, matchId }
            );
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
    
exports.deleteMultipleBetForOther = async (req, res) => {
    try {
        let { matchId, deleteReason, urlData } = req.body;
        let domain = expertDomain;
        let matchExist = {};
        try {
            matchExist = await apiCall(
                apiMethod.get,
                domain + allApiRoutes.MATCHES.otherMatchDetails + matchId
            );
        } catch (error) {
            throw error?.response?.data;
        }
        if (!Object.keys(urlData).length) {
            return ErrorResponse({ statusCode: 400, message: { msg: "invalid", keys: { name: "url data" } } }, req, res);
        }
        let promiseArray = []
        for (let url in urlData) {
            let promise = apiCall(
                apiMethod.post,
                url + allApiRoutes.deleteMultipleBetForOther,
                { data: urlData[url], deleteReason, matchId }
            );
            promiseArray.push(promise);
        }
        let failedUrl = new Set();
        await Promise.allSettled(promiseArray)
            .then(results => {
                let urlDataArray = Object.keys(urlData);
                results.forEach((result, index) => {
                    if(result.status === 'rejected'){
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

exports.deleteMultipleBetForRace = async (req, res) => {
    try {
        let { matchId, deleteReason, urlData } = req.body;
        let domain = expertDomain;
        let matchExist = {};
        try {
            matchExist = await apiCall(
                apiMethod.get,
                domain + allApiRoutes.MATCHES.raceDetails + matchId
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
            let promise = apiCall(
                apiMethod.post,
                url + allApiRoutes.deleteMultipleBetForRace,
                { data: urlData[url], deleteReason, matchId }
            );
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