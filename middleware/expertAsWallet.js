const { userRoleConstant } = require("../config/contants");
const { getUser } = require("../services/userService");

exports.expertToWalletAuth = async (req, res, next) => {
    req.user = await getUser({ roleName: userRoleConstant.fairGameWallet }, ["id", "roleName"]);
    next();
}