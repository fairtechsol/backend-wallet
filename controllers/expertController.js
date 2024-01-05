const { expertDomain } = require("../config/contants");
const { logger } = require("../config/logger");
const { apiCall, apiMethod, allApiRoutes } = require("../utils/apiService");
const { SuccessResponse, ErrorResponse } = require("../utils/response");
exports.createUser = async (req, res) => {
    try {
        // Destructuring request body for relevant user information
        let { userName, fullName, password, phoneNumber, city, allPrivilege, addMatchPrivilege, betFairMatchPrivilege, bookmakerMatchPrivilege, sessionMatchPrivilege, confirmPassword } = req.body;
        let reqUser = req.user;

        let userData = {
            userName,
            fullName,
            password,
            phoneNumber,
            city,
            createBy: reqUser.id,
            allPrivilege,
            addMatchPrivilege,
            betFairMatchPrivilege,
            bookmakerMatchPrivilege,
            sessionMatchPrivilege,
            confirmPassword
        };
        let domain = expertDomain;
        let apiResponse = {}
        try {
            apiResponse = await apiCall(apiMethod.post, domain + allApiRoutes.EXPERTS.add, userData)
        } catch (error) {
            throw error?.response?.data
        }
        // Send success response with the created user data
        return SuccessResponse({ statusCode: 200, message: { msg: "created", keys: { name: "User" } }, data: apiResponse.data }, req, res
        );
    } catch (err) {
        // Handle any errors and return an error response
        return ErrorResponse(err, req, res);
    }
};

exports.updateUser = async (req, res) => {
    try {
        // Destructuring request body for relevant user information
        let { id, fullName, phoneNumber, city, allPrivilege, addMatchPrivilege, betFairMatchPrivilege, bookmakerMatchPrivilege, sessionMatchPrivilege } = req.body;
        let reqUser = req.user;

        let userData = {
            id,
            fullName,
            phoneNumber,
            city,
            createBy: reqUser.id,
            allPrivilege,
            addMatchPrivilege,
            betFairMatchPrivilege,
            bookmakerMatchPrivilege,
            sessionMatchPrivilege
        };
        let domain = expertDomain;
        let apiResponse = {}
        try {
            apiResponse = await apiCall(apiMethod.post, domain + allApiRoutes.EXPERTS.update, userData)
        } catch (error) {
            throw error?.response?.data
        }
        // Send success response with the created user data
        return SuccessResponse({ statusCode: 200, message: { msg: "updated", keys: { name: "User" } }, data: apiResponse.data }, req, res
        );
    } catch (err) {
        // Handle any errors and return an error response
        return ErrorResponse(err, req, res);
    }
};
exports.changePassword = async (req, res) => {
    try {
        // Destructuring request body for relevant user information
        let { password, confirmPassword, id } = req.body;
        let reqUser = req.user;
        let userData = {
            password, confirmPassword, id,
            createBy: reqUser.id
        };
        let domain = expertDomain;
        let apiResponse = {}
        try {
            apiResponse = await apiCall(apiMethod.post, domain + allApiRoutes.EXPERTS.changePassword, userData)
        } catch (error) {
            throw error?.response?.data
        }
        // Send success response with the created user data
        return SuccessResponse({ statusCode: 200, message: { msg: "updated", keys: { name: "Password" } }, data: apiResponse.data }, req, res
        );
    } catch (err) {
        // Handle any errors and return an error response
        return ErrorResponse(err, req, res);
    }
};

exports.expertList = async (req, res, next) => {
    try {
      let { id: loginId } = req.user;
      let { userName, offset, limit } = req.query;

      let domain = expertDomain;
      let apiResponse = {};

      const queryParams = {
        userName,
        offset,
        limit,
        loginId,
      };

      // Construct the URL with query parameters
      const url = new URL(
        domain + allApiRoutes.EXPERTS.expertList
      );
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value) {
          url.searchParams.append(key, value);
        }
      });

      try {
        apiResponse = await apiCall(
          apiMethod.get,
          url
        );
      } catch (error) {
        throw error?.response?.data;
      }

      return SuccessResponse(
        {
          statusCode: 200,
          message: { msg: "fetched", keys: { name: "Expert list" } },
          data: apiResponse?.data,
        },
        req,
        res
      );
    } catch (error) {
      return ErrorResponse(error, req, res);
    }
  };

exports.getNotification = async (req, res) => {
    try {
        let response = await apiCall(
            apiMethod.get,
            expertDomain + allApiRoutes.EXPERTS.notification
        );
        return SuccessResponse(
            {
              statusCode: 200,
              data: response.data
            },
            req,
            res
          );
    } catch (err) { 
        return ErrorResponse(err?.response?.data, req, res);
    }
};



exports.getMatchCompetitionsByType = async (req, res) => {
    try {
      const { type } = req.params;
  
      let response = await apiCall(
        apiMethod.get,
        expertDomain + allApiRoutes.EXPERTS.getCompetitionList+ `/${type}`
    );
  
      return SuccessResponse(
        {
          statusCode: 200,
          data: response.data,
        },
        req,
        res
      );
    } catch (err) {
      logger.error({
        error: `Error at list competition for the user.`,
        stack: err.stack,
        message: err.message,
      });
      // Handle any errors and return an error response
      return ErrorResponse(err?.response?.data, req, res);
    }
  };
  
  
  exports.getMatchDatesByCompetitionId = async (req, res) => {
    try {
      const { competitionId } = req.params;
  
      let response = await apiCall(
        apiMethod.get,
        expertDomain + allApiRoutes.EXPERTS.getDatesByCompetition+ `/${competitionId}`
    );
  
      return SuccessResponse(
        {
          statusCode: 200,
          data: response?.data,
        },
        req,
        res
      );
    } catch (err) {
      logger.error({
        error: `Error at list date for the user.`,
        stack: err.stack,
        message: err.message,
      });
      // Handle any errors and return an error response
      return ErrorResponse(err?.response?.data, req, res);
    }
  };
  
  exports.getMatchDatesByCompetitionIdAndDate = async (req, res) => {
    try {
      const { competitionId,date } = req.params;
  
      
      let response = await apiCall(
        apiMethod.get,
        expertDomain + allApiRoutes.EXPERTS.getMatchByCompetitionAndDate+ `/${competitionId}/${new Date(date)}`
    );
  
      return SuccessResponse(
        {
          statusCode: 200,
          data: response?.data,
        },
        req,
        res
      );
    } catch (err) {
      logger.error({
        error: `Error at list match for the user.`,
        stack: err.stack,
        message: err.message,
      });
      // Handle any errors and return an error response
      return ErrorResponse(err?.response?.data, req, res);
    }
  };