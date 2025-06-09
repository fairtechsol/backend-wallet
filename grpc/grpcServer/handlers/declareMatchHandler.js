const { userRoleConstant, redisKeys, socketData, matchComissionTypeConstant, marketBetType, matchBettingType, unDeclare } = require("../../../config/contants");
const { logger } = require("../../../config/logger");
const { addResultFailed } = require("../../../services/betService");
const { insertCommissions, getCombinedCommission, deleteCommission } = require("../../../services/commissionService");
const { getUserDomainWithFaId } = require("../../../services/domainDataService");
const { getUserRedisMultiKeyData } = require("../../../services/redis/commonFunctions");
const { getUserBalanceDataByUserIds, updateUserDeclareBalanceData } = require("../../../services/userBalanceService");
const { getUser, getUsersWithoutCount } = require("../../../services/userService");
const { sendMessageToUser, broadcastEvent } = require("../../../sockets/socketManager");
const grpc = require("@grpc/grpc-js");
const { __mf } = require("i18n");
const { declareMatchHandler, unDeclareMatchHandler, unDeclareFinalMatchHandler, declareFinalMatchHandler } = require("../../grpcClient/handlers/wallet/declareMatchHandler");
const _ = require("lodash");
const { notifyTelegram } = require("../../../utils/telegramMessage");
const { roundToTwoDecimals } = require("../../../utils/mathUtils");
const { In } = require("typeorm");
const internalRedis = require("../../../config/internalRedisConnection");
const { convertToBatches } = require("../../../services/commonService");


exports.declareTournamentMatchResult = async (call) => {
  try {
    const { result, matchBettingDetails, userId, matchId, match, isMatchOdd } = call.request;
    const domainData = await getUserDomainWithFaId();


    const fgWallet = await getUser({
      roleName: userRoleConstant?.fairGameWallet
    }, ["id", "matchComissionType", "matchCommission"]);

    let fwProfitLoss = 0;
    let exposure = 0;

    let bulkCommission = [];
    let totalCommissions = [];
    let resultProfitLoss = 0;
    const promises = domainData.map(async (item) => {
      try {
        const response = await declareMatchHandler({
          result, marketDetail: matchBettingDetails, userId, matchId, match, isMatchOdd: isMatchOdd
        }, item?.domain);
        resultProfitLoss += roundToTwoDecimals(response?.fwProfitLoss || 0);
        return response;
      }
      catch (err) {
        logger.error({
          error: `Error at declare match result for the domain ${item?.domain}.`,
          stack: err.stack,
          message: err.message,
        });

        await addResultFailed({
          matchId: matchId,
          betId: matchBettingDetails?.id,
          userId: item?.userId?.id,
          result: result,
          createBy: userId
        });
        notifyTelegram(`Error at result declare tournament wallet side for domain ${item?.domain} on tournament ${matchBettingDetails?.id} for match ${matchId} ${JSON.stringify(err || "{}")}`);

        return {};
      }
    })
    const returnedVal = await Promise.all(promises);

    let response = returnedVal?.reduce((acc, curr) => {
      acc.fwProfitLoss = roundToTwoDecimals((acc.fwProfitLoss || 0) + parseFloat(curr?.fwProfitLoss || 0));
      acc.superAdminData = { ...(acc.superAdminData || {}), ...(curr?.superAdminData || {}) };
      acc.bulkCommission = Object.keys({ ...acc?.bulkCommission, ...curr?.bulkCommission }).reduce((result, key) => ({
        ...result,
        [key]: [...(acc?.bulkCommission?.[key] || []), ...(curr?.bulkCommission?.[key] || [])]
      }), {});

      acc.faAdminCal = {
        fwWalletDeduction: roundToTwoDecimals((acc?.faAdminCal?.fwWalletDeduction || 0) + parseFloat(curr?.faAdminCal?.fwWalletDeduction || 0)),
        commission: [...(acc?.faAdminCal?.commission || []), ...(curr?.faAdminCal?.commission || [])],
        userData: {
          ...acc?.faAdminCal?.userData,
          ...Object.keys({  ...curr?.faAdminCal?.userData }).reduce((res, key) => {
            const currUser = curr?.faAdminCal?.userData?.[key] || {};
            const prevUser = acc?.faAdminCal?.userData?.[key] || {};
            const calc = (field) => roundToTwoDecimals(parseFloat(prevUser[field] || 0) + parseFloat(currUser[field] || 0));
            if(Object.keys(currUser).length){
              res[key] = prevUser && Object.keys(prevUser).length
              ? {
                ...currUser,
                profitLoss: calc("profitLoss"),
                exposure: calc("exposure"),
                myProfitLoss: calc("myProfitLoss"),
                userOriginalProfitLoss: calc("userOriginalProfitLoss"),
              }
              : currUser;
            }
            return res;
          }, {})
        }

      }
      return acc;
    }, {});

    for (let userId in response?.superAdminData) {
      if (response?.superAdminData?.[userId]?.role == userRoleConstant.user) {
        response.superAdminData[userId].exposure = -response?.superAdminData?.[userId].exposure;
      }
      else {
        response.superAdminData[userId].exposure = -response?.superAdminData?.[userId].exposure;
        response.superAdminData[userId].myProfitLoss = -response?.superAdminData?.[userId].myProfitLoss;
        response.superAdminData[userId].balance = 0;
      }

      logger.info({
        message: "Updating user balance created by fgAdmin or wallet in declare: ",
        data: {
          superAdminData: response?.superAdminData?.[userId],
          userId: userId
        },
      });
    }
    const userUpdateDBData = response?.superAdminData;
    bulkCommission.push(...(response?.faAdminCal?.commission || []));

    const userData = response?.faAdminCal?.userData || {};

    const userIds = Object.keys(userData);
    userIds.push(fgWallet.id);

    const [users, userBalances, usersRedisData] = await Promise.all([
      getUsersWithoutCount({ id: In(userIds) }, ["matchComissionType", "matchCommission", "fwPartnership", "id"])
        .then(arr => arr.reduce((m, u) => (m[u.id] = u, m), {})),
      getUserBalanceDataByUserIds(userIds)
        .then(arr => arr.reduce((m, b) => (m[b.userId] = b, m), {})),
      getUserRedisMultiKeyData(userIds, ['profitLoss', 'myProfitLoss', 'exposure', 'totalCommission'])
    ]);
    const updatePipeline = internalRedis.pipeline();

    for (let parentUserId in userData) {

      const adminBalanceData = userData[parentUserId];
      if (!adminBalanceData || adminBalanceData.role !== userRoleConstant.fairGameAdmin) continue;

      fwProfitLoss += roundToTwoDecimals(adminBalanceData?.profitLoss || 0);
      totalCommissions.push(...(response?.faAdminCal?.commission || []));

      const parentUser = userBalances[parentUserId];
      const userCommission = users[parentUserId];
      const parentUserRedisData = usersRedisData[parentUserId];

      const parentProfitLoss = roundToTwoDecimals(parentUserRedisData?.profitLoss || parentUser?.profitLoss);
      const parentMyProfitLoss = roundToTwoDecimals(parentUserRedisData?.myProfitLoss || parentUser?.myProfitLoss);
      const parentExposure = roundToTwoDecimals(parentUserRedisData?.exposure || parentUser?.exposure);

      parentUser.profitLoss = roundToTwoDecimals(parentProfitLoss + parseFloat(adminBalanceData?.profitLoss));
      parentUser.myProfitLoss = roundToTwoDecimals(parentMyProfitLoss - parseFloat(adminBalanceData?.myProfitLoss));
      parentUser.exposure = roundToTwoDecimals(parentExposure - adminBalanceData?.exposure);

      let totalCommissionData = 0;
      const bulkCommissionEntries = Object.entries(response?.bulkCommission || {});


      bulkCommissionEntries?.forEach(([key, item]) => {
        if (userCommission?.matchComissionType == matchComissionTypeConstant.entryWise) {
          item?.filter((items) => items?.superParent == parentUserId)?.forEach((items) => {

            const commissionAmount = Math.abs(roundToTwoDecimals((parseFloat(items?.lossAmount) * parseFloat(userCommission?.matchCommission) / 100) * (parseFloat(userCommission.fwPartnership) / 100)));

            parentUser.totalCommission = parseFloat(parentUser.totalCommission) + commissionAmount;
            totalCommissionData += commissionAmount;

            bulkCommission.push({
              createBy: key,
              matchId: items.matchId,
              betId: items?.betId,
              betPlaceId: items?.betPlaceId,
              parentId: parentUserId,
              teamName: items?.sessionName,
              betPlaceDate: new Date(items?.betPlaceDate),
              odds: items?.odds,
              betType: items?.betType,
              stake: items?.stake,
              commissionAmount: Math.abs(roundToTwoDecimals(parseFloat(items?.lossAmount) * parseFloat(userCommission?.matchCommission) / 100)),
              partnerShip: userCommission.fwPartnership,
              matchName: match?.title,
              matchStartDate: new Date(match?.startAt),
              userName: items.userName,
              matchType: marketBetType.MATCHBETTING
            });
          });
        }
        else if (parseFloat(adminBalanceData?.userOriginalProfitLoss) < 0) {

          const commissionAmount = Math.abs(roundToTwoDecimals((parseFloat(adminBalanceData?.userOriginalProfitLoss) * parseFloat(userCommission?.matchCommission) / 100) * (parseFloat(userCommission.fwPartnership) / 100)));

          parentUser.totalCommission = parseFloat(parentUser.totalCommission) + commissionAmount;
          totalCommissionData += commissionAmount;

          bulkCommission.push({
            createBy: key,
            matchId: matchId,
            betId: matchBettingDetails?.id,
            parentId: parentUserId,
            commissionAmount: Math.abs(roundToTwoDecimals((parseFloat(adminBalanceData?.userOriginalProfitLoss)) * parseFloat(userCommission?.matchCommission) / 100)),
            partnerShip: userCommission.fwPartnership,
            matchName: match?.title,
            matchStartDate: new Date(match?.startAt),
            userName: null,
            stake: adminBalanceData?.userOriginalProfitLoss,
            matchType: marketBetType.MATCHBETTING
          });
        }
      });


      if (parentUser.exposure < 0) {
        logger.info({
          message: "Exposure in negative for user: ",
          data: {
            betId: matchBettingDetails?.id,
            matchId,
            parentUser,
          },
        });
        adminBalanceData.exposure += parentUser.exposure;
        parentUser.exposure = 0;
      }
      userUpdateDBData[parentUser.userId] = {
        profitLoss: roundToTwoDecimals(adminBalanceData?.profitLoss),
        myProfitLoss: -roundToTwoDecimals(adminBalanceData?.myProfitLoss),
        exposure: -adminBalanceData?.exposure,
        totalCommission: roundToTwoDecimals(totalCommissionData),
        balance: 0
      }

      logger.info({
        message: "Declare other match result db update for parent.",
        data: {
          betId: matchBettingDetails?.id,
          parentUser,
        },
      });

      if (Object.keys(parentUserRedisData || {}).length) {
        // queue Redis increments & key deletion
        updatePipeline
          .hincrbyfloat(parentUserId, 'profitLoss', roundToTwoDecimals(adminBalanceData?.profitLoss))
          .hincrbyfloat(parentUserId, 'myProfitLoss', -roundToTwoDecimals(adminBalanceData?.myProfitLoss))
          .hincrbyfloat(parentUserId, 'exposure', -adminBalanceData?.exposure)
          .hdel(parentUserId, `${matchBettingDetails?.id}${redisKeys.profitLoss}_${matchId}`);
      }

      exposure += parseFloat(adminBalanceData?.exposure);
    }

    fwProfitLoss += parseFloat(response?.faAdminCal?.fwWalletDeduction || 0);
    exposure += parseFloat(response?.faAdminCal?.userData?.[fgWallet.id]?.exposure || 0);

    const parentUser = userBalances[fgWallet.id];
    const parentUserRedisData = usersRedisData[fgWallet.id];

    const parentProfitLoss = roundToTwoDecimals(parentUserRedisData?.profitLoss || parentUser?.profitLoss);
    const parentMyProfitLoss = roundToTwoDecimals(parentUserRedisData?.myProfitLoss || parentUser?.myProfitLoss);
    const parentExposure = roundToTwoDecimals(parentUserRedisData?.exposure || parentUser?.exposure);

    parentUser.profitLoss = roundToTwoDecimals(parentProfitLoss + fwProfitLoss);
    parentUser.myProfitLoss = roundToTwoDecimals(parentMyProfitLoss - fwProfitLoss);
    parentUser.exposure = roundToTwoDecimals(parentExposure - exposure);


    const allChildUsers = await getUsersWithoutCount({ createBy: fgWallet.id }, ["id"]);
    const commissionWallet = await bulkCommission.filter((item) => !!allChildUsers.find((items) => items.id == item.parentId))?.reduce((prev, curr) => {
      return roundToTwoDecimals(prev + (curr.commissionAmount * curr.partnerShip / 100));
    }, 0);
    parentUser.totalCommission += commissionWallet;

    if (parentUser.exposure < 0) {
      logger.info({
        message: "Exposure in negative for user: ",
        data: {
          betId: matchBettingDetails?.id,
          matchId,
          parentUser,
        },
      });
      exposure += parentUser.exposure;
      parentUser.exposure = 0;
    }

    userUpdateDBData[parentUser.userId] = {
      profitLoss: roundToTwoDecimals(fwProfitLoss),
      myProfitLoss: -roundToTwoDecimals(fwProfitLoss),
      exposure: -exposure,
      totalCommission: commissionWallet,
      balance: 0
    }

    logger.info({
      message: "Declare tournament result db update for parent ",
      data: {
        betId: matchBettingDetails,
        parentUser,
      },
    });
    if (Object.keys(parentUserRedisData || {}).length) {
      updatePipeline
        .hincrbyfloat(parentUser.userId, 'profitLoss', roundToTwoDecimals(fwProfitLoss))
        .hincrbyfloat(parentUser.userId, 'myProfitLoss', -roundToTwoDecimals(fwProfitLoss))
        .hincrbyfloat(parentUser.userId, 'exposure', -exposure)
        .hdel(parentUser.userId, `${matchBettingDetails?.id}${redisKeys.profitLoss}_${matchId}`);
    }

    insertCommissions(bulkCommission);

    await updatePipeline.exec();

    const updateUserBatch = convertToBatches(500, userUpdateDBData);
    for (let i = 0; i < updateUserBatch.length; i++) {
      await updateUserDeclareBalanceData(updateUserBatch[i]);
    }


    broadcastEvent(socketData.matchResult, {
      matchId,
      betId: matchBettingDetails?.id,
      gameType: match?.matchType,
      betType: matchBettingType.tournament,
    });

    return { data: { profitLoss: resultProfitLoss, totalCommission: commissionWallet } }
  } catch (error) {
    logger.error({
      error: `Error at declare tournament match result for the expert.`,
      stack: error.stack,
      message: error.message,
    });
    // Handle any errors and return an error response
    throw {
      code: grpc.status.INTERNAL,
      message: error?.message || __mf("internalServerError"),
    };
  }
}

exports.unDeclareTournamentMatchResult = async (call) => {
  try {
    const { userId, matchId, match, matchBetting, isMatchOdd } = call.request;
    const domainData = await getUserDomainWithFaId();

    const fgWallet = await getUser({
      roleName: userRoleConstant?.fairGameWallet
    }, ["id", "matchComissionType", "matchCommission"]);

    let fwProfitLoss = 0;
    let profitLossDataAdmin = {};
    let profitLossDataWallet = {};
    let exposure = 0;
    const commissionData = await getCombinedCommission(matchBetting?.id);

    let fwData = new Set();
    let resultProfitLoss = 0;

    const promises = domainData.map(async (item) => {
      return await unDeclareMatchHandler({
        userId,
        matchId,
        match,
        matchBetting,
        isMatchOdd: isMatchOdd
      }, item?.domain).then((data) => {
        resultProfitLoss += parseFloat(parseFloat((data?.fwProfitLoss || 0)).toFixed(2));
        return data;
      }).catch(async (err) => {
        logger.error({
          error: `Error at un Declare match result for the domain ${item?.domain}.`,
          stack: err.stack,
          message: err.message,
        });

        await addResultFailed({
          matchId: matchId,
          betId: matchBetting?.id,
          userId: item?.userId?.id,
          result: unDeclare,
          createBy: userId
        })
        notifyTelegram(`Error at result undeclare tournament wallet side for domain ${item?.domain} on tournament ${matchBetting?.id} for match ${matchId} ${JSON.stringify(err || "{}")}`);

        return {};
      });
    });

    const returnedVal = await Promise.all(promises);
    let response = returnedVal?.reduce((acc, curr) => {
      acc.fwProfitLoss = roundToTwoDecimals((acc.fwProfitLoss || 0) + parseFloat(curr?.fwProfitLoss || 0));
      acc.superAdminData = { ...(acc.superAdminData || {}), ...(curr?.superAdminData || {}) };
      acc.faAdminCal = {
        fwWalletDeduction: roundToTwoDecimals((acc?.faAdminCal?.fwWalletDeduction || 0) + parseFloat(curr?.faAdminCal?.fwWalletDeduction || 0)),
        admin: _.mergeWith({}, (acc?.faAdminCal?.admin || {}), (curr?.faAdminCal?.admin || {}), (a, b) => (typeof a === 'number' && typeof b === 'number' ? parseFloat(a) + parseFloat(b) : undefined)),
        wallet: _.mergeWith({}, (acc?.faAdminCal?.wallet || {}), (curr?.faAdminCal?.wallet || {}), (a, b) => (typeof a === 'number' && typeof b === 'number' ? parseFloat(a) + parseFloat(b) : undefined))
      }
      return acc;
    }, {})

    for (let userIds in response?.superAdminData) {
      if (response?.superAdminData?.[userIds]?.role == userRoleConstant.user) {
        response.superAdminData[userIds].profitLoss = -response?.superAdminData?.[userIds].profitLoss;
        response.superAdminData[userIds].myProfitLoss = -response?.superAdminData?.[userIds].myProfitLoss;
      } else {
        response.superAdminData[userIds].profitLoss = -response?.superAdminData?.[userIds].profitLoss;
        response.superAdminData[userIds].balance = 0;
      }

      response.superAdminData[userIds].totalCommission = -roundToTwoDecimals(response.superAdminData[userIds].totalCommission || 0);

      logger.info({
        message: "Updating user balance created by fgadmin or wallet in undeclare: ",
        data: {
          superAdminData: response?.superAdminData?.[userIds],
          userId: userIds
        },
      });
    }

    const userUpdateDBData = response?.superAdminData;
    const userIds = Object.keys(response?.faAdminCal.admin);
    userIds.push(fgWallet.id);

    const [userBalances, usersRedisData] = await Promise.all([
      getUserBalanceDataByUserIds(userIds)
        .then(arr => arr.reduce((m, b) => (m[b.userId] = b, m), {})),
      getUserRedisMultiKeyData(userIds, ['profitLoss', 'myProfitLoss', 'exposure', 'totalCommission'])
    ]);
    const updatePipeline = internalRedis.pipeline();
    const userData = response?.faAdminCal?.admin || {};


    for (let parentUserId in userData) {
      const adminBalanceData = userData[parentUserId];
      if (!adminBalanceData || adminBalanceData.role !== userRoleConstant.fairGameAdmin) continue;

      fwProfitLoss += parseFloat(adminBalanceData?.profitLoss);

      const parentUser = userBalances[parentUserId];
      const parentUserRedisData = usersRedisData[parentUserId];

      const parentProfitLoss = roundToTwoDecimals(parentUserRedisData?.profitLoss || parentUser?.profitLoss);
      const parentMyProfitLoss = roundToTwoDecimals(parentUserRedisData?.myProfitLoss || parentUser?.myProfitLoss);
      const parentExposure = roundToTwoDecimals(parentUserRedisData?.exposure || parentUser?.exposure);

      parentUser.profitLoss = roundToTwoDecimals(parentProfitLoss - parseFloat(adminBalanceData?.profitLoss));
      parentUser.myProfitLoss = roundToTwoDecimals(parentMyProfitLoss + parseFloat(adminBalanceData?.myProfitLoss));
      parentUser.exposure = roundToTwoDecimals(parentExposure + parseFloat(adminBalanceData?.exposure));

      let totalCommissionData = 0;

      if (!fwData.has(parentUserId)) {
        fwData.add(parentUserId);
        const parentCommission = commissionData?.find((item) => item?.userId == parentUser.userId);
        if (parentCommission) {
          parentUser.totalCommission = roundToTwoDecimals(parentUser.totalCommission - parseFloat(parentCommission?.amount || 0));
          totalCommissionData += parseFloat(parentCommission?.amount || 0);
        }
      }

      if (parentUser.exposure < 0) {
        logger.info({
          message: "Exposure in negative for user: ",
          data: {
            matchId,
            parentUser,
          },
        });
        adminBalanceData.exposure += parentUser.exposure;
        parentUser.exposure = 0;
      }

      userUpdateDBData[parentUser.userId] = {
        profitLoss: -roundToTwoDecimals(adminBalanceData?.profitLoss),
        myProfitLoss: roundToTwoDecimals(adminBalanceData?.myProfitLoss),
        exposure: adminBalanceData?.exposure,
        totalCommission: -roundToTwoDecimals(totalCommissionData),
        balance: 0
      }

      logger.info({
        message: "Un declare result db update for parent ",
        data: {
          parentUser,
        },
      });

      let { exposure: tempExposure, profitLoss: tempProfitLoss, myProfitLoss: tempMyProfitLoss, role, ...adminPLData } = adminBalanceData;

      Object.keys(adminPLData)?.forEach((pLData) => {
        if (profitLossDataAdmin?.[parentUser.userId]) {
          if (profitLossDataAdmin?.[parentUser.userId]?.[pLData]) {
            Object.keys(adminPLData?.[pLData])?.forEach((items) => {
              if (profitLossDataAdmin?.[parentUser.userId]?.[pLData]?.[items]) {
                profitLossDataAdmin[parentUser.userId][pLData][items] += adminPLData?.[pLData]?.[items];
                profitLossDataAdmin[parentUser.userId][pLData][items] = roundToTwoDecimals(profitLossDataAdmin[parentUser.userId][pLData][items]);
              }
              else {
                profitLossDataAdmin[parentUser.userId][pLData][items] = roundToTwoDecimals(adminPLData?.[pLData]?.[items]);
              }
            });
          }
          else {
            profitLossDataAdmin[parentUser.userId][pLData] = adminPLData?.[pLData];
          }
        }
        else {
          profitLossDataAdmin[parentUser.userId] = {};
          profitLossDataAdmin[parentUser.userId][pLData] = adminPLData?.[pLData];
        }
      });

      let settingRedisDataObj = { ...profitLossDataAdmin[parentUser.userId] };
      Object.keys(settingRedisDataObj)?.forEach((items) => {
        settingRedisDataObj[items] = JSON.stringify(settingRedisDataObj[items]);
      });

      if (Object.keys(parentUserRedisData||{}).length) {
        updatePipeline
          .hincrbyfloat(parentUserId, 'profitLoss', -roundToTwoDecimals(adminBalanceData?.profitLoss))
          .hincrbyfloat(parentUserId, 'myProfitLoss', roundToTwoDecimals(adminBalanceData?.myProfitLoss))
          .hincrbyfloat(parentUserId, 'exposure', adminBalanceData?.exposure)
          .hmset(parentUserId, settingRedisDataObj);
      }

      sendMessageToUser(parentUser.userId, socketData.matchResultUnDeclare, {
        matchId,
        betId: matchBetting?.id,
        profitLossData: profitLossDataAdmin[parentUser.userId],
        gameType: match?.matchType,
        betType: matchBettingType.tournament,
      });
      exposure += parseFloat(adminBalanceData?.["exposure"]);

    }
    fwProfitLoss -= roundToTwoDecimals(response?.faAdminCal?.fwWalletDeduction || 0);
    let { exposure: tempExposure, profitLoss: tempProfitLoss, myProfitLoss: tempMyProfitLoss, role, ...adminPLData } = response?.faAdminCal?.wallet;


    Object.keys(adminPLData)?.forEach((pLData) => {

      if (profitLossDataWallet?.[pLData]) {
        Object.keys(adminPLData?.[pLData])?.forEach((items) => {
          if (profitLossDataWallet?.[pLData]?.[items]) {
            profitLossDataWallet[pLData][items] += adminPLData?.[pLData]?.[items];
            profitLossDataWallet[pLData][items] = roundToTwoDecimals(profitLossDataWallet[pLData][items]);
          }
          else {
            profitLossDataWallet[pLData][items] = roundToTwoDecimals(adminPLData?.[pLData]?.[items]);
          }
        });
      }
      else {
        profitLossDataWallet[pLData] = adminPLData?.[pLData];
      }
    });
    exposure += parseFloat(response?.faAdminCal?.admin?.[fgWallet.id]?.exposure || 0);

    const parentUser = userBalances[fgWallet.id];
    const parentUserRedisData = usersRedisData[fgWallet.id];

    const parentProfitLoss = roundToTwoDecimals(parentUserRedisData?.profitLoss || parentUser?.profitLoss);
    const parentMyProfitLoss = roundToTwoDecimals(parentUserRedisData?.myProfitLoss || parentUser?.myProfitLoss);
    const parentExposure = roundToTwoDecimals(parentUserRedisData?.exposure || parentUser?.exposure);

    parentUser.profitLoss = roundToTwoDecimals(parentProfitLoss - fwProfitLoss);
    parentUser.myProfitLoss = roundToTwoDecimals(parentMyProfitLoss + fwProfitLoss);
    parentUser.exposure = roundToTwoDecimals(parentExposure + exposure);

    const allChildUsers = await getUsersWithoutCount({ createBy: fgWallet.id }, ["id"]);
    const commissionWallet = await commissionData.filter((item) => allChildUsers.find((items) => items.id == item.userId) != undefined)?.reduce((prev, curr) => {
      return roundToTwoDecimals(prev + parseFloat(curr.amount))
    }, 0);
    parentUser.totalCommission -= commissionWallet;

    if (parentUser.exposure < 0) {
      logger.info({
        message: "Exposure in negative for user: ",
        data: {
          matchId,
          parentUser,
        },
      });
      exposure += parentUser.exposure;
      parentUser.exposure = 0;
    }
    userUpdateDBData[parentUser.userId] = {
      profitLoss: -roundToTwoDecimals(fwProfitLoss),
      myProfitLoss: roundToTwoDecimals(fwProfitLoss),
      exposure: exposure,
      totalCommission: -commissionWallet,
      balance: 0
    }

    logger.info({
      message: "Un declare result db update for parent ",
      data: {
        parentUser,
      },
    });

    if (
      Object.keys(parentUserRedisData||{}).length
    ) {

      let settingRedisDataObj = { ...profitLossDataWallet };
      Object.keys(settingRedisDataObj)?.forEach((items) => {
        settingRedisDataObj[items] = JSON.stringify(settingRedisDataObj[items]);
      });

      updatePipeline
        .hincrbyfloat(parentUser.userId, 'profitLoss', -roundToTwoDecimals(fwProfitLoss))
        .hincrbyfloat(parentUser.userId, 'myProfitLoss', roundToTwoDecimals(fwProfitLoss))
        .hincrbyfloat(parentUser.userId, 'exposure', exposure)
        .hmset(parentUser.userId, settingRedisDataObj);

    }
    sendMessageToUser(parentUser.userId, socketData.matchResultUnDeclare, {
      matchId,
      profitLossData: profitLossDataWallet?.[`${matchBetting?.id}${redisKeys.profitLoss}_${matchId}`],
      betId: matchBetting?.id,
      gameType: match?.matchType,
      betType: matchBettingType.tournament,

    });
    deleteCommission(matchBetting?.id);

    await updatePipeline.exec();

    const updateUserBatch = convertToBatches(500, userUpdateDBData);
    for (let i = 0; i < updateUserBatch.length; i++) {
      await updateUserDeclareBalanceData(updateUserBatch[i]);
    }


    return { data: { profitLoss: resultProfitLoss, profitLossWallet: JSON.stringify(profitLossDataWallet) } };

  } catch (error) {
    logger.error({
      error: `Error at un declare match result for the expert.`,
      stack: error.stack,
      message: error.message,
    });
    // Handle any errors and return an error response
    throw {
      code: grpc.status.INTERNAL,
      message: error?.message || __mf("internalServerError"),
    };
  }
}


exports.declareFinalMatchResult = async (call) => {
  try {
    const { matchId, matchType } = call.request;
    const domainData = await getUserDomainWithFaId();

    // Run handlers concurrently using Promise.all
    await Promise.all(
      domainData?.map(async (item) => {
        try {
          await declareFinalMatchHandler({ matchId, matchType }, item?.domain);
        } catch (err) {
          logger.error({
            error: `Error at declare match result for the domain ${item?.domain}.`,
            stack: err.stack,
            message: err.message,
          });
          notifyTelegram(`Error at result declare final match wallet side for domain ${item?.domain} for match ${matchId} ${JSON.stringify(err || "{}")}`);

          // Error caught so that Promise.all continues
        }
      }) || []
    );

    broadcastEvent(socketData.matchResult, {
      matchId,
      gameType: matchType,
      isMatchDeclare: true,
    });

    return {};
  } catch (error) {
    logger.error({
      error: `Error at declare tournament match result for the expert.`,
      stack: error.stack,
      message: error.message,
    });
    throw {
      code: grpc.status.INTERNAL,
      message: error?.message || __mf("internalServerError"),
    };
  }
};

exports.unDeclareFinalMatchResult = async (call) => {
  try {
    const { matchId, matchType } = call.request;
    const domainData = await getUserDomainWithFaId();

    // Process un-declaration concurrently with Promise.all
    await Promise.all(
      domainData?.map(async (item) => {
        try {
          await unDeclareFinalMatchHandler({ matchId, matchType }, item?.domain);
        } catch (err) {
          logger.error({
            error: `Error at un Declare match result for the domain ${item?.domain}.`,
            stack: err.stack,
            message: err.message,
          });
          notifyTelegram(`Error at result undeclare final match wallet side for domain ${item?.domain} for match ${matchId} ${JSON.stringify(err || "{}")}`);

          // Error caught so that Promise.all continues
        }
      }) || []
    );

    broadcastEvent(socketData.matchResultUnDeclare, {
      matchId,
      gameType: matchType,
    });

    return {};
  } catch (error) {
    logger.error({
      error: `Error at un declare match result for the expert.`,
      stack: error.stack,
      message: error.message,
    });
    throw {
      code: grpc.status.INTERNAL,
      message: error?.message || __mf("internalServerError"),
    };
  }
};
