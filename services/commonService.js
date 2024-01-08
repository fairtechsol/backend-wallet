const { userRoleConstant, socketData, betType } = require("../config/contants");
const internalRedis = require("../config/internalRedisConnection");
const { sendMessageToUser } = require("../sockets/socketManager");

exports.forceLogoutIfLogin = async (userId) => {
    let token = await internalRedis.hget(userId,"token");
  
    if (token) {
      // function to force logout
      sendMessageToUser(userId,socketData.logoutUserForceEvent,null)
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
        }
      }
        break;
      case (userRoleConstant.superMaster): {
        switch (userData.roleName) {
          case (userRoleConstant.master): {
            mPartnership = 100 - parseInt(creator.myPartnership + fwPartnership + faPartnership + saPartnership + aPartnership);
            break;
          }
        }
      }
        break;
    }
  
    if (userData.roleName != userRoleConstant.expert && fwPartnership + faPartnership + saPartnership + aPartnership + smPartnership + mPartnership != 100) {
      throw new Error("user.partnershipNotValid");
    }
    return {
      fwPartnership,
      faPartnership,
      saPartnership,
      aPartnership,
      smPartnership,
      mPartnership
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

  class ColumnNumericTransformer {
    to(data) {
        return data;
    }
    from(data) {
        if (data && data != 'NaN') return parseFloat(data).toFixed(2);
        return 0;
    }
}

exports.ColumnNumericTransformer = ColumnNumericTransformer;

exports.calculateExpertRate =async  (teamRates, data, partnership = 100) => {
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
    newTeamRates.teamA = teamRates.teamA + ((winAmount * partnership) / 100);
    newTeamRates.teamB = teamRates.teamB - ((lossAmount * partnership) / 100);
    newTeamRates.teamC = teamRates.teamC - (teamC ? ((lossAmount * partnership) / 100) : 0);
  }
  else if (betOnTeam == teamB && bettingType == betType.BACK) {
    newTeamRates.teamB = teamRates.teamB - ((winAmount * partnership) / 100);
    newTeamRates.teamA = teamRates.teamA + ((lossAmount * partnership) / 100);
    newTeamRates.teamC = teamRates.teamC + (teamC ? ((lossAmount * partnership) / 100) : 0);
  }
  else if (betOnTeam == teamB && bettingType == betType.LAY) {
    newTeamRates.teamB = teamRates.teamB + ((winAmount * partnership) / 100);
    newTeamRates.teamA = teamRates.teamA - ((lossAmount * partnership) / 100);
    newTeamRates.teamC = teamRates.teamC - (teamC ? ((lossAmount * partnership) / 100) : 0);
  }
  else if (teamC && betOnTeam == teamC && bettingType == betType.BACK) {
    newTeamRates.teamA = teamRates.teamA + ((winAmount * partnership) / 100);
    newTeamRates.teamB = teamRates.teamB + ((lossAmount * partnership) / 100);
    newTeamRates.teamC = teamRates.teamC - ((lossAmount * partnership) / 100);
  }
  else if (teamC && betOnTeam == teamC && bettingType == betType.LAY) {
    newTeamRates.teamA = teamRates.teamA + ((winAmount * partnership) / 100);
    newTeamRates.teamB = teamRates.teamB - ((lossAmount * partnership) / 100);
    newTeamRates.teamC = teamRates.teamC + ((lossAmount * partnership) / 100);
  }

  newTeamRates = {
    teamA: Number(newTeamRates.teamA.toFixed(2)),
    teamB: Number(newTeamRates.teamB.toFixed(2)),
    teamC: Number(newTeamRates.teamC.toFixed(2))
  }
  return newTeamRates;
}


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
    const calculateProfitLoss = (betData, odds,partnership) => {
      if (
        (betData?.betPlacedData?.betType === betType.NO &&
          odds < betData?.betPlacedData?.odds) ||
        (betData?.betPlacedData?.betType === betType.YES &&
          odds >= betData?.betPlacedData?.odds)
      ) {
        return partnership
          ? -parseFloat(
              (parseFloat(betData?.winAmount) * partnership) / 100
            ).toFixed(2)
          : parseFloat(parseFloat(betData?.winAmount).toFixed(2));
      } else if (
        (betData?.betPlacedData?.betType === betType.NO &&
          odds >= betData?.betPlacedData?.odds) ||
        (betData?.betPlacedData?.betType === betType.YES &&
          odds < betData?.betPlacedData?.odds)
      ) {
        return partnership
          ? parseFloat(
              (parseFloat(betData?.loseAmount) * partnership) / 100
            ).toFixed(2)
          : -parseFloat(betData.loseAmount);
      }
      return 0;
    };
  
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
          let profitLoss = calculateProfitLoss(betData, lowerLimit + index,partnership);
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
        let profitLossVal=calculateProfitLoss(betData, item?.odds,partnership);
        profitLossVal=(parseFloat(item?.profitLoss) + parseFloat(profitLossVal)).toFixed(2)
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
    };
  };