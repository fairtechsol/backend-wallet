const { __mf } = require("i18n");
const { userRoleConstant, socketData, betType, betResultStatus, expertDomain, matchBettingType, marketBetType, partnershipPrefixByRole, redisKeys, tiedManualTeamName, oldBetFairDomain, profitLossKeys, matchesTeamName, otherEventMatchBettingRedisKey, gameType, racingBettingType, sessionBettingType, cardGameType } = require("../config/contants");
const internalRedis = require("../config/internalRedisConnection");
const { logger } = require("../config/logger");
const { sendMessageToUser } = require("../sockets/socketManager");
const { apiCall, apiMethod, allApiRoutes } = require("../utils/apiService");
const { getUserDomainWithFaId, getDomainDataByFaId } = require("./domainDataService");
const userService = require("./userService");
const { CardProfitLoss } = require("./cardService/cardProfitLossCalc");

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

exports.calculateExpertRate = async (teamRates, data, partnership = 100) => {
  let { teamA, teamB, teamC, winAmount, lossAmount, bettingType, betOnTeam } = data;
  let newTeamRates = {
    teamA: 0,
    teamB: 0,
    teamC: 0,
  }
  if (betOnTeam == teamA && bettingType == betType.BACK) {
    newTeamRates.teamA = teamRates.teamA - ((winAmount * partnership) / 100);
    newTeamRates.teamB = teamRates.teamB + ((lossAmount * partnership) / 100);
    newTeamRates.teamC = teamRates.teamC + (teamC ? ((lossAmount * partnership) / 100) : 0);
  }
  else if (betOnTeam == teamA && bettingType == betType.LAY) {
    newTeamRates.teamA = teamRates.teamA + ((lossAmount * partnership) / 100);
    newTeamRates.teamB = teamRates.teamB - ((winAmount * partnership) / 100);
    newTeamRates.teamC = teamRates.teamC - (teamC ? ((winAmount * partnership) / 100) : 0);
  }
  else if (betOnTeam == teamB && bettingType == betType.BACK) {
    newTeamRates.teamB = teamRates.teamB - ((winAmount * partnership) / 100);
    newTeamRates.teamA = teamRates.teamA + ((lossAmount * partnership) / 100);
    newTeamRates.teamC = teamRates.teamC + (teamC ? ((lossAmount * partnership) / 100) : 0);
  }
  else if (betOnTeam == teamB && bettingType == betType.LAY) {
    newTeamRates.teamB = teamRates.teamB + ((lossAmount * partnership) / 100);
    newTeamRates.teamA = teamRates.teamA - ((winAmount * partnership) / 100);
    newTeamRates.teamC = teamRates.teamC - (teamC ? ((winAmount * partnership) / 100) : 0);
  }
  else if (teamC && betOnTeam == teamC && bettingType == betType.BACK) {
    newTeamRates.teamA = teamRates.teamA + ((lossAmount * partnership) / 100);
    newTeamRates.teamB = teamRates.teamB + ((lossAmount * partnership) / 100);
    newTeamRates.teamC = teamRates.teamC - ((winAmount * partnership) / 100);
  }
  else if (teamC && betOnTeam == teamC && bettingType == betType.LAY) {
    newTeamRates.teamA = teamRates.teamA - ((winAmount * partnership) / 100);
    newTeamRates.teamB = teamRates.teamB - ((winAmount * partnership) / 100);
    newTeamRates.teamC = teamRates.teamC + ((lossAmount * partnership) / 100);
  }

  newTeamRates = {
    teamA: Number(newTeamRates.teamA.toFixed(2)),
    teamB: Number(newTeamRates.teamB.toFixed(2)),
    teamC: Number(newTeamRates.teamC.toFixed(2))
  }
  return newTeamRates;
};

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
        for (let j =firstMeter; j <= lastMeter; j++) {
          let profitLoss = 0.0;
          for (let key in betPlace) {
            let partnership = userPartnerShip || 100;
            let bet = betPlace[key];
            let isWinningBet = (bet.betType === betType.NO && j < bet.odds) || (bet.betType === betType.YES && j >= bet.odds);
            profitLoss += isWinningBet ? (((parseFloat(bet.amount)*parseFloat(bet.rate)/100) * Math.abs(j - parseInt(bet.odds))) * partnership / 100) : (-((parseFloat(bet.amount)*parseFloat(bet.rate)/100) * Math.abs(j - parseInt(bet.odds))) * partnership / 100);
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

exports.calculateRatesMatch = async (betPlace, partnerShip = 100, matchData) => {
  let teamARate = 0;
  let teamBRate = 0;
  let teamCRate = 0;

  let teamNoRateTie = 0;
  let teamYesRateTie = 0;

  let teamNoRateComplete = 0;
  let teamYesRateComplete = 0;

  for (let placedBets of betPlace) {
    let isTiedOrCompMatch = [matchBettingType.tiedMatch1, matchBettingType.tiedMatch3, matchBettingType.tiedMatch2, matchBettingType.completeMatch, matchBettingType.completeMatch1, matchBettingType.completeManual].includes(placedBets?.marketType);
    let isTiedMatch = [matchBettingType.tiedMatch1, matchBettingType.tiedMatch2, matchBettingType.tiedMatch1].includes(placedBets?.marketType);
    let isCompleteMatch = [matchBettingType.completeMatch, matchBettingType.completeMatch1, matchBettingType.completeManual].includes(placedBets?.marketType);

    let calculatedRates = await this.calculateRate({
      teamA: isTiedMatch ? teamYesRateTie : isCompleteMatch ? teamYesRateComplete : teamARate,
      teamB: isTiedMatch ? teamNoRateTie : isCompleteMatch ? teamNoRateComplete : teamBRate,
      ...(matchData?.teamC && !isTiedOrCompMatch ? { teamC: teamCRate } : { teamC: 0 }),
    },
      {
        teamA: isTiedOrCompMatch ? tiedManualTeamName.yes : matchData?.teamA,
        teamB: isTiedOrCompMatch ? tiedManualTeamName.no : matchData?.teamB,
        teamC: isTiedOrCompMatch ? null : matchData?.teamC,
        winAmount: placedBets?.winAmount,
        lossAmount: placedBets?.lossAmount,
        bettingType: placedBets?.betType,
        betOnTeam: placedBets?.teamName
      },
      partnerShip);

    if (isTiedMatch) {
      teamYesRateTie = calculatedRates.teamA;
      teamNoRateTie = calculatedRates.teamB;
    }
    else if (isCompleteMatch) {
      teamYesRateComplete = calculatedRates.teamA;
      teamNoRateComplete = calculatedRates.teamB;
    }
    else {
      teamARate = calculatedRates.teamA;
      teamBRate = calculatedRates.teamB;
      teamCRate = calculatedRates.teamC;
    }
  }

  return { teamARate, teamBRate, teamCRate, teamNoRateTie, teamYesRateTie, teamNoRateComplete, teamYesRateComplete };
}

exports.calculateRatesOtherMatch = async (betPlace, partnerShip = 100, matchData, matchBetting) => {
  let teamRates = {};

  for (let placedBets of betPlace) {
    const betType = placedBets?.marketType;
    let profitLossKey;
    if (betType == matchBettingType.other) {
      profitLossKey = profitLossKeys[betType] + placedBets?.id;
    }
    else{
      profitLossKey = profitLossKeys[betType];
    }
    const teamRate = teamRates[profitLossKey] || { rates: {} };

    let calculatedRates = await this.calculateRate(
      {
        teamA: teamRate?.rates?.a || 0,
        teamB: teamRate?.rates?.b || 0,
        teamC: matchData?.teamC && !matchesTeamName[betType] ? (teamRate?.rates?.c || 0) : 0,
      },
      {
        teamA: matchesTeamName[betType]?.a ?? matchBetting?.metaData?.teamA ?? matchData?.teamA,
        teamB: matchesTeamName[betType]?.b ?? matchBetting?.metaData?.teamB ?? matchData?.teamB,
        teamC: matchBetting?.metaData?.teamC ? matchBetting?.metaData?.teamC : !matchesTeamName[betType] ? matchData?.teamC : matchesTeamName[betType]?.c,
        winAmount: placedBets?.winAmount,
        lossAmount: placedBets?.lossAmount,
        bettingType: placedBets?.betType,
        betOnTeam: placedBets?.teamName
      },
      partnerShip
    );

    teamRates[profitLossKey] = {
      rates: {
        ...teamRate.rates,
        a: calculatedRates.teamA,
        b: calculatedRates.teamB,
        ...(matchData?.teamC && !matchesTeamName[betType] ? { c: calculatedRates.teamC } : {}),
      },
      type: betType,
      betId: placedBets?.betId
    };
  }

  return teamRates;
}

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

/**
 * Retrieves and calculates various betting data for a user at login.
 * @param {Object} user - The user object.
 * @param {string} user.roleName - The role name of the user.
 * @param {string} user.id - The unique identifier of the user.
 * @returns {Object} - An object containing calculated betting data.
 * @throws {Error} - Throws an error if there is an issue fetching data.
 */
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
    let data = await apiCall(apiMethod.get, url?.domain + allApiRoutes.bets.placedBet, null, {}, {
      deleteReason: "isNull",
      result: `inArr${JSON.stringify([betResultStatus.PENDING])}`,
      ...(user.roleName == userRoleConstant.fairGameAdmin ? { userId: user.id, roleName: userRoleConstant.fairGameAdmin } : {}),
      eventType:`inArr${JSON.stringify([gameType.cricket,gameType.politics])}`,
      isTeamNameAllow: false,
      marketType: `ne${matchBettingType.tournament}`
    }).then((data) => data).catch((err) => {
      logger.error({
        context: `error in ${url?.domain} setting bet placed redis`,
        process: `User ID : ${user.id} `,
        error: err.message,
        stake: err.stack,
      });
    });
    bets.push(...(data?.data?.rows ?? []));
  }

  let sessionResult = {};
  let sessionExp = {};
  let betResult = { session: {}, match: {} };

  let matchResult = {};
  let matchExposure = {};


  for (let item of bets) {
    let itemData = {
      ...item,
      winAmount: -parseFloat((parseFloat(item.winAmount) * parseFloat(item?.user?.[`${partnershipPrefixByRole[user.roleName]}Partnership`]) / 100).toFixed(2)),
      lossAmount: -parseFloat((parseFloat(item.lossAmount) * parseFloat(item?.user?.[`${partnershipPrefixByRole[user.roleName]}Partnership`]) / 100).toFixed(2))
    };
    if (betResult.session[item.betId] || betResult.match[item.betId]) {
      if (item.marketBetType == marketBetType.SESSION) {
        betResult.session[item.betId].push(itemData);
      }
      else {
        betResult.match[item.betId].push(itemData);
      }
    }
    else {
      if (item.marketBetType == marketBetType.SESSION) {
        betResult.session[item.betId] = [itemData];
      }
      else {
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

  for (const placedBet of Object.keys(betResult.match)) {
    const matchId = betResult.match[placedBet]?.[0]?.matchId;

    let apiResponse;
    try {
      let url = expertDomain + allApiRoutes.MATCHES.MatchBettingDetail + matchId + "?type=" + betResult?.match[placedBet]?.[0]?.marketType + "&id=" + placedBet;
      apiResponse = await apiCall(apiMethod.get, url);
    } catch (error) {
      logger.info({
        info: `Error at get match details in login.`
      });
      return;
    }
    let redisData = await this.calculateRatesOtherMatch(betResult.match[placedBet], 100, apiResponse?.data?.match, apiResponse?.data?.matchBetting);
      let maxLoss;
      Object.values(redisData)?.forEach((plData) => {
        maxLoss += Math.abs(Math.min(...Object.values(plData?.rates), 0));

        matchResult = {
          ...matchResult,
          [`${otherEventMatchBettingRedisKey[plData?.type].a}${plData?.type == matchBettingType?.other ? plData?.betId+ "_"  : ""}${matchId}`]: plData?.rates?.a + (matchResult?.[`${otherEventMatchBettingRedisKey[plData?.type].a}${plData?.type == matchBettingType?.other ? plData?.betId+ "_"  : ""}${matchId}`] || 0),
          [`${otherEventMatchBettingRedisKey[plData?.type].b}${plData?.type == matchBettingType?.other ? plData?.betId + "_" : ""}${matchId}`]: plData?.rates?.b + (matchResult?.[`${otherEventMatchBettingRedisKey[plData?.type].b}${plData?.type == matchBettingType?.other ? plData?.betId+ "_"  : ""}${matchId}`] || 0),
          ...(plData?.rates?.c ? { [`${otherEventMatchBettingRedisKey[plData?.type].c}${plData?.type == matchBettingType?.other ? plData?.betId + "_" : ""}${matchId}`]: plData?.rates?.c + (matchResult?.[`${otherEventMatchBettingRedisKey[plData?.type].c}${plData?.type == matchBettingType?.other ? plData?.betId+ "_"  : ""}${matchId}`] || 0) } : {}),
        }
      });

      matchExposure[`${redisKeys.userMatchExposure}${matchId}`] = parseFloat((parseFloat(matchExposure[`${redisKeys.userMatchExposure}${matchId}`] || 0) + maxLoss).toFixed(2));  

  }
  Object.keys(sessionResult)?.forEach((item) => {
    sessionResult[item] = JSON.stringify(sessionResult[item]);
  });
  return {
    ...matchExposure, ...matchResult, ...sessionExp, ...sessionResult
  }
}

/**
 * Retrieves and calculates various betting data for a user at login.
 * @param {Object} user - The user object.
 * @param {string} user.roleName - The role name of the user.
 * @param {string} user.id - The unique identifier of the user.
 * @returns {Object} - An object containing calculated betting data.
 * @throws {Error} - Throws an error if there is an issue fetching data.
 */
exports.settingOtherMatchBetsDataAtLogin = async (user) => {

  let domainData;
  if (user.roleName == userRoleConstant.fairGameAdmin) {
    domainData = await this.getFaAdminDomain(user);
  }
  else {
    domainData = await getUserDomainWithFaId();
  }

  let bets = [];

  for (let url of domainData) {
    let data = await apiCall(apiMethod.get, url?.domain + allApiRoutes.bets.placedBet, null, {}, {
      deleteReason: "isNull",
      result: `inArr${JSON.stringify([betResultStatus.PENDING])}`,
      ...(user.roleName == userRoleConstant.fairGameAdmin ? { userId: user.id, roleName: userRoleConstant.fairGameAdmin } : {}),
      eventType: `inArr${JSON.stringify([gameType.football, gameType.tennis])}`,
      isTeamNameAllow: false,
      marketType: `ne${matchBettingType.tournament}`
    }).then((data) => data).catch((err) => {
      logger.error({
        context: `error in ${url?.domain} setting bet placed redis`,
        process: `User ID : ${user.id} `,
        error: err.message,
        stake: err.stack,
      });
    });
    bets.push(...(data?.data?.rows ?? []));
  }
  let sessionResult = {};
  let sessionExp = {};
  let betResult = { session: {}, match: {} };

  let matchResult = {};
  let matchExposure = {};


  for (let item of bets) {
    let itemData = {
      ...item,
      winAmount: -parseFloat((parseFloat(item.winAmount) * parseFloat(item?.user?.[`${partnershipPrefixByRole[user.roleName]}Partnership`]) / 100).toFixed(2)),
      lossAmount: -parseFloat((parseFloat(item.lossAmount) * parseFloat(item?.user?.[`${partnershipPrefixByRole[user.roleName]}Partnership`]) / 100).toFixed(2))
    };
    if (betResult.session[item.betId] || betResult.match[item.betId]) {
      if (item.marketBetType == marketBetType.SESSION) {
        betResult.session[item.betId].push(itemData);
      }
      else {
        betResult.match[item.betId].push(itemData);
      }
    }
    else {
      if (item.marketBetType == marketBetType.SESSION) {
        betResult.session[item.betId] = [itemData];
      }
      else {
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

  for (const placedBet of Object.keys(betResult.match)) {
    const matchId = betResult.match[placedBet]?.[0]?.matchId;

    let apiResponse;
    try {
      let url = expertDomain + allApiRoutes.MATCHES.MatchBettingDetail + matchId + "?type=" + matchBettingType.quickbookmaker1;
      apiResponse = await apiCall(apiMethod.get, url);
    } catch (error) {
      logger.info({
        info: `Error at get match details in login.`
      });
      return;
    }
    let redisData = await this.calculateRatesOtherMatch(betResult.match[placedBet], 100, apiResponse?.data?.match);
    let maxLoss;
    Object.values(redisData)?.forEach((plData) => {
      maxLoss = Math.abs(Math.min(...Object.values(plData?.rates), 0));

      matchResult = {
        ...matchResult,
        [otherEventMatchBettingRedisKey[plData?.type].a + matchId]: (matchResult?.[otherEventMatchBettingRedisKey[plData?.type].a + matchId] || 0) + plData?.rates?.a,
        [otherEventMatchBettingRedisKey[plData?.type].b + matchId]: (matchResult?.[otherEventMatchBettingRedisKey[plData?.type].b + matchId] || 0) + plData?.rates?.b,
        ...(plData?.rates?.c ? { [otherEventMatchBettingRedisKey[plData?.type].c + matchId]: (matchResult?.[otherEventMatchBettingRedisKey[plData?.type].c + matchId] || 0) + plData?.rates?.c } : {}),
      }

    });
    matchExposure[`${redisKeys.userMatchExposure}${matchId}`] = parseFloat((parseFloat(matchExposure[`${redisKeys.userMatchExposure}${matchId}`] || 0) + maxLoss).toFixed(2));

  }
  Object.keys(sessionResult)?.forEach((item) => {
    sessionResult[item] = JSON.stringify(sessionResult[item]);
  });
  return {
    ...matchExposure, ...matchResult, ...sessionExp, ...sessionResult
  }
}

/**
 * Retrieves and calculates various betting data for a user at login.
 * @param {Object} user - The user object.
 * @param {string} user.roleName - The role name of the user.
 * @param {string} user.id - The unique identifier of the user.
 * @returns {Object} - An object containing calculated betting data.
 * @throws {Error} - Throws an error if there is an issue fetching data.
 */
exports.settingRacingMatchBetsDataAtLogin = async (user) => {

  let domainData;
  if (user.roleName == userRoleConstant.fairGameAdmin) {
    domainData = await this.getFaAdminDomain(user);
  }
  else {
    domainData = await getUserDomainWithFaId();
  }

  let bets = [];

  for (let url of domainData) {
    let data = await apiCall(apiMethod.get, url?.domain + allApiRoutes.bets.placedBet, null, {}, {
      deleteReason: "isNull",
      result: `inArr${JSON.stringify([betResultStatus.PENDING])}`,
      ...(user.roleName == userRoleConstant.fairGameAdmin ? { userId: user.id, roleName: userRoleConstant.fairGameAdmin } : {}),
      eventType: `inArr${JSON.stringify([gameType.horseRacing, gameType.greyHound])}`,
      isTeamNameAllow: false
    }).then((data) => data).catch((err) => {
      logger.error({
        context: `error in ${url?.domain} setting bet placed redis`,
        process: `User ID : ${user.id} `,
        error: err.message,
        stake: err.stack,
      });
    });
    bets.push(...(data?.data?.rows ?? []));
  }
  let betResult = { match: {} };

  let matchResult = {};
  let matchExposure = {};


  for (let item of bets) {
    let itemData = {
      ...item,
      winAmount: -parseFloat((parseFloat(item.winAmount) * parseFloat(item?.user?.[`${partnershipPrefixByRole[user.roleName]}Partnership`]) / 100).toFixed(2)),
      lossAmount: -parseFloat((parseFloat(item.lossAmount) * parseFloat(item?.user?.[`${partnershipPrefixByRole[user.roleName]}Partnership`]) / 100).toFixed(2))
    };
    if (betResult.match[item.betId]) {
      betResult.match[item.betId].push(itemData);
    }
    else {
      betResult.match[item.betId] = [itemData];
    }
  };

  for (const placedBet of Object.keys(betResult.match)) {
    const matchId = betResult.match[placedBet]?.[0]?.matchId;

    let apiResponse;
    try {
      let url = expertDomain + allApiRoutes.MATCHES.raceBettingDetail + matchId + "?type=" + racingBettingType.matchOdd;
      apiResponse = await apiCall(apiMethod.get, url);
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

  return {
    ...matchExposure, ...matchResult
  }
}

/**
 * Retrieves and calculates various betting data for a user at login.
 * @param {Object} user - The user object.
 * @param {string} user.roleName - The role name of the user.
 * @param {string} user.id - The unique identifier of the user.
 * @returns {Object} - An object containing calculated betting data.
 * @throws {Error} - Throws an error if there is an issue fetching data.
 */
exports.settingTournamentMatchBetsDataAtLogin = async (user) => {

  let domainData;
  if (user.roleName == userRoleConstant.fairGameAdmin) {
    domainData = await this.getFaAdminDomain(user);
  }
  else {
    domainData = await getUserDomainWithFaId();
  }

  let bets = [];

  for (let url of domainData) {
    let data = await apiCall(apiMethod.get, url?.domain + allApiRoutes.bets.placedBet, null, {}, {
      deleteReason: "isNull",
      result: `inArr${JSON.stringify([betResultStatus.PENDING])}`,
      ...(user.roleName == userRoleConstant.fairGameAdmin ? { userId: user.id, roleName: userRoleConstant.fairGameAdmin } : {}),
      marketType: `inArr${JSON.stringify([matchBettingType.tournament])}`,
      isTeamNameAllow: false
    }).then((data) => data).catch((err) => {
      logger.error({
        context: `error in ${url?.domain} setting bet placed redis`,
        process: `User ID : ${user.id} `,
        error: err.message,
        stake: err.stack,
      });
    });
    bets.push(...(data?.data?.rows ?? []));
  }
  let betResult = { match: {} };

  let matchResult = {};
  let matchExposure = {};


  for (let item of bets) {
    let itemData = {
      ...item,
      winAmount: -parseFloat((parseFloat(item.winAmount) * parseFloat(item?.user?.[`${partnershipPrefixByRole[user.roleName]}Partnership`]) / 100).toFixed(2)),
      lossAmount: -parseFloat((parseFloat(item.lossAmount) * parseFloat(item?.user?.[`${partnershipPrefixByRole[user.roleName]}Partnership`]) / 100).toFixed(2))
    };
    if (betResult.match[item.betId]) {
      betResult.match[item.betId].push(itemData);
    }
    else {
      betResult.match[item.betId] = [itemData];
    }
  };

  for (const placedBet of Object.keys(betResult.match)) {
    const matchId = betResult.match[placedBet]?.[0]?.matchId;

    let apiResponse;
    try {
      let url = expertDomain + allApiRoutes.MATCHES.tournamentBettingDetail + matchId + "?type=" + matchBettingType.tournament + "&id=" + placedBet;
      apiResponse = await apiCall(apiMethod.get, url);
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

  return {
    ...matchExposure, ...matchResult
  }
}

exports.parseRedisData = (redisKey, userRedisData) => {
  return parseFloat((Number(userRedisData[redisKey]) || 0.0).toFixed(2));
};

exports.isValidUUID = (uuid) => {
  const regex = /^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;
  return regex.test(uuid);
}

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
  let matchResult = {};
  let domainData = await this.getFaAdminDomain(user);

  let bets = [];

  for (let url of domainData) {
    let data = await apiCall(apiMethod.get, url?.domain + allApiRoutes.bets.placedBet, null, {}, {
      deleteReason: "isNull",
      result: `inArr${JSON.stringify([betResultStatus.PENDING])}`,
      ...(user.roleName == userRoleConstant.fairGameAdmin ? { userId: user.id, roleName: userRoleConstant.fairGameAdmin } : {}),
      eventType: `inArr${JSON.stringify([gameType.cricket, gameType.politics, gameType.football, gameType.tennis])}`,
      isTeamNameAllow: false,
      marketType: `ne${matchBettingType.tournament}`
    }).then((data) => data).catch((err) => {
      logger.error({
        context: `error in ${url?.domain} setting bet placed redis`,
        process: `User ID : ${user.id} `,
        error: err.message,
        stake: err.stack,
      });
    });
    bets.push(...(data?.data?.rows ?? []));
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
      else {
        betResult.match[item.betId + '_' + item.user?.id].push(itemData);
      }
    }
    else {
      if (item.marketBetType == marketBetType.SESSION) {
        betResult.session[item.betId + '_' + item.user?.id] = [itemData];
      }
      else {
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
      let url = expertDomain + allApiRoutes.MATCHES.MatchBettingDetail + matchId + ([gameType.cricket, gameType.politics].includes(betResult.match[placedBet]?.[0]?.eventType) ? `?type=${betResult?.match[placedBet]?.[0]?.marketType}&id=${placedBet?.split("_")?.[0]}` : `?type=${matchBettingType.quickbookmaker1}`);
      apiResponse = await apiCall(apiMethod.get, url);
    } catch (error) {
      logger.info({
        info: `Error at get match details in login.`
      });
      return;
    }
    let redisData = await this.calculateRatesOtherMatch(betResult.match[placedBet], 100, apiResponse?.data?.match, [gameType.cricket, gameType.politics].includes(betResult.match[placedBet]?.[0]?.eventType) ? apiResponse?.data?.matchBetting : null);
    matchResult[`${matchId}_${placedBet.split("_")?.[1]}`] = matchResult[`${matchId}_${placedBet.split("_")?.[1]}`] || {};
    matchResult[`${matchId}_${placedBet.split("_")?.[1]}`][Object.keys(redisData)[0]] = matchResult[`${matchId}_${placedBet.split("_")?.[1]}`][Object.keys(redisData)[0]] || { a: 0, b: 0, c: 0 };
    Object.keys(matchResult[`${matchId}_${placedBet.split("_")?.[1]}`][Object.keys(redisData)[0]]).forEach((key) => {
      matchResult[`${matchId}_${placedBet.split("_")?.[1]}`][Object.keys(redisData)[0]][key] += redisData[Object.keys(redisData)[0]].rates[key] || 0;
    });
  }
  for (let item of Object.keys(matchResult)) {
    let maxLoss = Object.values(matchResult[item]).reduce((prev, curr) => {
      prev += Math.abs(Math.min(...Object.values(curr), 0));
      return prev;
    }, 0);
    exposures[item.split("_")?.[0]] = parseFloat((parseFloat(exposures[item.split("_")?.[0]] || 0) + maxLoss).toFixed(2));
  }
  return exposures;
}

exports.getUserExposuresTournament = async (user) => {
  let betResult = { match: {} };
  let exposures = {};
  let domainData = await this.getFaAdminDomain(user);

  let bets = [];

  for (let url of domainData) {
    let data = await apiCall(apiMethod.get, url?.domain + allApiRoutes.bets.placedBet, null, {}, {
      deleteReason: "isNull",
      result: `inArr${JSON.stringify([betResultStatus.PENDING])}`,
      ...(user.roleName == userRoleConstant.fairGameAdmin ? { userId: user.id, roleName: userRoleConstant.fairGameAdmin } : {}),
      marketType: `inArr${JSON.stringify([matchBettingType.tournament])}`,
      isTeamNameAllow: false
    }).then((data) => data).catch((err) => {
      logger.error({
        context: `error in ${url?.domain} setting bet placed redis`,
        process: `User ID : ${user.id} `,
        error: err.message,
        stake: err.stack,
      });
    });
    bets.push(...(data?.data?.rows ?? []));
  }

  for (let item of bets) {
    let itemData = {
      ...item,
      winAmount: parseFloat((parseFloat(item.winAmount)).toFixed(2)),
      lossAmount: parseFloat((parseFloat(item.lossAmount)).toFixed(2))
    };
    if (betResult.match[item.betId + '_' + item.user?.id]) {
      betResult.match[item.betId + '_' + item.user?.id].push(itemData);
    }
    else {
      betResult.match[item.betId + '_' + item.user?.id] = [itemData];
    }
  }

    for (const placedBet of Object.keys(betResult.match)) {
      const matchId = betResult.match[placedBet]?.[0]?.matchId;

      let apiResponse;
      try {
        let url = expertDomain + allApiRoutes.MATCHES.tournamentBettingDetail + matchId + "?type=" + matchBettingType.tournament + "&id=" + placedBet.split("_")?.[0];
        apiResponse = await apiCall(apiMethod.get, url);
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
  let domainData= await this.getFaAdminDomain(user);
    
    let bets = [];
  
    for (let url of domainData) {
      let data = await apiCall(apiMethod.get, url?.domain + allApiRoutes.bets.placedBet, null, {}, {
        deleteReason: "isNull",
        result: `inArr${JSON.stringify([betResultStatus.PENDING])}`,
        ...(user.roleName == userRoleConstant.fairGameAdmin ? { userId: user.id, roleName: userRoleConstant.fairGameAdmin } : {}),
        marketBetType: `eqCARD`,
        isTeamNameAllow: false,
      }).then((data) => data).catch((err) => {
        logger.error({
          context: `error in ${url?.domain} setting bet placed redis`,
          process: `User ID : ${user.id} `,
          error: err.message,
          stake: err.stack,
        });
      });
      bets.push(...(data?.data?.rows ?? []));
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

exports.getUserProfitLossMatch = async (user,matchId) => {
  let matchResult = {};
  let sessionResult = {};
  let domainData = await this.getFaAdminDomain(user);
  let bets = [];
  let betResult = {
    session: {},
    match: {}
  };
  for (let url of domainData) {
    let data = await apiCall(apiMethod.get, url?.domain + allApiRoutes.bets.placedBet, null, {}, {
      deleteReason: "isNull",
      result: `inArr${JSON.stringify([betResultStatus.PENDING])}`,
      ...(user.roleName == userRoleConstant.fairGameAdmin ? { userId: user.id, roleName: userRoleConstant.fairGameAdmin } : {}),
      matchId: `eq${matchId}`,
      isTeamNameAllow: false,
      marketType: `ne${matchBettingType.tournament}`
    }).then((data) => data).catch((err) => {
      logger.error({
        context: `error in ${url?.domain} setting bet placed redis`,
        process: `User ID : ${user.id} `,
        error: err.message,
        stake: err.stack,
      });
    });
    bets.push(...(data?.data?.rows ?? []));
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
        else {
          betResult.match[item.betId + '_' + item?.user?.id].push(itemData);

        }
      }
      else {
        if (item.marketBetType == marketBetType.SESSION) {
          betResult.session[item.betId + '_' + item?.user?.id] = [itemData];
        }
        else {
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
        let url = expertDomain + allApiRoutes.MATCHES.MatchBettingDetail + matchId + ([gameType.cricket, gameType.politics].includes(betResult.match[placedBet]?.[0]?.eventType) ? `?type=${betResult?.match[placedBet]?.[0]?.marketType}&id=${placedBet?.split("_")?.[0]}` : `?type=${matchBettingType.quickbookmaker1}`);
        apiResponse = await apiCall(apiMethod.get, url);
      } catch (error) {
        logger.info({
          info: `Error at get match details in login.`
        });
        return;
      }
      let redisData = await this.calculateRatesOtherMatch(betResult.match[placedBet], 100, apiResponse?.data?.match, [gameType.cricket, gameType.politics].includes(betResult.match[placedBet]?.[0]?.eventType) ? apiResponse?.data?.matchBetting : null);
      Object.values(redisData)?.forEach((plData) => {
        const currType = [matchBettingType.matchOdd, matchBettingType.bookmaker, matchBettingType.bookmaker2, matchBettingType.quickbookmaker1, matchBettingType.quickbookmaker2, matchBettingType.quickbookmaker3].includes(plData.type) ? matchBettingType.matchOdd : [matchBettingType.tiedMatch1, matchBettingType.tiedMatch2, matchBettingType.tiedMatch3].includes(plData.type) ? matchBettingType.tiedMatch1 : [matchBettingType.completeManual, matchBettingType.completeMatch1, matchBettingType.completeMatch].includes(plData.type) ? matchBettingType.completeMatch : plData.type;
        matchResult[currType] = {
          data: {
            [`${otherEventMatchBettingRedisKey[plData?.type].a}${plData?.type == matchBettingType?.other ? plData?.betId + "_" : ""}${matchId}`]: plData?.rates?.a + (matchResult?.[currType]?.data?.[`${otherEventMatchBettingRedisKey[plData?.type].a}${plData?.type == matchBettingType?.other ? plData?.betId + "_" : ""}${matchId}`] || 0),
            [`${otherEventMatchBettingRedisKey[plData?.type].b}${plData?.type == matchBettingType?.other ? plData?.betId + "_" : ""}${matchId}`]: plData?.rates?.b + (matchResult?.[currType]?.data?.[`${otherEventMatchBettingRedisKey[plData?.type].b}${plData?.type == matchBettingType?.other ? plData?.betId + "_" : ""}${matchId}`] || 0),
            ...(plData?.rates?.c ? { [`${otherEventMatchBettingRedisKey[plData?.type].c}${plData?.type == matchBettingType?.other ? plData?.betId + "_" : ""}${matchId}`]: plData?.rates?.c + (matchResult?.[currType]?.data?.[`${otherEventMatchBettingRedisKey[plData?.type].c}${plData?.type == matchBettingType?.other ? plData?.betId + "_" : ""}${matchId}`] || 0) } : {}),
          },
          betDetails: betResult?.match?.[placedBet]?.[0]
        }
      });
    }

    return { match: matchResult, session: sessionResult };
  
}

exports.getUserProfitLossTournament = async (user, matchId) => {
  let matchResult = {};

  let domainData = await this.getFaAdminDomain(user);

  let bets = [];
  let betResult = {
    session: {},
    match: {}
  };
  for (let url of domainData) {
    let data = await apiCall(apiMethod.get, url?.domain + allApiRoutes.bets.placedBet, null, {}, {
      deleteReason: "isNull",
      result: `inArr${JSON.stringify([betResultStatus.PENDING])}`,
      ...(user.roleName == userRoleConstant.fairGameAdmin ? { userId: user.id, roleName: userRoleConstant.fairGameAdmin } : {}),
      marketType: `inArr${JSON.stringify([matchBettingType.tournament])}`,
      matchId: `eq${matchId}`,
      isTeamNameAllow: false
    }).then((data) => data).catch((err) => {
      logger.error({
        context: `error in ${url?.domain} setting bet placed redis`,
        process: `User ID : ${user.id} `,
        error: err.message,
        stake: err.stack,
      });
    });
    bets.push(...(data?.data?.rows ?? []));
  }

    for(let item of bets){
      let itemData = {
        ...item,
        winAmount: parseFloat((parseFloat(item.winAmount)).toFixed(2)),
        lossAmount: parseFloat((parseFloat(item.lossAmount)).toFixed(2))
      };
      if (betResult.match[item.betId + '_' + item?.user?.id]) {
        betResult.match[item.betId + '_' + item?.user?.id].push(itemData);
      }
      else {
        betResult.match[item.betId + '_' + item?.user?.id] = [itemData];
      }
    }

    for (const placedBet of Object.keys(betResult.match)) {
      const matchId = betResult.match[placedBet]?.[0]?.matchId;

      let apiResponse;
      try {
        let url = expertDomain + allApiRoutes.MATCHES.tournamentBettingDetail + matchId + "?type=" + matchBettingType.tournament + "&id=" + placedBet.split("_")?.[0];
        apiResponse = await apiCall(apiMethod.get, url);
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
    return matchResult;
}

exports.getRedisKeys = (matchBetType, matchId, redisKeys, betId) => {
  let teamArateRedisKey, teamBrateRedisKey, teamCrateRedisKey;

  if (matchBetType === matchBettingType.tiedMatch1 || matchBetType === matchBettingType.tiedMatch3 || matchBetType === matchBettingType.tiedMatch2) {
    teamArateRedisKey = redisKeys.yesRateTie + matchId;
    teamBrateRedisKey = redisKeys.noRateTie + matchId;
    teamCrateRedisKey = null;
  } else if (matchBetType === matchBettingType.completeMatch || matchBetType === matchBettingType.completeMatch1 || matchBetType === matchBettingType.completeManual) {
    teamArateRedisKey = redisKeys.yesRateComplete + matchId;
    teamBrateRedisKey = redisKeys.noRateComplete + matchId;
    teamCrateRedisKey = null;
  }
  else if(matchBetType == matchBettingType.other){
    teamArateRedisKey = redisKeys.userTeamARateOther + betId + "_" + matchId;
    teamBrateRedisKey = redisKeys.userTeamBRateOther + betId + "_" + matchId;
    teamCrateRedisKey = redisKeys.userTeamCRateOther + betId + "_" + matchId;
  }
  else {
    teamArateRedisKey = redisKeys.userTeamARate + matchId;
    teamBrateRedisKey = redisKeys.userTeamBRate + matchId;
    teamCrateRedisKey = redisKeys.userTeamCRate + matchId;
  }

  return { teamArateRedisKey, teamBrateRedisKey, teamCrateRedisKey };
}