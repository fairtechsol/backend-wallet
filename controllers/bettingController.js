const { object } = require('joi');
const { expertDomain } = require('../config/contants.js');
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
        } catch (error) {
            throw error?.response?.data;
        }
        if (!object.keys(urlData).length) {
            return ErrorResponse(
                { statusCode: 400, message: { msg: "invalid", keys: { name: "url data" } } },
                req,
                res
            );
        }
        let promiseArray = []
        for (let url in urlData) {
            console.log(key, urlData[url]);
            let promise = apiCall(
                apiMethod.post,
                url + allApiRoutes.deleteMultipleBet,
                urlData[url]
            );
            promiseArray.push(promise);
        }
        let failedUrl = new Set();
        await Promise.allSettled(promiseArray)
            .then(results => {
                let urlDataArray = object.keys(urlData);
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
        return SuccessResponse({
            statusCode: 200, message: { msg: "updated", keys: { name: "Bet" } }
        }, req, res)
    } catch (err) {
        return ErrorResponse(err, req, res)
    }

};


