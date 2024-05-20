module.exports.expertDomain = process.env.EXPERT_DOMAIN_URL || 'http://localhost:6060';
module.exports.oldBetFairDomain = process.env.OLD_BETFAIR_DOMAIN_URL || 'http://localhost:5001';

module.exports.noResult="No Result";
module.exports.unDeclare="UNDECLARE";
module.exports.jwtSecret = process.env.JWT_SECRET || "secret";


module.exports.userRoleConstant = {
  fairGameWallet: "fairGameWallet",
  fairGameAdmin: "fairGameAdmin",
  superAdmin: "superAdmin",
  admin: "admin",
  superMaster: "superMaster",
  master: "master",
  agent: "agent",
  expert: "expert",
  user: "user",
};


module.exports.gameType = {
  cricket: "cricket",
  football: "football",
  tennis:"tennis",
  horseRacing: "horseRacing"
};

module.exports.acceptUserRole = [this.userRoleConstant.fairGameAdmin,this.userRoleConstant.superAdmin]
module.exports.blockType={
    userBlock:"userBlock",
    betBlock:"betBlock"
}

module.exports.fileType = {
  pdf: "pdf",
  excel: "excel",
};

module.exports.redisTimeOut = 10 * 60 * 60;

module.exports.matchComissionTypeConstant = {
  totalLoss: "totalLoss",
  entryWise: "entryWise",
  settled: "settled"
};

module.exports.baseColumnsSchemaPart = {
  id: {
    type: "uuid",
    primary: true,
    generated: "uuid",
  },
  createBy: {
    type: "uuid",
    nullable: true,
  },
  createdAt: {
    type: "timestamp with time zone",
    createDate: true,
  },
  updatedAt: {
    type: "timestamp with time zone",
    updateDate: true,
  },
  deletedAt: {
    type: "timestamp with time zone",
    deleteDate: true,
  },
};

module.exports.transType = {
  add: "add",
  withDraw: "withDraw",
  win: "win",
  loss: "loss",
  creditRefer: "creditReference"
};

module.exports.partnershipPrefixByRole = {
  [this.userRoleConstant.agent]: "ag",
  [this.userRoleConstant.master]: "m",
  [this.userRoleConstant.superMaster]: "sm",
  [this.userRoleConstant.admin]: "a",
  [this.userRoleConstant.superAdmin]: "sa",
  [this.userRoleConstant.fairGameAdmin]: "fa",
  [this.userRoleConstant.fairGameWallet]: "fw",
};

module.exports.uplinePartnerShipForAllUsers = {
  [this.userRoleConstant.fairGameWallet]: [],
  [this.userRoleConstant.fairGameAdmin]: ["fw"],
  [this.userRoleConstant.superAdmin]: ["fw", "fa"],
  [this.userRoleConstant.admin]: ["fw", "fa", "sa"],
  [this.userRoleConstant.superMaster]: ["fw", "fa", "sa", "a"],
  [this.userRoleConstant.master]: ["fw", "fa", "sa", "a", "sm"],
  [this.userRoleConstant.agent]: ["fw", "fa", "sa", "a", "sm", "m"],
};

module.exports.differLoginTypeByRoles = {
  admin: [
    this.userRoleConstant.admin,
    this.userRoleConstant.superAdmin,
    this.userRoleConstant.master,
    this.userRoleConstant.superMaster,
    this.userRoleConstant.agent,
  ],
  wallet: [
    this.userRoleConstant.fairGameAdmin,
    this.userRoleConstant.fairGameWallet,
  ]
};

module.exports.walletDescription = {
  userCreate: "CREDIT REFRENCE as user create",
}

module.exports.passwordRegex = /^(?=.*[A-Z])(?=.*[a-zA-Z].*[a-zA-Z].*[a-zA-Z].*[a-zA-Z])(?=.*\d.*\d.*\d.*\d).{8,}$/;

module.exports.socketData = {
  userBalanceUpdateEvent: "userBalanceUpdate",
  logoutUserForceEvent: "logoutUserForce",
  SessionBetPlaced: "userSessionBetPlaced",
  MatchBetPlaced: "userMatchBetPlaced",
  socketSessionEvent: "socketSessionEvent",
  sessionResult: "sessionResult",
  sessionNoResult: "sessionNoResult",
  sessionResultUnDeclare: "sessionResultUnDeclare",
  matchResult: "matchResult",
  matchResultUnDeclare: "matchResultUnDeclare",
  sessionDeleteBet: "sessionDeleteBet",
  matchDeleteBet: "matchDeleteBet"
};


module.exports.betType = {
  YES: "YES",
  NO: "NO",
  BACK: "BACK",
  LAY: "LAY"
}

module.exports.redisKeys = {
  userAllExposure: "exposure",
  userMatchExposure: "matchExposure_",
  userSessionExposure: "sessionExposure_",
  userTeamARate: "teamARate_",
  userTeamBRate: "teamBRate_",
  userTeamCRate: "teamCRate_",
  yesRateTie: "yesRateTie_",
  noRateTie: "noRateTie_",
  yesRateComplete: "yesRateComplete_",
  noRateComplete: "noRateComplete_",

  userExposureLimit : "exposureLimit",
  profitLoss:"_profitLoss",
  
  ...(Array.from({ length: 20 }, (_, index) => index).reduce((prev, curr) => {
    prev[`yesRateUnderOver${curr}.5`] = `yesRateUnderOver${curr}.5_`;
    prev[`noRateUnderOver${curr}.5`] = `noRateUnderOver${curr}.5_`;
    return prev;
  }, {})),
  ...(Array.from({ length: 20 }, (_, index) => index).reduce((prev, curr) => {
    prev[`yesRateFirstHalfGoal${curr}.5`] = `yesRateFirstHalfGoal${curr}.5_`;
    prev[`noRateFirstHalfGoal${curr}.5`] = `noRateFirstHalfGoal${curr}.5_`;
    return prev;
  }, {})),

  userTeamARateHalfTime: "userTeamARateHalfTime_",
  userTeamBRateHalfTime: "userTeamBRateHalfTime_",
  userTeamCRateHalfTime: "userTeamCRateHalfTime_",

  ...(Array.from({ length: 20 }, (_, index) => index).reduce((prev, curr) => {
    prev[`userTeamARateSetWinner${curr}`] = `userTeamARateSetWinner${curr}_`;
    prev[`userTeamBRateSetWinner${curr}`] = `userTeamBRateSetWinner${curr}_`;
    prev[`userTeamCRateSetWinner${curr}`] = `userTeamCRateSetWinner${curr}_`;
    return prev;
  }, {})),
}

module.exports.betResultStatus = {
  UNDECLARE: "UNDECLARE",
  PENDING: "PENDING",
  WIN: "WIN",
  LOSS: "LOSS",
  TIE: "TIE"
}

module.exports.matchBettingType = {
  matchOdd: "matchOdd",
  bookmaker: "bookmaker",
  quickbookmaker1: "quickbookmaker1",
  quickbookmaker2: "quickbookmaker2",
  quickbookmaker3: "quickbookmaker3",
  tiedMatch1: "tiedMatch1",
  tiedMatch2: "tiedMatch2",
  completeMatch: "completeMatch",
  completeManual: "completeManual",
  ...(Array.from({ length: 20 }, (_, index) => index).reduce((prev, curr) => {
    prev[`overUnder${curr}.5`] = `overUnder${curr}.5`
    return prev;
  }, {})),
  ...(Array.from({ length: 20 }, (_, index) => index).reduce((prev, curr) => {
    prev[`firstHalfGoal${curr}.5`] = `firstHalfGoal${curr}.5`
    return prev;
  }, {})),
  halfTime: "halfTime",
  ...(Array.from({ length: 20 }, (_, index) => index).reduce((prev, curr) => {
    prev[`setWinner${curr}`] = `setWinner${curr}`
    return prev;
  }, {}))
};

module.exports.redisKeysMatchWise = {
  [this.gameType.cricket]: [this.redisKeys.userTeamARate, this.redisKeys.userTeamBRate, this.redisKeys.userTeamCRate, this.redisKeys.noRateComplete, this.redisKeys.yesRateComplete, this.redisKeys.noRateTie, this.redisKeys.yesRateTie],
  [this.gameType.football]: [this.redisKeys.userTeamARate, this.redisKeys.userTeamBRate, this.redisKeys.userTeamCRate, this.redisKeys.userTeamARateHalfTime, this.redisKeys.userTeamBRateHalfTime, this.redisKeys.userTeamCRateHalfTime, ...Array.from({ length: 20 }, (_, index) => this.redisKeys[`yesRateUnderOver${index}.5`]),
  ...Array.from({ length: 20 }, (_, index) => this.redisKeys[`noRateUnderOver${index}.5`]),
  ...Array.from({ length: 20 }, (_, index) => this.redisKeys[`yesRateFirstHalfGoal${index}.5`]),
  ...Array.from({ length: 20 }, (_, index) => this.redisKeys[`noRateFirstHalfGoal${index}.5`])],
  [this.gameType.tennis]: [this.redisKeys.userTeamARate, this.redisKeys.userTeamBRate, this.redisKeys.userTeamCRate, ...Array.from({ length: 20 }, (_, index) => this.redisKeys[`userTeamARateSetWinner${index}`]),
  ...Array.from({ length: 20 }, (_, index) => this.redisKeys[`userTeamBRateSetWinner${index}`]), ...Array.from({ length: 20 }, (_, index) => this.redisKeys[`userTeamCRateSetWinner${index}`])],
}

exports.marketBetType = {
  SESSION: "SESSION",
  MATCHBETTING: "MATCHBETTING",
};

module.exports.resultType = {
  tie: "Tie",
  noResult: "No Result",
};

module.exports.tiedManualTeamName = {
  yes: "YES",
  no: "NO"
}

module.exports.matchWiseBlockType = {
  match: "match",
  session: "session",
};

module.exports.lockType = {
  user: "user",
  bet: "bet"
}

module.exports.matchBettingsTeamName = {
  over: "OVER",
  under: "UNDER",
  yes: "YES",
  no: "NO"
}


module.exports.profitLossKeys={
  [this.matchBettingType.matchOdd]: "matchPL",
  [this.matchBettingType.bookmaker]: "matchPL",
  [this.matchBettingType.quickbookmaker1]:  "matchPL",
  [this.matchBettingType.quickbookmaker2]:  "matchPL",
  [this.matchBettingType.quickbookmaker3]:  "matchPL",
  [this.matchBettingType.tiedMatch1]:  "tiePL",
  [this.matchBettingType.tiedMatch2]: "tiePL",
  [this.matchBettingType.completeMatch]: "completePL",
  [this.matchBettingType.completeManual]: "completePL",
  ...(Array.from({ length: 20 }, (_, index) => index).reduce((prev, curr) => {
    prev[`overUnder${curr}.5`] = `overUnderPL${curr}.5`
    return prev;
  }, {})),
  ...(Array.from({ length: 20 }, (_, index) => index).reduce((prev, curr) => {
    prev[`firstHalfGoal${curr}.5`] = `overUnderPL${curr}.5`
    return prev;
  }, {})),
  [this.matchBettingType.halfTime]:  "halfTimePL",
  ...(Array.from({ length: 20 }, (_, index) => index).reduce((prev, curr) => {
    prev[`setWinner${curr}`] = `setWinner${curr}PL`
    return prev;
  }, {}))

}

module.exports.matchesTeamName={
  
  [this.matchBettingType.tiedMatch1]: {
    a:this.matchBettingsTeamName.yes,
    b:this.matchBettingsTeamName.no
  },
  [this.matchBettingType.tiedMatch2]: {
    a:this.matchBettingsTeamName.yes,
    b:this.matchBettingsTeamName.no
  },
  [this.matchBettingType.completeMatch]: {
    a:this.matchBettingsTeamName.yes,
    b:this.matchBettingsTeamName.no
  },
  [this.matchBettingType.completeManual]: {
    a:this.matchBettingsTeamName.yes,
    b:this.matchBettingsTeamName.no
  },
  ...(Array.from({ length: 20 }, (_, index) => index).reduce((prev, curr) => {
    prev[`overUnder${curr}.5`] = {
      a:this.matchBettingsTeamName.under,
      b:this.matchBettingsTeamName.over
    }
    return prev;
  }, {})),
  ...(Array.from({ length: 20 }, (_, index) => index).reduce((prev, curr) => {
    prev[`firstHalfGoal${curr}.5`] = {
      a:this.matchBettingsTeamName.under,
      b:this.matchBettingsTeamName.over
    }
    return prev;
  }, {})),

}

module.exports.otherEventMatchBettingRedisKey = {
  [this.matchBettingType.matchOdd]: {
    "a":this.redisKeys.userTeamARate,
    "b":this.redisKeys.userTeamBRate,
    "c":this.redisKeys.userTeamCRate,
  },
  [this.matchBettingType.bookmaker]:{
    "a":this.redisKeys.userTeamARate,
    "b":this.redisKeys.userTeamBRate,
    "c":this.redisKeys.userTeamCRate,
  },
  [this.matchBettingType.quickbookmaker1]: {
    "a":this.redisKeys.userTeamARate,
    "b":this.redisKeys.userTeamBRate,
    "c":this.redisKeys.userTeamCRate,
  },
  [this.matchBettingType.quickbookmaker2]: {
    "a":this.redisKeys.userTeamARate,
    "b":this.redisKeys.userTeamBRate,
    "c":this.redisKeys.userTeamCRate,
  },
  [this.matchBettingType.quickbookmaker3]: {
    "a":this.redisKeys.userTeamARate,
    "b":this.redisKeys.userTeamBRate,
    "c":this.redisKeys.userTeamCRate,
  },
  [this.matchBettingType.tiedMatch1]: {
    "a":this.redisKeys.yesRateTie,
    "b":this.redisKeys.noRateTie
  },
  [this.matchBettingType.tiedMatch2]: {
    "a":this.redisKeys.yesRateTie,
    "b":this.redisKeys.noRateTie
  },
  [this.matchBettingType.completeMatch]: {
    "a":this.redisKeys.yesRateComplete,
    "b":this.redisKeys.noRateComplete
  },
  [this.matchBettingType.completeManual]: {
    "a":this.redisKeys.yesRateComplete,
    "b":this.redisKeys.noRateComplete
  },
  ...(Array.from({ length: 20 }, (_, index) => index).reduce((prev, curr) => {
    prev[`overUnder${curr}.5`] = {
      "a":this.redisKeys[`yesRateUnderOver${curr}.5`],
      "b":this.redisKeys[`noRateUnderOver${curr}.5`]
    }
    return prev;
  }, {})),
  ...(Array.from({ length: 20 }, (_, index) => index).reduce((prev, curr) => {
    prev[`firstHalfGoal${curr}.5`] = {
      "a":this.redisKeys[`yesRateFirstHalfGoal${curr}.5`],
      "b":this.redisKeys[`noRateFirstHalfGoal${curr}.5`]
    }
    return prev;
  }, {})),
  [this.matchBettingType.halfTime]: {
    "a":this.redisKeys.userTeamARateHalfTime,
    "b":this.redisKeys.userTeamBRateHalfTime,
    "c":this.redisKeys.userTeamCRateHalfTime,
  },
  ...(Array.from({ length: 20 }, (_, index) => index).reduce((prev, curr) => {
    prev[`setWinner${curr}`] = {
      "a": this.redisKeys[`userTeamARateSetWinner${curr}`],
      "b": this.redisKeys[`userTeamBRateSetWinner${curr}`],
      "c": this.redisKeys[`userTeamCRateSetWinner${curr}`]
    }
    return prev;
  }, {})),
};

module.exports.redisKeysMarketWise = {
  [this.matchBettingType.bookmaker]: [this.redisKeys.userTeamARate, this.redisKeys.userTeamBRate, this.redisKeys.userTeamCRate],
  [this.matchBettingType.quickbookmaker1]: [this.redisKeys.userTeamARate, this.redisKeys.userTeamBRate, this.redisKeys.userTeamCRate],
  [this.matchBettingType.quickbookmaker2]: [this.redisKeys.userTeamARate, this.redisKeys.userTeamBRate, this.redisKeys.userTeamCRate],
  [this.matchBettingType.quickbookmaker3]: [this.redisKeys.userTeamARate, this.redisKeys.userTeamBRate, this.redisKeys.userTeamCRate],
  [this.matchBettingType.matchOdd]: [this.redisKeys.userTeamARate, this.redisKeys.userTeamBRate, this.redisKeys.userTeamCRate],
  [this.matchBettingType.tiedMatch1]: [this.redisKeys.noRateTie, this.redisKeys.yesRateTie],
  [this.matchBettingType.tiedMatch2]: [this.redisKeys.noRateTie, this.redisKeys.yesRateTie],
  [this.matchBettingType.completeMatch]: [this.redisKeys.noRateComplete, this.redisKeys.yesRateComplete],
  [this.matchBettingType.completeManual]: [this.redisKeys.noRateComplete, this.redisKeys.yesRateComplete],
  ...(Array.from({ length: 20 }, (_, index) => index).reduce((prev, curr) => {
    prev[`overUnder${curr}.5`] = [this.redisKeys[`yesRateUnderOver${curr}.5`], this.redisKeys[`noRateUnderOver${curr}.5`]]
    return prev;
  }, {})),
  ...(Array.from({ length: 20 }, (_, index) => index).reduce((prev, curr) => {
    prev[`firstHalfGoal${curr}.5`] = [this.redisKeys[`yesRateFirstHalfGoal${curr}.5`], this.redisKeys[`noRateFirstHalfGoal${curr}.5`]]
    return prev;
  }, {})),
  [this.matchBettingType.halfTime]: [this.redisKeys.userTeamARateHalfTime, this.redisKeys.userTeamBRateHalfTime, this.redisKeys.userTeamCRateHalfTime],
  ...(Array.from({ length: 20 }, (_, index) => index).reduce((prev, curr) => {
    prev[`setWinner${curr}`] = [this.redisKeys[`userTeamARateSetWinner${curr}`], this.redisKeys[`userTeamBRateSetWinner${curr}`], this.redisKeys[`userTeamCRateSetWinner${curr}`]]
    return prev;
  }, {}))

}