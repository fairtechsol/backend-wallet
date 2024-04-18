module.exports.expertDomain = process.env.EXPERT_DOMAIN_URL || 'http://localhost:6060';
module.exports.oldBetFairDomain = process.env.OLD_BETFAIR_DOMAIN_URL || 'http://localhost:5001';
module.exports.noResult="No Result";
module.exports.unDeclare="UNDECLARE";

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
  win : "win",
  loss : "loss",
  creditRefer : "creditReference"
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
  [this.userRoleConstant.fairGameAdmin]: ["fw"],
  [this.userRoleConstant.superAdmin]: ["fw", "fa"],
  [this.userRoleConstant.admin]: ["fw", "fa", "sa"],
  [this.userRoleConstant.superMaster]: ["fw","fa","sa","a"],
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
  wallet:[
    this.userRoleConstant.fairGameAdmin,
    this.userRoleConstant.fairGameWallet,
  ]
};

module.exports.walletDescription = {
    userCreate : "CREDIT REFRENCE as user create",
}

module.exports.passwordRegex = /^(?=.*[A-Z])(?=.*[a-zA-Z].*[a-zA-Z].*[a-zA-Z].*[a-zA-Z])(?=.*\d.*\d.*\d.*\d).{8,}$/;

module.exports.socketData ={
  userBalanceUpdateEvent : "userBalanceUpdate",
  logoutUserForceEvent : "logoutUserForce",
  SessionBetPlaced:"userSessionBetPlaced",
  MatchBetPlaced:"userMatchBetPlaced",
  socketSessionEvent: "socketSessionEvent",
  sessionResult:"sessionResult",
  sessionNoResult:"sessionNoResult",
  sessionResultUnDeclare:"sessionResultUnDeclare",
  matchResult:"matchResult",
  matchResultUnDeclare:"matchResultUnDeclare",
  sessionDeleteBet: "sessionDeleteBet",
  matchDeleteBet: "matchDeleteBet"
};


module.exports.betType = {
  YES : "YES",
  NO : "NO",
  BACK : "BACK",
  LAY : "LAY"
}

module.exports.redisKeys = {
  userAllExposure : "exposure",
  userMatchExposure : "matchExposure_",
  userSessionExposure : "sessionExposure_",
  userTeamARate : "teamARate_",
  userTeamBRate : "teamBRate_",
  userTeamCRate : "teamCRate_",
  yesRateTie: "yesRateTie_",
  noRateTie: "noRateTie_",
  yesRateComplete: "yesRateComplete_",
  noRateComplete: "noRateComplete_",
  userExposureLimit : "exposureLimit",
  profitLoss:"_profitLoss"

}

module.exports.betResultStatus = {
  UNDECLARE : "UNDECLARE",
  PENDING : "PENDING",
  WIN : "WIN",
  LOSS : "LOSS",
  TIE : "TIE"
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
};

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