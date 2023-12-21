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
        let domain = process.env.EXPERT_DOMAIN_URL
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
        let domain = process.env.EXPERT_DOMAIN_URL
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
        let domain = process.env.EXPERT_DOMAIN_URL
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

      let domain = process.env.EXPERT_DOMAIN_URL;
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


let expertDomain = process.env.EXPERT_DOMAIN_URL || 'http://localhost:6060'

exports.getNotification = async (req, res) => {
    try {
        let response = await apiCall(
            apiMethod.get,
            expertDomain + allApiRoutes.notification
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