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

    // Initialize aggregated response
    const response = {
      fwProfitLoss: 0,
      superAdminData: {},
      bulkCommission: {},
      faAdminCal: {
        fwWalletDeduction: 0,
        commission: [],
        userData: {}
      }
    };
    let resultProfitLoss = 0;

    // Process domains in batches
    const BATCH_SIZE = process.env.RESULT_BATCH_SIZE || 10;
    for (let i = 0; i < domainData.length; i += BATCH_SIZE) {
      const batch = domainData.slice(i, i + BATCH_SIZE);
      const batchPromises = batch.map(item =>
        declareMatchHandler({
          result,
          marketDetail: matchBettingDetails,
          userId,
          matchId,
          match,
          isMatchOdd
        }, item?.domain)
          .catch(err => {
            logger.error({
              error: `Error at declare match result for domain ${item?.domain}.`,
              stack: err.stack,
              message: err.message,
            });

            addResultFailed({
              matchId: matchId,
              betId: matchBettingDetails?.id,
              userId: item?.userId?.id,
              result: result,
              createBy: userId
            });

            notifyTelegram(`Error at result declare tournament wallet side for domain ${item?.domain} on tournament ${matchBettingDetails?.id} for match ${matchId} ${JSON.stringify(err || "{}")}`);
            return null;
          })
      );

      const batchResults = await Promise.all(batchPromises);

      // Process batch results incrementally
      for (const curr of batchResults) {
        if (!curr) continue;

        resultProfitLoss = roundToTwoDecimals(resultProfitLoss + (curr.fwProfitLoss || 0));

        // Merge response data incrementally
        response.fwProfitLoss = roundToTwoDecimals(response.fwProfitLoss + (curr.fwProfitLoss || 0));
        response.superAdminData = { ...response.superAdminData, ...(curr.superAdminData || {}) };

        // Merge bulkCommission
        for (const [key, items] of Object.entries(curr.bulkCommission || {})) {
          if (!response.bulkCommission[key]) response.bulkCommission[key] = [];
          response.bulkCommission[key].push(...items);
        }

        // Merge faAdminCal
        const cal = curr.faAdminCal || {};
        response.faAdminCal.fwWalletDeduction = roundToTwoDecimals(
          response.faAdminCal.fwWalletDeduction + (cal.fwWalletDeduction || 0)
        );

        if (cal.commission && cal.commission.length) {
          response.faAdminCal.commission.push(...cal.commission);
        }

        // Merge userData
        for (const [userId, userData] of Object.entries(cal.userData || {})) {
          if (!response.faAdminCal.userData[userId]) {
            response.faAdminCal.userData[userId] = { ...userData };
          } else {
            const existing = response.faAdminCal.userData[userId];
            existing.profitLoss = roundToTwoDecimals((existing.profitLoss || 0) + (userData.profitLoss || 0));
            existing.exposure = roundToTwoDecimals((existing.exposure || 0) + (userData.exposure || 0));
            existing.myProfitLoss = roundToTwoDecimals((existing.myProfitLoss || 0) + (userData.myProfitLoss || 0));
            existing.userOriginalProfitLoss = roundToTwoDecimals(
              (existing.userOriginalProfitLoss || 0) + (userData.userOriginalProfitLoss || 0)
            );
          }
        }
      }

      // Clear references for garbage collection
      batch.length = 0;
      batchPromises.length = 0;
      batchResults.length = 0;
    }

    // Process superAdminData
    for (let userId in response.superAdminData) {
      const data = response.superAdminData[userId];
      if (data.role === userRoleConstant.user) {
        data.exposure = -data.exposure;
      } else {
        data.exposure = -data.exposure;
        data.myProfitLoss = -data.myProfitLoss;
        data.balance = 0;
      }
    }

    const userUpdateDBData = response.superAdminData;
    const bulkCommission = [...(response.faAdminCal.commission || [])];
    const userData = response.faAdminCal.userData || {};

    const userIds = Object.keys(userData);
    userIds.push(fgWallet.id);

    // Optimized user data fetching
    const [users, userBalances, usersRedisData] = await Promise.all([
      getUsersWithoutCount({ id: In(userIds) }, ["matchComissionType", "matchCommission", "fwPartnership", "id"])
        .then(arr => arr.reduce((map, u) => map.set(u.id, u), new Map())),
      getUserBalanceDataByUserIds(userIds)
        .then(arr => arr.reduce((map, b) => map.set(b.userId, b), new Map())),
      getUserRedisMultiKeyData(userIds, ['profitLoss', 'myProfitLoss', 'exposure', 'totalCommission'])
    ]);

    const updatePipeline = internalRedis.pipeline();
    const totalCommissions = [];
    let fwProfitLoss = 0;
    let exposure = 0;

    // Process admin users
    for (const [parentUserId, adminBalanceData] of Object.entries(userData)) {
      if (!adminBalanceData || adminBalanceData.role !== userRoleConstant.fairGameAdmin) continue;

      fwProfitLoss += roundToTwoDecimals(adminBalanceData?.profitLoss || 0);
      totalCommissions.push(...(response?.faAdminCal?.commission || []));

      const parentUser = userBalances.get(parentUserId);
      const userCommission = users.get(parentUserId);
      const parentUserRedisData = usersRedisData[parentUserId];

      if (!parentUser) continue;

      const parentProfitLoss = roundToTwoDecimals(parentUserRedisData?.profitLoss || parentUser?.profitLoss || 0);
      const parentMyProfitLoss = roundToTwoDecimals(parentUserRedisData?.myProfitLoss || parentUser?.myProfitLoss || 0);
      const parentExposure = roundToTwoDecimals(parentUserRedisData?.exposure || parentUser?.exposure || 0);

      parentUser.profitLoss = roundToTwoDecimals(parentProfitLoss + (adminBalanceData?.profitLoss || 0));
      parentUser.myProfitLoss = roundToTwoDecimals(parentMyProfitLoss - (adminBalanceData?.myProfitLoss || 0));
      parentUser.exposure = roundToTwoDecimals(parentExposure - (adminBalanceData?.exposure || 0));

      let totalCommissionData = 0;
      const bulkCommissionEntries = Object.entries(response.bulkCommission || {});

      for (const [key, items] of bulkCommissionEntries) {
        if (userCommission?.matchComissionType === matchComissionTypeConstant.entryWise) {
          for (const item of items.filter(i => i?.superParent === parentUserId)) {
            const commissionAmount = Math.abs(roundToTwoDecimals(
              (parseFloat(item?.lossAmount || 0) *
                (parseFloat(userCommission?.matchCommission || 0) / 100) *
                (parseFloat(userCommission.fwPartnership || 0) / 100
                ))));

            parentUser.totalCommission = parseFloat(parentUser.totalCommission || 0) + commissionAmount;
            totalCommissionData += commissionAmount;

            bulkCommission.push({
              createBy: key,
              matchId: item.matchId,
              betId: item?.betId,
              betPlaceId: item?.betPlaceId,
              parentId: parentUserId,
              teamName: item?.sessionName,
              betPlaceDate: new Date(item?.betPlaceDate),
              odds: item?.odds,
              betType: item?.betType,
              stake: item?.stake,
              commissionAmount: Math.abs(roundToTwoDecimals(
                parseFloat(item?.lossAmount || 0) *
                parseFloat(userCommission?.matchCommission || 0) / 100
              )),
              partnerShip: userCommission.fwPartnership,
              matchName: match?.title,
              matchStartDate: new Date(match?.startAt),
              userName: item.userName,
              matchType: marketBetType.MATCHBETTING
            });
          }
        } else if (parseFloat(adminBalanceData?.userOriginalProfitLoss || 0) < 0) {
          const commissionAmount = Math.abs(roundToTwoDecimals(
            (parseFloat(adminBalanceData?.userOriginalProfitLoss || 0) *
              (parseFloat(userCommission?.matchCommission || 0) / 100) *
              (parseFloat(userCommission.fwPartnership || 0) / 100
              ))));

          parentUser.totalCommission = parseFloat(parentUser.totalCommission || 0) + commissionAmount;
          totalCommissionData += commissionAmount;

          bulkCommission.push({
            createBy: key,
            matchId: matchId,
            betId: matchBettingDetails?.id,
            parentId: parentUserId,
            commissionAmount: Math.abs(roundToTwoDecimals(
              (parseFloat(adminBalanceData?.userOriginalProfitLoss || 0) *
                parseFloat(userCommission?.matchCommission || 0) / 100
              ))),
            partnerShip: userCommission.fwPartnership,
            matchName: match?.title,
            matchStartDate: new Date(match?.startAt),
            userName: null,
            stake: adminBalanceData?.userOriginalProfitLoss,
            matchType: marketBetType.MATCHBETTING
          });
        }
      }

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

      userUpdateDBData[parentUserId] = {
        profitLoss: roundToTwoDecimals(adminBalanceData?.profitLoss || 0),
        myProfitLoss: -roundToTwoDecimals(adminBalanceData?.myProfitLoss || 0),
        exposure: -(adminBalanceData?.exposure || 0),
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
        const baseKey = `match:${parentUserId}:${matchId}:${matchBettingDetails?.id}:profitLoss`;

        // queue Redis increments & key deletion
        updatePipeline
          .hincrbyfloat(parentUserId, 'profitLoss', roundToTwoDecimals(adminBalanceData?.profitLoss || 0))
          .hincrbyfloat(parentUserId, 'myProfitLoss', -roundToTwoDecimals(adminBalanceData?.myProfitLoss || 0))
          .hincrbyfloat(parentUserId, 'exposure', -(adminBalanceData?.exposure || 0))
          .hdel(baseKey);
      }

      exposure += parseFloat(adminBalanceData?.exposure || 0);
    }

    // Process fair game wallet
    fwProfitLoss += parseFloat(response.faAdminCal?.fwWalletDeduction || 0);
    exposure += parseFloat(userData[fgWallet.id]?.exposure || 0);

    const parentUser = userBalances.get(fgWallet.id);
    const parentUserRedisData = usersRedisData[fgWallet.id];

    const parentProfitLoss = roundToTwoDecimals(parentUserRedisData?.profitLoss || parentUser?.profitLoss || 0);
    const parentMyProfitLoss = roundToTwoDecimals(parentUserRedisData?.myProfitLoss || parentUser?.myProfitLoss || 0);
    const parentExposure = roundToTwoDecimals(parentUserRedisData?.exposure || parentUser?.exposure || 0);

    parentUser.profitLoss = roundToTwoDecimals(parentProfitLoss + fwProfitLoss);
    parentUser.myProfitLoss = roundToTwoDecimals(parentMyProfitLoss - fwProfitLoss);
    parentUser.exposure = roundToTwoDecimals(parentExposure - exposure);

    const allChildUsers = await getUsersWithoutCount({ createBy: fgWallet.id }, ["id"]);
    const commissionWallet = bulkCommission
      .filter(item => allChildUsers.some(u => u.id === item.parentId))
      .reduce((sum, curr) => {
        return roundToTwoDecimals(sum + (curr.commissionAmount * (curr.partnerShip || 0) / 100));
      }, 0);

    parentUser.totalCommission = (parentUser.totalCommission || 0) + commissionWallet;

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
      const baseKey = `match:${fgWallet.id}:${matchId}:${matchBettingDetails?.id}:profitLoss`;

      updatePipeline
        .hincrbyfloat(fgWallet.id, 'profitLoss', roundToTwoDecimals(fwProfitLoss))
        .hincrbyfloat(fgWallet.id, 'myProfitLoss', -roundToTwoDecimals(fwProfitLoss))
        .hincrbyfloat(fgWallet.id, 'exposure', -exposure)
        .del(baseKey);
    }

    // Insert commissions in batches
    if (bulkCommission.length > 0) {
      const commissionBatches = [];
      for (let i = 0; i < bulkCommission.length; i += 500) {
        commissionBatches.push(bulkCommission.slice(i, i + 500));
      }
      for (const batch of commissionBatches) {
        await insertCommissions(batch);
      }
    }

    // Execute Redis pipeline
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

    return { data: { profitLoss: resultProfitLoss, totalCommission: commissionWallet } };
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
        settingRedisDataObj = { ...settingRedisDataObj, ...settingRedisDataObj[items] };
        delete settingRedisDataObj[items];
      });

      if (Object.keys(parentUserRedisData || {}).length) {
        const baseKey = `match:${parentUserId}:${matchId}:${matchBetting?.id}:profitLoss`;

        updatePipeline
          .hincrbyfloat(parentUserId, 'profitLoss', -roundToTwoDecimals(adminBalanceData?.profitLoss))
          .hincrbyfloat(parentUserId, 'myProfitLoss', roundToTwoDecimals(adminBalanceData?.myProfitLoss))
          .hincrbyfloat(parentUserId, 'exposure', adminBalanceData?.exposure)
          .hmset(baseKey, settingRedisDataObj);
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
      Object.keys(parentUserRedisData || {}).length
    ) {

      let settingRedisDataObj = { ...profitLossDataWallet };
      Object.keys(settingRedisDataObj)?.forEach((items) => {
        settingRedisDataObj = { ...settingRedisDataObj, ...settingRedisDataObj[items] };
        delete settingRedisDataObj[items];
      });
      const baseKey = `match:${parentUser.userId}:${matchId}:${matchBetting?.id}:profitLoss`;

      updatePipeline
        .hincrbyfloat(parentUser.userId, 'profitLoss', -roundToTwoDecimals(fwProfitLoss))
        .hincrbyfloat(parentUser.userId, 'myProfitLoss', roundToTwoDecimals(fwProfitLoss))
        .hincrbyfloat(parentUser.userId, 'exposure', exposure)
        .hmset(baseKey, settingRedisDataObj);

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
