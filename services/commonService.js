const { __mf } = require("i18n");
const { userRoleConstant, socketData, betType, betResultStatus, expertDomain, matchBettingType, marketBetType, partnershipPrefixByRole, redisKeys, tiedManualTeamName, oldBetFairDomain, profitLossKeys, matchesTeamName, otherEventMatchBettingRedisKey, gameType } = require("../config/contants");
const internalRedis = require("../config/internalRedisConnection");
const { logger } = require("../config/logger");
const { sendMessageToUser } = require("../sockets/socketManager");
const { apiCall, apiMethod, allApiRoutes } = require("../utils/apiService");
const { getUserDomainWithFaId, getDomainDataByFaId } = require("./domainDataService");
const userService = require("./userService");

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
        (parseFloat(betData?.loseAmount) * partnership) / 100
      ).toFixed(2)
      : -parseFloat(betData.loseAmount);
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


exports.mergeProfitLoss = (newbetPlaced, oldbetPlaced) => {
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
};

exports.calculatePLAllBet = async (betPlace, userPartnerShip, oldLowerLimitOdds, oldUpperLimitOdds) => {
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
    let isTiedOrCompMatch = [matchBettingType.tiedMatch1, matchBettingType.tiedMatch2, matchBettingType.completeMatch].includes(placedBets?.marketType);
    let isTiedMatch = [matchBettingType.tiedMatch1, matchBettingType.tiedMatch2].includes(placedBets?.marketType);
    let isCompleteMatch = [matchBettingType.completeMatch,matchBettingType.completeManual].includes(placedBets?.marketType);

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

exports.calculateRatesOtherMatch = async (betPlace, partnerShip = 100, matchData) => {
  let teamRates = {};

  for (let placedBets of betPlace) {
    const betType = placedBets?.marketType;
    const profitLossKey = profitLossKeys[betType];
    const teamRate = teamRates[profitLossKey] || { rates: {} };

    let calculatedRates = await this.calculateRate(
      {
        teamA: teamRate?.rates?.a || 0,
        teamB: teamRate?.rates?.b || 0,
        teamC: matchData?.teamC && !matchesTeamName[betType] ? (teamRate?.rates?.c || 0) : 0,
      },
      {
        teamA: matchesTeamName[betType]?.a ?? matchData?.teamA,
        teamB: matchesTeamName[betType]?.b ?? matchData?.teamB,
        teamC: !matchesTeamName[betType] ? matchData?.teamC : matchesTeamName[betType]?.c,
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
        ...(matchData?.teamC && !matchesTeamName[betType] ? { c: calculatedRates.teamC }:{}),
      },
      type: betType
    };
  }

  return teamRates;
}

exports.calculateRatesRacingMatch = async (betPlace, partnerShip = 100, matchData) => {
  let teamRates = {};
  const { runners } = matchData;

  for (let placedBets of betPlace) {
    const betId=placedBets?.betId;
    const matchId=placedBets?.matchId;
    const teamRate = teamRates[`${matchId}_${betId}`] || runners.reduce((acc, key) => {
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

    teamRates[`${matchId}_${betId}`] = calculatedRates;
  }

  return teamRates;
}

exports.getFaAdminDomain = async (user,select,where={}) => {
  const domainData = await getDomainDataByFaId(user.id, select, where);
  const checkIfUserExist = await userService.getUser({ createBy: user.id },["id"]);

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
    domainData= await this.getFaAdminDomain(user);
  }
  else {
    domainData = await getUserDomainWithFaId();
  }

  let bets = [];

  for (let url of domainData) {
    let data = await apiCall(apiMethod.get, url?.domain + allApiRoutes.bets.placedBet,null,{},{
      deleteReason: "isNull",
      result: `inArr${JSON.stringify([betResultStatus.PENDING])}`,
      ...(user.roleName == userRoleConstant.fairGameAdmin ? { userId: user.id, roleName: userRoleConstant.fairGameAdmin } : {}),
      eventType:`eqcricket`,
      isTeamNameAllow: false
    }).then((data) => data).catch((err) => {
      logger.error({
        context: `error in ${url?.domain} setting bet placed redis`,
        process: `User ID : ${user.id} `,
        error: err.message,
        stake: err.stack,
      });
    });
    bets.push(...(data?.data?.rows??[]));
  }
 
    let sessionResult = {};
    let sessionExp = {};
    let betResult = { session: {}, match: {} };

    let matchResult = {};
    let matchExposure = {};
    
    
    for(let item of bets){
      let itemData = {
        ...item,
        winAmount: -parseFloat((parseFloat(item.winAmount) * parseFloat(item?.user?.[`${partnershipPrefixByRole[user.roleName]}Partnership`]) / 100).toFixed(2)),
        lossAmount: -parseFloat((parseFloat(item.lossAmount) * parseFloat(item?.user?.[`${partnershipPrefixByRole[user.roleName]}Partnership`]) / 100).toFixed(2))
      };
      if (betResult.session[item.betId]||betResult.match[item.betId]) {
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
      const betPlaceProfitLoss = await this.calculatePLAllBet(betResult.session[placedBet], 100);
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
      let redisData = await this.calculateRatesMatch(betResult.match[placedBet], 100, apiResponse?.data?.match);

      let teamARate = redisData?.teamARate ?? Number.MAX_VALUE;
      let teamBRate = redisData?.teamBRate ?? Number.MAX_VALUE;
      let teamCRate = redisData?.teamCRate ?? Number.MAX_VALUE;

      let teamNoRateTie = redisData?.teamNoRateTie ?? Number.MAX_VALUE;
      let teamYesRateTie = redisData?.teamYesRateTie ?? Number.MAX_VALUE;

      let teamNoRateComplete = redisData?.teamNoRateComplete ?? Number.MAX_VALUE;
      let teamYesRateComplete = redisData?.teamYesRateComplete ?? Number.MAX_VALUE;
      maxLoss = (Math.abs(Math.min(teamARate, teamBRate, isNaN(teamCRate) ? 0 : teamCRate, 0)) + Math.abs(Math.min(teamNoRateTie, teamYesRateTie, 0)) + Math.abs(Math.min(teamNoRateComplete, teamYesRateComplete, 0))) || 0;
      matchResult = {
        ...matchResult,
        ...(teamARate != Number.MAX_VALUE && teamARate != null && teamARate != undefined ? { [redisKeys.userTeamARate + matchId]: teamARate + (matchResult[redisKeys.userTeamARate + matchId] || 0) } : {}),
        ...(teamBRate != Number.MAX_VALUE && teamBRate != null && teamBRate != undefined ? { [redisKeys.userTeamBRate + matchId]: teamBRate + (matchResult[redisKeys.userTeamBRate + matchId] || 0) } : {}),
        ...(teamCRate != Number.MAX_VALUE && teamCRate != null && teamCRate != undefined ? { [redisKeys.userTeamCRate + matchId]: teamCRate + (matchResult[redisKeys.userTeamCRate + matchId] || 0) } : {}),
        ...(teamYesRateTie != Number.MAX_VALUE && teamYesRateTie != null && teamYesRateTie != undefined ? { [redisKeys.yesRateTie + matchId]: teamYesRateTie + (matchResult[redisKeys.yesRateTie + matchId] || 0) } : {}),
        ...(teamNoRateTie != Number.MAX_VALUE && teamNoRateTie != null && teamNoRateTie != undefined ? { [redisKeys.noRateTie + matchId]: teamNoRateTie + (matchResult[redisKeys.noRateTie + matchId] || 0) } : {}),
        ...(teamYesRateComplete != Number.MAX_VALUE && teamYesRateComplete != null && teamYesRateComplete != undefined ? { [redisKeys.yesRateComplete + matchId]: teamYesRateComplete + (matchResult[redisKeys.yesRateComplete + matchId] || 0) } : {}),
        ...(teamNoRateComplete != Number.MAX_VALUE && teamNoRateComplete != null && teamNoRateComplete != undefined ? { [redisKeys.noRateComplete + matchId]: teamNoRateComplete + (matchResult[redisKeys.noRateComplete + matchId] || 0) } : {})
      }
      matchExposure[`${redisKeys.userMatchExposure}${matchId}`] = parseFloat((parseFloat(matchExposure[`${redisKeys.userMatchExposure}${matchId}`] || 0) + maxLoss).toFixed(2));

    }
    Object.keys(sessionResult)?.forEach((item)=>{
      sessionResult[item]=JSON.stringify(sessionResult[item]);
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
    domainData= await this.getFaAdminDomain(user);
  }
  else {
    domainData = await getUserDomainWithFaId();
  }

  let bets = [];

  for (let url of domainData) {
    let data = await apiCall(apiMethod.get, url?.domain + allApiRoutes.bets.placedBet,null,{},{
      deleteReason: "isNull",
      result: `inArr${JSON.stringify([betResultStatus.PENDING])}`,
      ...(user.roleName == userRoleConstant.fairGameAdmin ? { userId: user.id, roleName: userRoleConstant.fairGameAdmin } : {}),
      eventType: `inArr${JSON.stringify([gameType.football, gameType.tennis])}`,
      isTeamNameAllow: false
    }).then((data) => data).catch((err) => {
      logger.error({
        context: `error in ${url?.domain} setting bet placed redis`,
        process: `User ID : ${user.id} `,
        error: err.message,
        stake: err.stack,
      });
    });
    bets.push(...(data?.data?.rows??[]));
  }
    let sessionResult = {};
    let sessionExp = {};
    let betResult = { session: {}, match: {} };

    let matchResult = {};
    let matchExposure = {};
    
    
    for(let item of bets){
      let itemData = {
        ...item,
        winAmount: -parseFloat((parseFloat(item.winAmount) * parseFloat(item?.user?.[`${partnershipPrefixByRole[user.roleName]}Partnership`]) / 100).toFixed(2)),
        lossAmount: -parseFloat((parseFloat(item.lossAmount) * parseFloat(item?.user?.[`${partnershipPrefixByRole[user.roleName]}Partnership`]) / 100).toFixed(2))
      };
      if (betResult.session[item.betId]||betResult.match[item.betId]) {
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
      const betPlaceProfitLoss = await this.calculatePLAllBet(betResult.session[placedBet], 100);
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
    Object.keys(sessionResult)?.forEach((item)=>{
      sessionResult[item]=JSON.stringify(sessionResult[item]);
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
    domainData= await this.getFaAdminDomain(user);
  }
  else {
    domainData = await getUserDomainWithFaId();
  }

  let bets = [];

  for (let url of domainData) {
    let data = await apiCall(apiMethod.get, url?.domain + allApiRoutes.bets.placedBet,null,{},{
      deleteReason: "isNull",
      result: `inArr${JSON.stringify([betResultStatus.PENDING])}`,
      ...(user.roleName == userRoleConstant.fairGameAdmin ? { userId: user.id, roleName: userRoleConstant.fairGameAdmin } : {}),
      eventType: `inArr${JSON.stringify([gameType.horseRacing])}`,
      isTeamNameAllow: false
    }).then((data) => data).catch((err) => {
      logger.error({
        context: `error in ${url?.domain} setting bet placed redis`,
        process: `User ID : ${user.id} `,
        error: err.message,
        stake: err.stack,
      });
    });
    bets.push(...(data?.data?.rows??[]));
  }
    let betResult = { match: {} };

    let matchResult = {};
    let matchExposure = {};
    
    
    for(let item of bets){
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
        let url = expertDomain + allApiRoutes.MATCHES.MatchBettingDetail + matchId + "?type=" + matchBettingType.quickbookmaker1;
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
        maxLoss += Math.abs(Math.min(...Object.values(redisData[key] || 0), 0));
        redisData[key]=JSON.stringify(redisData[key]);
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