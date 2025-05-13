const grpc = require("@grpc/grpc-js");
const { __mf } = require("i18n");
const { logger } = require("../../../config/logger");
const { updateUserBalanceByUserId } = require("../../../services/userBalanceService");
const { getParentUsers, updateUser } = require("../../../services/userService");

exports.updateUserBalanceBySA = async (call) => {
    try {

        const { userId, balance } = call.request;

        await updateUserBalanceByUserId(userId, {
            currentBalance: balance
        });

        return {}
    } catch (error) {
        logger.error({
            error: `Error at update super admin balance.`,
            stack: error.stack,
            message: error.message,
        });
        throw {
            code: grpc.status.INTERNAL,
            message: err?.message || __mf("internalServerError"),
        };
    }
}

exports.getPartnershipId = async (call) => {
    try {
        // Destructure request body
        const { userId } = call.request;

        const partnershipIds = await getParentUsers(userId);
        return { data: JSON.stringify(partnershipIds) }

    } catch (error) {
        // Log any errors that occur
        throw {
            code: grpc.status.INTERNAL,
            message: err?.message || __mf("internalServerError"),
        };
    }
}

// Controller function for locking/unlocking a super admin
exports.lockUnlockUserByUserPanel = async (call) => {
    try {
        // Extract relevant data from the request body and user object
        const { userId, userBlock, parentId, autoBlock } = call.request;

        await updateUser(userId, {
            userBlock: userBlock,
            userBlockedBy: parentId,
            autoBlock: autoBlock
        });

        // Return success response
        return {}
    } catch (error) {
        throw {
            code: grpc.status.INTERNAL,
            message: err?.message || __mf("internalServerError"),
        };
    }
};