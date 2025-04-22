const { __mf } = require("i18n");
const { userRoleConstant, socketData, betType, betResultStatus, matchBettingType, marketBetType, partnershipPrefixByRole, redisKeys, oldBetFairDomain, gameType, sessionBettingType, cardGameType } = require("../config/contants");
const internalRedis = require("../config/internalRedisConnection");
const { logger } = require("../config/logger");
const { sendMessageToUser } = require("../sockets/socketManager");
const { getUserDomainWithFaId, getDomainDataByFaId } = require("./domainDataService");
const userService = require("./userService");
const { CardProfitLoss } = require("./cardService/cardProfitLossCalc");
const { getBets } = require("../grpc/grpcClient/handlers/wallet/betsHandler");
const { getTournamentBettingHandler } = require("../grpc/grpcClient/handlers/expert/matchHandler");
const { updateUserBalanceData } = require("./userBalanceService");

exports.forceLogoutIfLogin = async (userId) => {
  let token = await internalRedis.hget(userId, "token");
  if (token) {
    // function to force logout
    sendMessageToUser(userId, socketData.logoutUserForceEvent, { message: __mf("auth.forceLogout") });
  }
};

exports.forceLogoutUser = async (userId, stopForceLogout) => {

  if (!stopForceLogout) {
    await this.forceLogoutIfLogin(userId);
  }
  await internalRedis.hdel(userId, "token");

};
exports.calculatePartnership = async (userData, creator) => {
  if (userData.roleName == userRoleConstant.fairGameWallet) {
    return {};
  }

  // user created by fairgame wallet
  let fwPartnership = creator.fwPartnership;
  let faPartnership = creator.faPartnership;
  let saPartnership = creator.saPartnership;
  let aPartnership = creator.aPartnership;
  let smPartnership = creator.smPartnership;
  let mPartnership = creator.mPartnership;
  let agPartnership = creator.agPartnership;

  switch (creator.roleName) {
    case (userRoleConstant.fairGameWallet): {
      fwPartnership = creator.myPartnership;
      break;
    }
    case (userRoleConstant.fairGameAdmin): {
      faPartnership = creator.myPartnership;
      break;
    }
    case (userRoleConstant.superAdmin): {
      saPartnership = creator.myPartnership;
      break;
    }
    case (userRoleConstant.admin): {
      aPartnership = creator.myPartnership;
      break;
    }
    case (userRoleConstant.superMaster): {
      smPartnership = creator.myPartnership;
      break;
    }
    case (userRoleConstant.master): {
      mPartnership = creator.myPartnership;
      break;
    }
    case (userRoleConstant.agent): {
      agPartnership = creator.myPartnership;
      break;
    }
  }

  switch (creator.roleName) {
    case (userRoleConstant.fairGameWallet): {
      switch (userData.roleName) {
        case (userRoleConstant.fairGameAdmin): {
          faPartnership = 100 - parseInt(creator.myPartnership);
          break;
        }
        case (userRoleConstant.superAdmin): {
          saPartnership = 100 - parseInt(creator.myPartnership);
          break;
        }
        case (userRoleConstant.admin): {
          aPartnership = 100 - parseInt(creator.myPartnership);
          break;
        }
        case (userRoleConstant.superMaster): {
          smPartnership = 100 - parseInt(creator.myPartnership);
          break;
        }
        case (userRoleConstant.master): {
          mPartnership = 100 - parseInt(creator.myPartnership);
          break;
        }
        case (userRoleConstant.agent): {
          agPartnership = 100 - parseInt(creator.myPartnership);
          break;
        }
      }
    }
      break;
    case (userRoleConstant.fairGameAdmin): {
      switch (userData.roleName) {
        case (userRoleConstant.superAdmin): {
          saPartnership = 100 - parseInt(creator.myPartnership + fwPartnership);
          break;
        }
        case (userRoleConstant.admin): {
          aPartnership = 100 - parseInt(creator.myPartnership + fwPartnership);
          break;
        }
        case (userRoleConstant.superMaster): {
          smPartnership = 100 - parseInt(creator.myPartnership + fwPartnership);
          break;
        }
        case (userRoleConstant.master): {
          mPartnership = 100 - parseInt(creator.myPartnership + fwPartnership);
          break;
        }
        case (userRoleConstant.agent): {
          agPartnership = 100 - parseInt(creator.myPartnership + fwPartnership);
          break;
        }
      }
    }
      break;
    case (userRoleConstant.superAdmin): {
      switch (userData.roleName) {
        case (userRoleConstant.admin): {
          aPartnership = 100 - parseInt(creator.myPartnership + fwPartnership + faPartnership);
          break;
        }
        case (userRoleConstant.superMaster): {
          smPartnership = 100 - parseInt(creator.myPartnership + fwPartnership + faPartnership);
          break;
        }
        case (userRoleConstant.master): {
          mPartnership = 100 - parseInt(creator.myPartnership + fwPartnership + faPartnership);
          break;
        }
        case (userRoleConstant.agent): {
          agPartnership = 100 - parseInt(creator.myPartnership + fwPartnership + faPartnership);
          break;
        }
      }
    }
      break;
    case (userRoleConstant.admin): {
      switch (userData.roleName) {
        case (userRoleConstant.superMaster): {
          smPartnership = 100 - parseInt(creator.myPartnership + fwPartnership + faPartnership + saPartnership);
          break;
        }
        case (userRoleConstant.master): {
          mPartnership = 100 - parseInt(creator.myPartnership + fwPartnership + faPartnership + saPartnership);
          break;
        }
        case (userRoleConstant.agent): {
          agPartnership = 100 - parseInt(creator.myPartnership + fwPartnership + faPartnership + saPartnership);
          break;
        }
      }
    }
      break;
    case (userRoleConstant.superMaster): {
      switch (userData.roleName) {
        case (userRoleConstant.master): {
          mPartnership = 100 - parseInt(creator.myPartnership + fwPartnership + faPartnership + saPartnership + aPartnership);
          break;
        }
        case (userRoleConstant.agent): {
          agPartnership = 100 - parseInt(creator.myPartnership + fwPartnership + faPartnership + saPartnership + aPartnership);
          break;
        }
      }
    }
      break;
    case (userRoleConstant.master): {
      switch (userData.roleName) {

        case (userRoleConstant.agent): {
          agPartnership = 100 - parseInt(creator.myPartnership + fwPartnership + faPartnership + saPartnership + aPartnership + smPartnership);
          break;
        }
      }
    }
      break;
  }

  if (userData.roleName != userRoleConstant.expert && fwPartnership + faPartnership + saPartnership + aPartnership + smPartnership + mPartnership + agPartnership != 100) {
    throw new Error("user.partnershipNotValid");
  }
  return {
    fwPartnership,
    faPartnership,
    saPartnership,
    aPartnership,
    smPartnership,
    mPartnership,
    agPartnership
  }
}

exports.checkUserCreationHierarchy = (creator, createUserRoleName) => {
  const hierarchyArray = Object.values(userRoleConstant)
  let creatorIndex = hierarchyArray.indexOf(creator.roleName)
  if (creatorIndex == -1) return false
  let index = hierarchyArray.indexOf(createUserRoleName)
  if (index == -1) return false
  if (index < creatorIndex) return false;
  if (createUserRoleName == userRoleConstant.expert && creator.roleName !== userRoleConstant.fairGameAdmin) {
    return false
  }
  return true

}

exports.calculateRate = async (teamRates, data, partnership = 100) => {
  let { teamA, teamB, teamC, winAmount, lossAmount, bettingType, betOnTeam } = data;
  let newTeamRates = {
    teamA: 0,
    teamB: 0,
    teamC: 0,
  }
  if (betOnTeam == teamA && bettingType == betType.BACK) {
    newTeamRates.teamA = teamRates.teamA + ((winAmount * partnership) / 100);
    newTeamRates.teamB = teamRates.teamB - ((lossAmount * partnership) / 100);
    newTeamRates.teamC = teamRates.teamC - (teamC ? ((lossAmount * partnership) / 100) : 0);
  }
  else if (betOnTeam == teamA && bettingType == betType.LAY) {
    newTeamRates.teamA = teamRates.teamA - ((lossAmount * partnership) / 100);
    newTeamRates.teamB = teamRates.teamB + ((winAmount * partnership) / 100);
    newTeamRates.teamC = teamRates.teamC + (teamC ? ((winAmount * partnership) / 100) : 0);
  }
  else if (betOnTeam == teamB && bettingType == betType.BACK) {
    newTeamRates.teamB = teamRates.teamB + ((winAmount * partnership) / 100);
    newTeamRates.teamA = teamRates.teamA - ((lossAmount * partnership) / 100);
    newTeamRates.teamC = teamRates.teamC - (teamC ? ((lossAmount * partnership) / 100) : 0);
  }
  else if (betOnTeam == teamB && bettingType == betType.LAY) {
    newTeamRates.teamB = teamRates.teamB - ((lossAmount * partnership) / 100);
    newTeamRates.teamA = teamRates.teamA + ((winAmount * partnership) / 100);
    newTeamRates.teamC = teamRates.teamC + (teamC ? ((winAmount * partnership) / 100) : 0);
  }
  else if (teamC && betOnTeam == teamC && bettingType == betType.BACK) {
    newTeamRates.teamA = teamRates.teamA - ((lossAmount * partnership) / 100);
    newTeamRates.teamB = teamRates.teamB - ((lossAmount * partnership) / 100);
    newTeamRates.teamC = teamRates.teamC + ((winAmount * partnership) / 100);
  }
  else if (teamC && betOnTeam == teamC && bettingType == betType.LAY) {
    newTeamRates.teamA = teamRates.teamA + ((winAmount * partnership) / 100);
    newTeamRates.teamB = teamRates.teamB + ((winAmount * partnership) / 100);
    newTeamRates.teamC = teamRates.teamC - ((lossAmount * partnership) / 100);
  }

  newTeamRates = {
    teamA: Number(newTeamRates.teamA.toFixed(2)),
    teamB: Number(newTeamRates.teamB.toFixed(2)),
    teamC: Number(newTeamRates.teamC.toFixed(2))
  }
  return newTeamRates;
}

exports.calculateRacingRate = async (teamRates, data, partnership = 100) => {
  let { runners, winAmount, lossAmount, bettingType, runnerId } = data;
  let newTeamRates = { ...teamRates };
  runners.forEach((item) => {
    if (!newTeamRates[item?.id]) {
      newTeamRates[item?.id] = 0;
    }

    if ((item?.id == runnerId && bettingType == betType.BACK) || (item?.id != runnerId && bettingType == betType.LAY)) {
      newTeamRates[item?.id] += ((winAmount * partnership) / 100);
    }
    else if ((item?.id != runnerId && bettingType == betType.BACK) || (item?.id == runnerId && bettingType == betType.LAY)) {
      newTeamRates[item?.id] -= ((lossAmount * partnership) / 100);
    }

    newTeamRates[item?.id] = this.parseRedisData(item?.id, newTeamRates);
  });

  return newTeamRates;
}

exports.calculateRacingExpertRate = async (teamRates, data, partnership = 100) => {
  let { runners, winAmount, lossAmount, bettingType, runnerId } = data;
  let newTeamRates = { ...teamRates };

  runners.forEach((item) => {
    if (!newTeamRates[item?.id]) {
      newTeamRates[item?.id] = 0;
    }

    if ((item?.id == runnerId && bettingType == betType.BACK) || (item?.id != runnerId && bettingType == betType.LAY)) {
      newTeamRates[item?.id] -= ((winAmount * partnership) / 100);
    }
    else if ((item?.id != runnerId && bettingType == betType.BACK) || (item?.id == runnerId && bettingType == betType.LAY)) {
      newTeamRates[item?.id] += ((lossAmount * partnership) / 100);
    }

    newTeamRates[item?.id] = this.parseRedisData(item?.id, newTeamRates);
  });
  return newTeamRates;
}

const calculateProfitLoss = (betData, odds, partnership) => {
  if (
    (betData?.betPlacedData?.betType === betType.NO &&
      odds < betData?.betPlacedData?.odds) ||
    (betData?.betPlacedData?.betType === betType.YES &&
      odds >= betData?.betPlacedData?.odds)
  ) {
    return partnership != null || partnership != undefined
      ? -parseFloat(
        (parseFloat(betData?.winAmount) * partnership) / 100
      ).toFixed(2)
      : +parseFloat(parseFloat(betData?.winAmount).toFixed(2));
  } else if (
    (betData?.betPlacedData?.betType === betType.NO &&
      odds >= betData?.betPlacedData?.odds) ||
    (betData?.betPlacedData?.betType === betType.YES &&
      odds < betData?.betPlacedData?.odds)
  ) {
    return partnership != null || partnership != undefined
      ? +parseFloat(
        (parseFloat(betData?.lossAmount) * partnership) / 100
      ).toFixed(2)
      : -parseFloat(betData.lossAmount);
  }
  return 0;
};

const calculateProfitLossDataKhado = (betData, odds, partnership) => {
  if (
    (betData?.betPlacedData?.betType === betType.BACK &&
      ((odds < betData?.betPlacedData?.odds) || (odds > (betData?.betPlacedData?.odds + parseInt(betData?.betPlacedData?.eventName?.split("-").pop()) - 1))))
  ) {
    return partnership != null || partnership != undefined
      ? parseFloat(
        (parseFloat(betData?.lossAmount) * partnership) / 100
      ).toFixed(2)
      : -parseFloat(parseFloat(betData?.lossAmount).toFixed(2));
  }
  return partnership != null || partnership != undefined
    ? -parseFloat(
      (parseFloat(betData?.winAmount) * partnership) / 100
    ).toFixed(2)
    : parseFloat(betData.winAmount);

};

const calculateProfitLossDataMeter = (betData, odds, partnership) => {
  if (
    (betData?.betPlacedData?.betType === betType.NO &&
      odds < betData?.betPlacedData?.odds) ||
    (betData?.betPlacedData?.betType === betType.YES &&
      odds >= betData?.betPlacedData?.odds)
  ) {
    return partnership != null || partnership != undefined
      ? -parseFloat(
        (parseFloat((betData?.betPlacedData?.stake * betData?.betPlacedData?.rate / 100) * Math.abs(odds - betData?.betPlacedData?.odds)) * partnership) / 100
      ).toFixed(2)
      : +parseFloat(parseFloat((betData?.betPlacedData?.stake * betData?.betPlacedData?.rate / 100) * Math.abs(odds - betData?.betPlacedData?.odds)).toFixed(2));
  } else if (
    (betData?.betPlacedData?.betType === betType.NO &&
      odds >= betData?.betPlacedData?.odds) ||
    (betData?.betPlacedData?.betType === betType.YES &&
      odds < betData?.betPlacedData?.odds)
  ) {
    return partnership != null || partnership != undefined
      ? +parseFloat(
        (parseFloat((betData?.betPlacedData?.stake) * Math.abs(odds - betData?.betPlacedData?.odds)) * partnership) / 100
      ).toFixed(2)
      : -parseFloat((betData?.betPlacedData?.stake) * Math.abs(odds - betData?.betPlacedData?.odds));
  }
  return 0;
};
/**
* Calculates the profit or loss for a betting session.
* @param {object} redisProfitLoss - Redis data for profit and loss.
* @param {object} betData - Data for the current bet.
* @returns {object} - Object containing upper and lower limit odds, and the updated bet placed data.
*/
exports.calculateProfitLossSession = async (redisProfitLoss, betData, partnership) => {
  /**
   * Calculates the profit or loss for a specific bet at given odds.
   * @param {object} betData - Data for the current bet.
   * @param {number} odds - Odds for the current bet.
   * @returns {number} - Profit or loss amount.
   */
  let maxLoss = 0;


  /**
   * Gets the lower limit for the current bet data.
   * @param {object} betData - Data for the current bet.
   * @returns {number} - Lower limit for the odds.
   */
  const getLowerLimitBetData = (betData) =>
    Math.max(0, betData?.betPlacedData?.odds - 5);

  // Calculate lower and upper limits
  const lowerLimit = parseFloat(
    getLowerLimitBetData(betData) < (redisProfitLoss?.lowerLimitOdds ?? 0)
      ? getLowerLimitBetData(betData)
      : redisProfitLoss?.lowerLimitOdds ?? getLowerLimitBetData(betData)
  );

  const upperLimit = parseFloat(
    betData?.betPlacedData?.odds + 5 >
      (redisProfitLoss?.upperLimitOdds ?? betData?.betPlacedData?.odds + 5)
      ? betData?.betPlacedData?.odds + 5
      : redisProfitLoss?.upperLimitOdds ?? betData?.betPlacedData?.odds + 5
  );

  let betProfitloss = redisProfitLoss?.betPlaced ?? [];

  // Adjust betPlaced based on lower limit changes
  if (redisProfitLoss?.lowerLimitOdds > lowerLimit) {
    betProfitloss = [
      ...Array(Math.abs((redisProfitLoss?.lowerLimitOdds ?? 0) - lowerLimit))
        .fill(0)
        ?.map((_, index) => {
          return {
            odds: lowerLimit + index,
            profitLoss: parseFloat(betProfitloss[0]?.profitLoss),
          };
        }),
      ...betProfitloss,
    ];
  }

  // Adjust betPlaced based on upper limit changes
  if (upperLimit > redisProfitLoss?.upperLimitOdds) {
    betProfitloss = [
      ...betProfitloss,
      ...Array(Math.abs(upperLimit - (redisProfitLoss?.upperLimitOdds ?? 0)))
        .fill(0)
        ?.map((_, index) => {
          return {
            odds: (redisProfitLoss?.upperLimitOdds ?? 0) + index + 1,
            profitLoss: parseFloat(
              betProfitloss[betProfitloss?.length - 1]?.profitLoss
            ),
          };
        }),
    ];
  }

  // Initialize or update betPlaced if it's empty or not
  if (!betProfitloss?.length) {
    betProfitloss = Array(Math.abs(upperLimit - lowerLimit + 1))
      .fill(0)
      ?.map((_, index) => {
        let profitLoss = calculateProfitLoss(betData, lowerLimit + index, partnership);
        if (maxLoss < Math.abs(profitLoss) && profitLoss < 0) {
          maxLoss = Math.abs(profitLoss);
        }
        return {
          odds: lowerLimit + index,
          profitLoss: profitLoss,
        };
      });
  } else {
    betProfitloss = betProfitloss?.map((item) => {
      let profitLossVal = calculateProfitLoss(betData, item?.odds, partnership);
      profitLossVal = +(parseFloat(item?.profitLoss) + parseFloat(profitLossVal)).toFixed(2)
      if (
        maxLoss <
        Math.abs(
          profitLossVal
        ) &&
        profitLossVal < 0
      ) {
        maxLoss = Math.abs(
          profitLossVal
        );
      }
      return {
        odds: item?.odds,
        profitLoss: profitLossVal,
      };
    });
  }
  maxLoss = Number(maxLoss.toFixed(2));
  // Return the result
  return {
    upperLimitOdds: parseFloat(upperLimit),
    lowerLimitOdds: parseFloat(lowerLimit),
    betPlaced: betProfitloss,
    maxLoss: parseFloat(maxLoss),
    totalBet: redisProfitLoss?.totalBet ? parseInt(redisProfitLoss?.totalBet) + 1 : 1
  };
};

/**
* Calculates the profit or loss for a betting khado.
* @param {object} redisProfitLoss - Redis data for profit and loss.
* @param {object} betData - Data for the current bet.
* @returns {object} - Object containing upper and lower limit odds, and the updated bet placed data.
*/
exports.calculateProfitLossKhado = async (redisProfitLoss, betData, partnership) => {
  /**
   * Calculates the profit or loss for a specific bet at given odds.
   * @param {object} betData - Data for the current bet.
   * @param {number} odds - Odds for the current bet.
   * @returns {number} - Profit or loss amount.
   */
  let maxLoss = 0;


  // Calculate lower and upper limits
  const lowerLimit = 1;

  const upperLimit = parseFloat(
    betData?.betPlacedData?.odds + parseInt(betData?.betPlacedData?.eventName?.split("-").pop()) + 9 >
      (redisProfitLoss?.upperLimitOdds ?? betData?.betPlacedData?.odds + parseInt(betData?.betPlacedData?.eventName?.split("-").pop()) + 9)
      ? betData?.betPlacedData?.odds + parseInt(betData?.betPlacedData?.eventName?.split("-").pop()) + 9
      : redisProfitLoss?.upperLimitOdds ?? betData?.betPlacedData?.odds + parseInt(betData?.betPlacedData?.eventName?.split("-").pop()) + 9
  );

  let betProfitloss = redisProfitLoss?.betPlaced ?? [];

  // Adjust betPlaced based on lower limit changes
  if (redisProfitLoss?.lowerLimitOdds > lowerLimit) {
    betProfitloss = [
      ...Array(Math.abs((redisProfitLoss?.lowerLimitOdds ?? 0) - lowerLimit))
        .fill(0)
        ?.map((_, index) => {
          return {
            odds: lowerLimit + index,
            profitLoss: parseFloat(betProfitloss[0]?.profitLoss),
          };
        }),
      ...betProfitloss,
    ];
  }

  // Adjust betPlaced based on upper limit changes
  if (upperLimit > redisProfitLoss?.upperLimitOdds) {
    betProfitloss = [
      ...betProfitloss,
      ...Array(Math.abs(upperLimit - (redisProfitLoss?.upperLimitOdds ?? 0)))
        .fill(0)
        ?.map((_, index) => {
          return {
            odds: (redisProfitLoss?.upperLimitOdds ?? 0) + index + 1,
            profitLoss: parseFloat(
              betProfitloss[betProfitloss?.length - 1]?.profitLoss
            ),
          };
        }),
    ];
  }

  // Initialize or update betPlaced if it's empty or not
  if (!betProfitloss?.length) {
    betProfitloss = Array(Math.abs(upperLimit - lowerLimit + 1))
      .fill(0)
      ?.map((_, index) => {
        let profitLoss = calculateProfitLossDataKhado(betData, lowerLimit + index, partnership);
        if (maxLoss < Math.abs(profitLoss) && profitLoss < 0) {
          maxLoss = Math.abs(profitLoss);
        }
        return {
          odds: lowerLimit + index,
          profitLoss: profitLoss,
        };
      });
  } else {
    betProfitloss = betProfitloss?.map((item) => {
      let profitLossVal = calculateProfitLossDataKhado(betData, item?.odds, partnership);
      profitLossVal = +(parseFloat(item?.profitLoss) + parseFloat(profitLossVal)).toFixed(2)
      if (
        maxLoss <
        Math.abs(
          profitLossVal
        ) &&
        profitLossVal < 0
      ) {
        maxLoss = Math.abs(
          profitLossVal
        );
      }
      return {
        odds: item?.odds,
        profitLoss: profitLossVal,
      };
    });
  }
  maxLoss = Number(maxLoss.toFixed(2));
  // Return the result
  return {
    upperLimitOdds: parseFloat(upperLimit),
    lowerLimitOdds: parseFloat(lowerLimit),
    betPlaced: betProfitloss,
    maxLoss: parseFloat(maxLoss),
    totalBet: redisProfitLoss?.totalBet ? parseInt(redisProfitLoss?.totalBet) + 1 : 1
  };
};

/**
* Calculates the profit or loss for a betting meter.
* @param {object} redisProfitLoss - Redis data for profit and loss.
* @param {object} betData - Data for the current bet.
* @returns {object} - Object containing upper and lower limit odds, and the updated bet placed data.
*/
exports.calculateProfitLossMeter = async (redisProfitLoss, betData, partnership) => {
  /**
   * Calculates the profit or loss for a specific bet at given odds.
   * @param {object} betData - Data for the current bet.
   * @param {number} odds - Odds for the current bet.
   * @returns {number} - Profit or loss amount.
   */
  let maxLoss = 0;


  // Calculate lower and upper limits
  const lowerLimit = 0;

  const upperLimit = parseFloat(
    betData?.betPlacedData?.odds + (betData?.betPlacedData?.isTeamC ? 200 : 100) >
      (redisProfitLoss?.upperLimitOdds ?? betData?.betPlacedData?.odds + (betData?.betPlacedData?.isTeamC ? 200 : 100))
      ? betData?.betPlacedData?.odds + (betData?.betPlacedData?.isTeamC ? 200 : 100)
      : redisProfitLoss?.upperLimitOdds ?? betData?.betPlacedData?.odds + (betData?.betPlacedData?.isTeamC ? 200 : 100)
  );

  let betProfitloss = redisProfitLoss?.betPlaced ?? [];

  // Adjust betPlaced based on upper limit changes
  if (upperLimit > redisProfitLoss?.upperLimitOdds) {
    betProfitloss = [
      ...betProfitloss,
      ...Array(Math.abs(upperLimit - (redisProfitLoss?.upperLimitOdds ?? 0)))
        .fill(0)
        ?.map((_, index) => {
          return {
            odds: (redisProfitLoss?.upperLimitOdds ?? 0) + index + 1,
            profitLoss: parseFloat(
              (betProfitloss[betProfitloss?.length - 1]?.profitLoss) + ((parseFloat(betProfitloss[betProfitloss?.length - 1]?.profitLoss) - parseFloat(betProfitloss[betProfitloss?.length - 2]?.profitLoss)) * (index + 1))
            ),
          };
        }),
    ];
  }

  // Initialize or update betPlaced if it's empty or not
  if (!betProfitloss?.length) {
    betProfitloss = Array(Math.abs(upperLimit - lowerLimit + 1))
      .fill(0)
      ?.map((_, index) => {
        let profitLoss = calculateProfitLossDataMeter(betData, lowerLimit + index, partnership);
        if (maxLoss < Math.abs(profitLoss) && profitLoss < 0) {
          maxLoss = Math.abs(profitLoss);
        }
        return {
          odds: lowerLimit + index,
          profitLoss: profitLoss,
        };
      });
  } else {
    betProfitloss = betProfitloss?.map((item) => {
      let profitLossVal = calculateProfitLossDataMeter(betData, item?.odds, partnership);
      profitLossVal = +(parseFloat(item?.profitLoss) + parseFloat(profitLossVal)).toFixed(2)
      if (
        maxLoss <
        Math.abs(
          profitLossVal
        ) &&
        profitLossVal < 0
      ) {
        maxLoss = Math.abs(
          profitLossVal
        );
      }
      return {
        odds: item?.odds,
        profitLoss: profitLossVal,
      };
    });
  }
  maxLoss = Number(maxLoss.toFixed(2));
  // Return the result
  return {
    upperLimitOdds: parseFloat(upperLimit),
    lowerLimitOdds: parseFloat(lowerLimit),
    betPlaced: betProfitloss,
    maxLoss: parseFloat(maxLoss),
    totalBet: redisProfitLoss?.totalBet ? parseInt(redisProfitLoss?.totalBet) + 1 : 1
  };
};

/**
* Calculates the profit or loss for a betting session.
* @param {object} redisProfitLoss - Redis data for profit and loss.
* @param {object} betData - Data for the current bet.
* @returns {object} - Object containing upper and lower limit odds, and the updated bet placed data.
*/
exports.calculateProfitLossSessionOddEven = async (redisProfitLoss, betData, partnership = 100) => {
  let maxLoss = 0;

  let betProfitloss = redisProfitLoss?.betPlaced ?? {};

  if (betData?.betPlacedData?.teamName?.toLowerCase() == "odd") {
    betProfitloss.odd = (betProfitloss.odd || 0) + (betData?.winAmount * partnership / 100);
    betProfitloss.even = (betProfitloss.even || 0) - (betData?.lossAmount * partnership / 100);
  }
  else if (betData?.betPlacedData?.teamName?.toLowerCase() == "even") {
    betProfitloss.odd = (betProfitloss.odd || 0) - (betData?.lossAmount * partnership / 100);
    betProfitloss.even = (betProfitloss.even || 0) + (betData?.winAmount * partnership / 100);
  }

  maxLoss = Number(Math.min(...Object.values(betProfitloss), 0).toFixed(2));
  // Return the result
  return {
    betPlaced: betProfitloss,
    maxLoss: parseFloat(Math.abs(maxLoss)),
    totalBet: redisProfitLoss?.totalBet ? parseInt(redisProfitLoss?.totalBet) + 1 : 1
  };
};

/**
* Calculates the profit or loss for a betting session.
* @param {object} redisProfitLoss - Redis data for profit and loss.
* @param {object} betData - Data for the current bet.
* @returns {object} - Object containing upper and lower limit odds, and the updated bet placed data.
*/
exports.calculateProfitLossSessionFancy1 = async (redisProfitLoss, betData, partnership = 100) => {
  let maxLoss = 0;

  let betProfitloss = redisProfitLoss?.betPlaced ?? {};

  if (betData?.betPlacedData?.betType == betType.BACK) {
    betProfitloss.yes = (betProfitloss.yes || 0) + (betData?.winAmount * partnership / 100);
    betProfitloss.no = (betProfitloss.no || 0) - (betData?.lossAmount * partnership / 100);
  }
  else if (betData?.betPlacedData?.betType == betType.LAY) {
    betProfitloss.yes = (betProfitloss.yes || 0) - (betData?.lossAmount * partnership / 100);
    betProfitloss.no = (betProfitloss.no || 0) + (betData?.winAmount * partnership / 100);
  }
  maxLoss = Number(Math.min(...Object.values(betProfitloss), 0).toFixed(2));
  // Return the result
  return {
    betPlaced: betProfitloss,
    maxLoss: parseFloat(Math.abs(maxLoss)),
    totalBet: redisProfitLoss?.totalBet ? parseInt(redisProfitLoss?.totalBet) + 1 : 1
  };
};

/**
* Calculates the profit or loss for a betting session.
* @param {object} redisProfitLoss - Redis data for profit and loss.
* @param {object} betData - Data for the current bet.
* @returns {object} - Object containing upper and lower limit odds, and the updated bet placed data.
*/
exports.calculateProfitLossSessionCasinoCricket = async (redisProfitLoss, betData, partnership = 100) => {
  let maxLoss = 0;

  let betProfitloss = redisProfitLoss?.betPlaced ?? {};

  Array.from({ length: 10 }, (_, index) => index)?.forEach((item) => {
    if (betData?.betPlacedData?.teamName?.split(" ")?.[0] == item) {
      betProfitloss[item] = (betProfitloss[item] || 0) + (betData?.winAmount * partnership / 100);
    }
    else {
      betProfitloss[item] = (betProfitloss[item] || 0) - (betData?.lossAmount * partnership / 100);
    }
  });

  maxLoss = Number(Math.min(...Object.values(betProfitloss), 0).toFixed(2));
  // Return the result
  return {
    betPlaced: betProfitloss,
    maxLoss: parseFloat(Math.abs(maxLoss)),
    totalBet: redisProfitLoss?.totalBet ? parseInt(redisProfitLoss?.totalBet) + 1 : 1
  };
};

exports.mergeProfitLoss = (newbetPlaced, oldbetPlaced, type = sessionBettingType.session) => {
  switch (type) {
    case sessionBettingType.ballByBall:
    case sessionBettingType.overByOver:
    case sessionBettingType.session:
    case sessionBettingType.khado:
    case sessionBettingType.meter:
      if (newbetPlaced?.[0].odds > oldbetPlaced?.[0]?.odds) {
        while (newbetPlaced?.[0]?.odds != oldbetPlaced?.[0]?.odds) {
          const newEntry = {
            odds: newbetPlaced?.[0]?.odds - 1,
            profitLoss: newbetPlaced?.[0]?.profitLoss,
          };
          newbetPlaced?.unshift(newEntry);
        }
      }
      if (newbetPlaced?.[0]?.odds < oldbetPlaced?.[0]?.odds) {
        while (newbetPlaced?.[0]?.odds != oldbetPlaced?.[0]?.odds) {
          const newEntry = {
            odds: oldbetPlaced?.[0]?.odds - 1,
            profitLoss: oldbetPlaced?.[0]?.profitLoss,
          };
          oldbetPlaced?.unshift(newEntry);
        }
      }

      if (newbetPlaced?.[newbetPlaced?.length - 1]?.odds > oldbetPlaced?.[oldbetPlaced?.length - 1]?.odds) {
        while (newbetPlaced?.[newbetPlaced?.length - 1]?.odds != oldbetPlaced?.[oldbetPlaced?.length - 1]?.odds) {
          const newEntry = {
            odds: oldbetPlaced?.[oldbetPlaced?.length - 1]?.odds + 1,
            profitLoss: oldbetPlaced?.[oldbetPlaced?.length - 1]?.profitLoss,
          };
          oldbetPlaced?.push(newEntry);
        }
      }
      if (newbetPlaced?.[newbetPlaced?.length - 1]?.odds < oldbetPlaced?.[oldbetPlaced?.length - 1]?.odds) {
        while (newbetPlaced?.[newbetPlaced?.length - 1]?.odds != oldbetPlaced?.[oldbetPlaced?.length - 1]?.odds) {
          const newEntry = {
            odds: newbetPlaced?.[newbetPlaced?.length - 1]?.odds + 1,
            profitLoss: newbetPlaced?.[newbetPlaced?.length - 1]?.profitLoss,
          };
          newbetPlaced?.push(newEntry);
        }
      }
      return;
    case sessionBettingType.oddEven:
    case sessionBettingType.fancy1:
    case sessionBettingType.cricketCasino:
      Object.keys(newbetPlaced)?.forEach((item) => {
        newbetPlaced[item] = oldbetPlaced[item] + newbetPlaced[item];
      });
      return;
    default:
      return;
  }
};

exports.calculatePLAllBet = async (betPlace, type, userPartnerShip = 100, oldLowerLimitOdds, oldUpperLimitOdds) => {
  let profitLoss = {};
  let isPartnership = userPartnerShip != 100;

  switch (type) {
    case sessionBettingType.ballByBall:
    case sessionBettingType.overByOver:
    case sessionBettingType.session:
      let betData = [];
      let line = 1;
      let maxLoss = 0.0;
      let first = 0;
      let last = 0;
      if (betPlace && betPlace.length) {
        // let latest_bet = betPlace[betPlace.length - 1].odds;
        let oddsValues = betPlace.map(({ odds }) => odds)
        if (oldLowerLimitOdds) {
          first = oldLowerLimitOdds + 5;
        } else {
          first = Math.min(...oddsValues);
        }
        if (oldUpperLimitOdds) {
          last = oldUpperLimitOdds - 5;
        } else {
          last = Math.max(...oddsValues);
        }

        let i = 0;
        for (let j = first - 5 > 0 ? first - 5 : 0; j <= last + 5; j++) {
          let profitLoss = 0.0;
          for (let key in betPlace) {
            let partnership = 100;
            if (userPartnerShip) {
              partnership = userPartnerShip;
            }
            if (betPlace[key]['betType'] == betType.NO && j < betPlace[key]['odds']) {
              profitLoss = profitLoss + (betPlace[key]['winAmount'] * partnership / 100);
            } else if (betPlace[key]['betType'] == betType.NO && j >= betPlace[key]['odds']) {
              profitLoss = profitLoss - (betPlace[key]['lossAmount'] * partnership / 100);
            } else if (betPlace[key]['betType'] == betType.YES && j < betPlace[key]['odds']) {
              profitLoss = profitLoss - (betPlace[key]['lossAmount'] * partnership / 100);
            } else if (betPlace[key]['betType'] == betType.YES && j >= betPlace[key]['odds']) {
              profitLoss = profitLoss + (betPlace[key]['winAmount'] * partnership / 100);
            }
          }
          if (maxLoss < Math.abs(profitLoss) && profitLoss < 0) {
            maxLoss = Math.abs(profitLoss);
          }
          if (j == last) {
            line = i;
          }
          profitLoss = Number(profitLoss.toFixed(2));
          betData.push({
            'odds': j,
            'profitLoss': profitLoss
          });
          i++;
        }
      }
      maxLoss = Number(maxLoss.toFixed(2));
      return { betData: betData, line: line, maxLoss: maxLoss, total_bet: betPlace.length, lowerLimitOdds: betData[0]?.odds, upperLimitOdds: betData[betData.length - 1]?.odds }
    case sessionBettingType.khado:
      let betDataKhado = [];
      let lineKhado = 1;
      let maxLossKhado = 0.0;
      let firstKhado = 0;
      let lastKhado = 0;
      if (betPlace && betPlace.length) {
        // let latest_bet = betPlace[betPlace.length - 1].odds;
        let oddsValues = betPlace.map(({ odds, eventName }) => odds + parseInt(eventName?.split("-")?.pop()) + 9)
        firstKhado = 1;
        lastKhado = oldUpperLimitOdds ? oldUpperLimitOdds : Math.max(...oddsValues)

        let i = 0;
        for (let j = firstKhado; j <= lastKhado; j++) {
          let profitLoss = 0.0;
          for (let key in betPlace) {
            let partnership = userPartnerShip || 100;
            let bet = betPlace[key];
            let isWinningBet = (bet.betType === betType.BACK && (j >= bet.odds && j < bet.odds + parseInt(bet.eventName.split("-").pop())));
            profitLoss += isWinningBet ? (bet.winAmount * partnership / 100) : (-bet.lossAmount * partnership / 100);
          }
          maxLossKhado = Math.min(maxLossKhado, profitLoss);
          betDataKhado.push({ odds: j, profitLoss: Number(profitLoss.toFixed(2)) });
          if (j == lastKhado) {
            lineKhado = i;
          }
          i++;
        }
      }
      maxLossKhado = Number(Math.abs(maxLossKhado).toFixed(2));
      return { betData: betDataKhado, line: lineKhado, maxLoss: maxLossKhado, total_bet: betPlace.length, lowerLimitOdds: betDataKhado[0]?.odds, upperLimitOdds: betDataKhado[betDataKhado.length - 1]?.odds }
    case sessionBettingType.meter:
      let betDataMeter = [];
      let lineMeter = 1;
      let maxLossMeter = 0.0;
      let firstMeter = 0;
      let lastMeter = 0;
      if (betPlace && betPlace.length) {
        // let latest_bet = betPlace[betPlace.length - 1].odds;
        let oddsValues = betPlace.map(({ odds }) => odds + (betPlace?.match?.teamC ? 200 : 100))
        firstMeter = 1;
        lastMeter = oldUpperLimitOdds ? oldUpperLimitOdds : Math.max(...oddsValues)

        let i = 0;
        for (let j = firstMeter; j <= lastMeter; j++) {
          let profitLoss = 0.0;
          for (let key in betPlace) {
            let partnership = userPartnerShip || 100;
            let bet = betPlace[key];
            let isWinningBet = (bet.betType === betType.NO && j < bet.odds) || (bet.betType === betType.YES && j >= bet.odds);
            profitLoss += isWinningBet ? (((parseFloat(bet.amount) * parseFloat(bet.rate) / 100) * Math.abs(j - parseInt(bet.odds))) * partnership / 100) : (-((parseFloat(bet.amount) * parseFloat(bet.rate) / 100) * Math.abs(j - parseInt(bet.odds))) * partnership / 100);
          }
          maxLossMeter = Math.min(maxLossMeter, profitLoss);
          betDataMeter.push({ odds: j, profitLoss: Number(profitLoss.toFixed(2)) });
          if (j == lastMeter) {
            lineMeter = i;
          }
          i++;
        }
      }
      maxLossMeter = Number(Math.abs(maxLossMeter).toFixed(2));
      return { betData: betDataMeter, line: lineMeter, maxLoss: maxLossMeter, total_bet: betPlace.length, lowerLimitOdds: betDataMeter[0]?.odds, upperLimitOdds: betDataMeter[betDataMeter.length - 1]?.odds }
    case sessionBettingType.oddEven:
      if (!Array.isArray(betPlace) || betPlace.length === 0) {
        return {
          betData: {},
          maxLoss: 0.0,
          total_bet: 0,
        };
      }

      for (let item of betPlace) {
        let data = {
          winAmount: isPartnership ? -item?.winAmount : item?.winAmount,
          lossAmount: isPartnership ? -item?.lossAmount : item?.lossAmount,
          betPlacedData: {
            teamName: item?.teamName?.split("-")?.pop()?.trim()
          },
        }
        profitLoss = await this.calculateProfitLossSessionOddEven(profitLoss, data, userPartnerShip);
      }
      return { betData: profitLoss.betPlaced, maxLoss: profitLoss.maxLoss, total_bet: profitLoss?.totalBet };
    case sessionBettingType.cricketCasino:
      if (!Array.isArray(betPlace) || betPlace.length === 0) {
        return {
          betData: {},
          maxLoss: 0.0,
          total_bet: 0,
        };
      }

      for (let item of betPlace) {
        let data = {
          winAmount: isPartnership ? -item?.winAmount : item?.winAmount,
          lossAmount: isPartnership ? -item?.lossAmount : item?.lossAmount,
          betPlacedData: {
            teamName: item?.teamName?.split("-")?.pop()?.trim()
          },
        }
        profitLoss = await this.calculateProfitLossSessionCasinoCricket(profitLoss, data, userPartnerShip);
      }
      return { betData: profitLoss.betPlaced, maxLoss: profitLoss.maxLoss, total_bet: profitLoss?.totalBet };
    case sessionBettingType.fancy1:
      if (!Array.isArray(betPlace) || betPlace.length === 0) {
        return {
          betData: {},
          maxLoss: 0.0,
          total_bet: 0,
        };
      }

      for (let item of betPlace) {
        let data = {
          winAmount: isPartnership ? -item?.winAmount : item?.winAmount,
          lossAmount: isPartnership ? -item?.lossAmount : item?.lossAmount,
          betPlacedData: {
            betType: item?.betType
          },
        }
        profitLoss = await this.calculateProfitLossSessionFancy1(profitLoss, data, userPartnerShip);
      }
      return { betData: profitLoss.betPlaced, maxLoss: profitLoss.maxLoss, total_bet: profitLoss?.totalBet };
    default:
      return {};
  }



};

exports.calculateRatesRacingMatch = async (betPlace, partnerShip = 100, matchData) => {
  let teamRates = {};
  const { runners } = matchData;

  for (let placedBets of betPlace) {
    const matchId = placedBets?.matchId;
    const betId = placedBets?.betId;
    const teamRate = teamRates[![gameType.greyHound, gameType.horseRacing].includes(placedBets.eventType) ? `${betId}${redisKeys.profitLoss}_${matchId}` : `${matchId}${redisKeys.profitLoss}`] || runners.reduce((acc, key) => {
      acc[key?.id] = 0;
      return acc;
    }, {});

    let calculatedRates = await this.calculateRacingRate(
      teamRate,
      {
        runners: runners,
        winAmount: placedBets?.winAmount,
        lossAmount: placedBets?.lossAmount,
        bettingType: placedBets?.betType,
        runnerId: placedBets?.runnerId
      },
      partnerShip
    );

    teamRates[![gameType.greyHound, gameType.horseRacing].includes(placedBets.eventType) ? `${betId}${redisKeys.profitLoss}_${matchId}` : `${matchId}${redisKeys.profitLoss}`] = calculatedRates;
  }

  return teamRates;
}

exports.getFaAdminDomain = async (user, select, where = {}) => {
  const domainData = await getDomainDataByFaId(user.id, select, where);
  const checkIfUserExist = await userService.getUser({ createBy: user.id }, ["id"]);

  if (!domainData.find((item) => item?.domain == oldBetFairDomain) && checkIfUserExist) {
    domainData.push({
      domain: oldBetFairDomain,
    });
  }
  return domainData;
}

exports.settingBetsDataAtLogin = async (user) => {

  let domainData;
  if (user.roleName == userRoleConstant.fairGameAdmin) {
    domainData = await this.getFaAdminDomain(user);
  }
  else {
    domainData = await getUserDomainWithFaId();
  }

  let bets = [];

  for (let url of domainData) {
    let data = await getBets({
      query: JSON.stringify({
        deleteReason: "isNull",
        result: `inArr${JSON.stringify([betResultStatus.PENDING])}`,
        ...(user.roleName == userRoleConstant.fairGameAdmin ? { userId: user.id, roleName: userRoleConstant.fairGameAdmin } : {}),
        eventType: `inArr${JSON.stringify([gameType.cricket, gameType.politics])}`,
      })
    }, url?.domain).catch((err) => {
      logger.error({
        context: `error in ${url?.domain} setting bet placed redis`,
        process: `User ID : ${user.id} `,
        error: err.message,
        stake: err.stack,
      });
    });
    bets.push(...(data?.rows ?? []));
  }

  let sessionResult = {};
  let sessionExp = {};

  let matchResult = {};
  let matchExposure = {};

  let betResult = { session: {}, match: {} };

  for (let item of bets) {
    let itemData = {
      ...item,
      winAmount: -parseFloat((parseFloat(item.winAmount) * parseFloat(item?.user?.[`${partnershipPrefixByRole[user.roleName]}Partnership`]) / 100).toFixed(2)),
      lossAmount: -parseFloat((parseFloat(item.lossAmount) * parseFloat(item?.user?.[`${partnershipPrefixByRole[user.roleName]}Partnership`]) / 100).toFixed(2)),
      ...(item.marketType == sessionBettingType.meter ? { amount: -parseFloat((parseFloat(item.amount) * parseFloat(item?.user?.[`${partnershipPrefixByRole[user.roleName]}Partnership`]) / 100).toFixed(2)) } : {})

    };
    if (betResult.session[item.betId]) {
      if (item.marketBetType == marketBetType.SESSION) {
        betResult.session[item.betId].push(itemData);
      }
      else if (item.marketBetType == marketBetType.MATCHBETTING) {
        betResult.match[item.betId].push(itemData);
      }
    }
    else {
      if (item.marketBetType == marketBetType.SESSION) {
        betResult.session[item.betId] = [itemData];
      }
      else if (item.marketBetType == marketBetType.MATCHBETTING) {
        betResult.match[item.betId] = [itemData];
      }
    }
  };

  for (const placedBet of Object.keys(betResult.session)) {
    const betPlaceProfitLoss = await this.calculatePLAllBet(betResult.session[placedBet], betResult.session[placedBet]?.[0]?.marketType, 100);
    sessionResult[`${placedBet}${redisKeys.profitLoss}`] = {
      upperLimitOdds: betPlaceProfitLoss?.betData?.[betPlaceProfitLoss?.betData?.length - 1]?.odds,
      lowerLimitOdds: betPlaceProfitLoss?.betData?.[0]?.odds,
      betPlaced: betPlaceProfitLoss?.betData,
      maxLoss: betPlaceProfitLoss?.maxLoss,
      totalBet: betPlaceProfitLoss?.total_bet
    };
    sessionExp[`${redisKeys.userSessionExposure}${betResult.session[placedBet]?.[0]?.matchId}`] = parseFloat((parseFloat(sessionExp[`${redisKeys.userSessionExposure}${betResult.session[placedBet]?.[0]?.matchId}`] || 0) + sessionResult?.[`${placedBet}${redisKeys.profitLoss}`].maxLoss).toFixed(2));

  }

  Object.keys(sessionResult)?.forEach((item) => {
    sessionResult[item] = JSON.stringify(sessionResult[item]);
  });


  for (const placedBet of Object.keys(betResult.match)) {
    const matchId = betResult.match[placedBet]?.[0]?.matchId;

    let apiResponse;
    try {
      apiResponse = await getTournamentBettingHandler({
        matchId: matchId,
        id: placedBet
      });
    } catch (error) {
      logger.info({
        info: `Error at get match details in login.`
      });
      return;
    }
    let redisData = await this.calculateRatesRacingMatch(betResult.match[placedBet], 100, apiResponse?.data);
    let maxLoss = 0;
    Object.keys(redisData)?.forEach((key) => {
      maxLoss += Math.abs(Math.min(...Object.values(redisData[key] || {}), 0));
      redisData[key] = JSON.stringify(redisData[key]);
    });

    matchResult = {
      ...matchResult,
      ...redisData
    }
    matchExposure[`${redisKeys.userMatchExposure}${matchId}`] = parseFloat((parseFloat(matchExposure[`${redisKeys.userMatchExposure}${matchId}`] || 0) + maxLoss).toFixed(2));

  }
  return { ...sessionExp, ...sessionResult, ...matchExposure, ...matchResult }
}

exports.parseRedisData = (redisKey, userRedisData) => {
  return parseFloat((Number(userRedisData[redisKey]) || 0.0).toFixed(2));
};

exports.mergeBetsArray = async (betArr1, betArr2) => {
  let i = 0, j = 0;
  const result = [];

  // Merge arrays while both have elements
  while (i < betArr1.length && j < betArr2.length) {
    if (new Date(betArr1[i].createdAt) > new Date(betArr2[j].createdAt)) {
      result.push(betArr1[i]);
      i++;
    } else {
      result.push(betArr2[j]);
      j++;
    }
  }

  // Add remaining elements from betArr1, if any
  while (i < betArr1.length) {
    result.push(betArr1[i]);
    i++;
  }

  // Add remaining elements from betArr2, if any
  while (j < betArr2.length) {
    result.push(betArr2[j]);
    j++;
  }

  return result;
};

exports.getUserExposuresGameWise = async (user) => {
  let exposures = {};
  let betResult = {
    session: {},
    match: {}
  };
  let domainData = await this.getFaAdminDomain(user);

  let bets = [];

  for (let url of domainData) {
    let data = await getBets({
      query: JSON.stringify({
        deleteReason: "isNull",
        result: `inArr${JSON.stringify([betResultStatus.PENDING])}`,
        ...(user.roleName == userRoleConstant.fairGameAdmin ? { userId: user.id, roleName: userRoleConstant.fairGameAdmin } : {}),
        eventType: `inArr${JSON.stringify([gameType.cricket, gameType.politics, gameType.football, gameType.tennis])}`,
      })
    }, url?.domain).catch((err) => {
      logger.error({
        context: `error in ${url?.domain} setting bet placed redis`,
        process: `User ID : ${user.id} `,
        error: err.message,
        stake: err.stack,
      });
    });
    bets.push(...(data?.rows ?? []));
  }
  for (let item of bets) {
    let itemData = {
      ...item,
      winAmount: parseFloat((parseFloat(item.winAmount)).toFixed(2)),
      lossAmount: parseFloat((parseFloat(item.lossAmount)).toFixed(2))
    };
    if (betResult.session[item.betId + '_' + item.user?.id] || betResult.match[item.betId + '_' + item.user?.id]) {
      if (item.marketBetType == marketBetType.SESSION) {
        betResult.session[item.betId + '_' + item.user?.id].push(itemData);
      }
      else if (item.marketBetType == marketBetType.MATCHBETTING) {
        betResult.match[item.betId + '_' + item.user?.id].push(itemData);
      }
    }
    else {
      if (item.marketBetType == marketBetType.SESSION) {
        betResult.session[item.betId + '_' + item.user?.id] = [itemData];
      }
      else if (item.marketBetType == marketBetType.MATCHBETTING) {
        betResult.match[item.betId + '_' + item.user?.id] = [itemData];
      }
    }
  }
  for (const placedBet of Object.keys(betResult.session)) {
    const betPlaceProfitLoss = await this.calculatePLAllBet(betResult.session[placedBet], betResult?.session?.[placedBet]?.[0]?.marketType, 100, null, null);
    exposures[betResult.session[placedBet]?.[0]?.matchId] = parseFloat((parseFloat(exposures[betResult.session[placedBet]?.[0]?.matchId] || 0) + betPlaceProfitLoss.maxLoss).toFixed(2));
  }
  for (const placedBet of Object.keys(betResult.match)) {
    const matchId = betResult.match[placedBet]?.[0]?.matchId;

    let apiResponse;
    try {
      apiResponse = await getTournamentBettingHandler({
        matchId: matchId,
        id: placedBet.split("_")?.[0]
      });
    } catch (error) {
      logger.info({
        info: `Error at get match details in login.`
      });
      return;
    }
    let redisData = await this.calculateRatesRacingMatch(betResult.match[placedBet], 100, apiResponse?.data);
    let maxLoss = Object.values(redisData).reduce((prev, curr) => {
      prev += Math.abs(Math.min(...Object.values(curr || {}), 0));
      return prev
    }, 0);

    exposures[matchId] = parseFloat((parseFloat(exposures[matchId] || 0) + maxLoss).toFixed(2));
  }
  return exposures;
}

exports.getCasinoMatchDetailsExposure = async (user) => {
  let domainData = await this.getFaAdminDomain(user);

  let bets = [];

  for (let url of domainData) {
    let data = await getBets({
      query: JSON.stringify({
        deleteReason: "isNull",
        result: `inArr${JSON.stringify([betResultStatus.PENDING])}`,
        ...(user.roleName == userRoleConstant.fairGameAdmin ? { userId: user.id, roleName: userRoleConstant.fairGameAdmin } : {}),
        marketBetType: `eqCARD`,
      })
    }, url?.domain).catch((err) => {
      logger.error({
        context: `error in ${url?.domain} setting bet placed redis`,
        process: `User ID : ${user.id} `,
        error: err.message,
        stake: err.stack,
      });
    });
    bets.push(...(data?.rows ?? []));
  }
  const betsData = {};
  let resultExposure = 0;

  for (let item of bets) {
    betsData[`${item.runnerId}_${item.createBy}_${item.eventType}`] = [...(betsData[`${item.runnerId}_${item.createBy}_${item.eventType}`] || []), item];
  }
  let cardWiseExposure = {};

  if (bets.length) {
    for (let items of Object.keys(betsData)) {
      const type = items.split("_")?.[2];
      const runnerId = items.split("_")?.[0];

      let oldPl = {
        profitLoss: {},
        exposure: 0
      };
      for (let bets of betsData[items]) {
        let sid = bets?.browserDetail?.split("|")?.[1];
        switch (type) {
          case cardGameType.card32:
          case cardGameType.teen:
          case cardGameType.cricketv3:
          case cardGameType.superover:
          case cardGameType.cmatch20:
            sid = 1;
            break;
          case cardGameType.poker:
          case cardGameType.dt6:
            if (parseInt(sid) <= 2) {
              sid = 1;
            }
            break;
          case cardGameType.card32eu:
          case cardGameType.race20:
          case cardGameType.queen:
            if (parseInt(sid) <= 4) {
              sid = 1;
            }
            break;
          case cardGameType.aaa:
            if (parseInt(sid) <= 3) {
              sid = 1;
            }
            break;
          case cardGameType.btable:
            if (parseInt(sid) <= 6) {
              sid = 1;
            }
            break;
          default:
            break;
        }

        const data = new CardProfitLoss(type, oldPl.profitLoss[`${runnerId}_${sid}`], { bettingType: bets?.betType, winAmount: bets.winAmount, lossAmount: bets.lossAmount, playerName: bets?.teamName, partnership: 100, sid: sid }, (oldPl?.exposure || 0)).getCardGameProfitLoss();
        oldPl.profitLoss[`${runnerId}_${sid}`] = data.profitLoss;
        oldPl.exposure = data.exposure;
      }
      resultExposure += oldPl.exposure;
      cardWiseExposure[`${type}`] = (cardWiseExposure[`${type}`] || 0) + oldPl.exposure;
    }

  }
  return { totalExposure: resultExposure, cardWiseExposure: cardWiseExposure };
}

exports.getUserProfitLossMatch = async (user, matchId) => {
  let sessionResult = {};
  let matchResult = {};

  let domainData = await this.getFaAdminDomain(user);
  let bets = [];
  let betResult = {
    session: {},
    match: {}
  };
  for (let url of domainData) {
    let data = await getBets({
      query: JSON.stringify({
        deleteReason: "isNull",
        result: `inArr${JSON.stringify([betResultStatus.PENDING])}`,
        ...(user.roleName == userRoleConstant.fairGameAdmin ? { userId: user.id, roleName: userRoleConstant.fairGameAdmin } : {}),
        matchId: `eq${matchId}`,
      })
    }, url?.domain).catch((err) => {
      logger.error({
        context: `error in ${url?.domain} setting bet placed redis`,
        process: `User ID : ${user.id} `,
        error: err.message,
        stake: err.stack,
      });
    });
    bets.push(...(data?.rows ?? []));
  }
  for (let item of bets) {

    let itemData = {
      ...item,
      winAmount: parseFloat((parseFloat(item.winAmount)).toFixed(2)),
      lossAmount: parseFloat((parseFloat(item.lossAmount)).toFixed(2))
    };
    if (betResult.session[item.betId + '_' + item?.user?.id] || betResult.match[item.betId + '_' + item?.user?.id]) {
      if (item.marketBetType == marketBetType.SESSION) {
        betResult.session[item.betId + '_' + item?.user?.id].push(itemData);
      }
      else if (item.marketBetType == marketBetType.MATCHBETTING) {
        betResult.match[item.betId + '_' + item?.user?.id].push(itemData);
      }
    }
    else {
      if (item.marketBetType == marketBetType.SESSION) {
        betResult.session[item.betId + '_' + item?.user?.id] = [itemData];
      }
      else if (item.marketBetType == marketBetType.MATCHBETTING) {
        betResult.match[item.betId + '_' + item?.user?.id] = [itemData];
      }
    }
  }
  for (const placedBet of Object.keys(betResult.session)) {

    const betPlaceProfitLoss = await this.calculatePLAllBet(betResult.session[placedBet], betResult?.session?.[placedBet]?.[0]?.marketType, 100, null, null);

    sessionResult[`${placedBet}`] = {
      upperLimitOdds: betPlaceProfitLoss?.betData?.[betPlaceProfitLoss?.betData?.length - 1]?.odds,
      lowerLimitOdds: betPlaceProfitLoss?.betData?.[0]?.odds,
      betPlaced: betPlaceProfitLoss?.betData,
      maxLoss: betPlaceProfitLoss?.maxLoss,
      totalBet: betPlaceProfitLoss?.total_bet,
      betDetails: betResult?.session?.[placedBet]?.[0]
    };
  }
  for (const placedBet of Object.keys(betResult.match)) {
    const matchId = betResult.match[placedBet]?.[0]?.matchId;

    let apiResponse;
    try {
      apiResponse = await getTournamentBettingHandler({
        matchId: matchId,
        id: placedBet.split("_")?.[0]
      });
    } catch (error) {
      logger.info({
        info: `Error at get match details in login.`
      });
      return;
    }
    let redisData = await this.calculateRatesRacingMatch(betResult.match[placedBet], 100, apiResponse?.data);
    let tempData = {};
    Object.keys(redisData)?.forEach((items) => {
      if (tempData[items]) {
        Object.keys(redisData[items])?.forEach((matchResultData) => {
          tempData[items][matchResultData] += parseFloat(parseFloat(redisData[items]?.[matchResultData]).toFixed(2));
        });
      }
      else {
        tempData[items] = redisData[items];
      }
    });

    matchResult[placedBet] = { data: tempData, betDetails: betResult?.match?.[placedBet]?.[0] };
  }

  return { session: sessionResult, match: matchResult };

}

exports.updateSuperAdminData = async (response, type) => {
  for (let userId in response?.superAdminData) {
    if (response?.superAdminData?.[userId]?.role == userRoleConstant.user) {
      response.superAdminData[userId].exposure = -response?.superAdminData?.[userId].exposure;
    } else {
      response.superAdminData[userId].exposure = -response?.superAdminData?.[userId].exposure;
      response.superAdminData[userId].myProfitLoss = -response?.superAdminData?.[userId].myProfitLoss;
      response.superAdminData[userId].balance = 0;
    }
    updateUserBalanceData(userId, response?.superAdminData?.[userId]);
    logger.info({
      message: `Updating user balance created by fgadmin or wallet in declare ${type}: `,
      data: {
        superAdminData: response?.superAdminData?.[userId],
        userId: userId
      },
    });
  }
}
