module.exports.expertDomain = process.env.EXPERT_DOMAIN_URL || '127.0.0.1:60600';
module.exports.oldBetFairDomain = process.env.OLD_BETFAIR_DOMAIN_URL || '127.0.0.1:50001';
module.exports.casinoMicroServiceDomain = process.env.CASINOMICROSERVICEURL || "http://localhost:3201";

module.exports.noResult="No Result";
module.exports.unDeclare="UNDECLARE";
module.exports.jwtSecret = process.env.JWT_SECRET || "secret";
module.exports.parmanentDeletePassType = "parDelPassType";
module.exports.maxAmount = 999999999;


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

module.exports.tieCompleteBetType = {
  tiedMatch1: "tiedMatch1",
  tiedMatch2: "tiedMatch2",
  tiedMatch3: "tiedMatch3",
  completeMatch: "completeMatch",
  completeMatch1: "completeMatch1",
  completeManual: "completeManual",
};


module.exports.gameType = {
  cricket: "cricket",
  football: "football",
  tennis:"tennis",
  horseRacing: "horseRacing",
  greyHound: "greyHound",
  politics: "politics",
};

module.exports.sessionBettingType = {
  session: "session",
  fancy1: "fancy1",
  overByOver: "overByover",
  ballByBall: "ballByBall",
  oddEven: "oddEven",
  cricketCasino: "cricketCasino",
  khado:"khado",
  meter:"meter"
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
  CardBetPlaced: "userCardBetPlaced",
  userBalanceUpdateEvent: "userBalanceUpdate",
  logoutUserForceEvent: "logoutUserForce",
  SessionBetPlaced: "userSessionBetPlaced",
  MatchBetPlaced: "userMatchBetPlaced",
  socketSessionEvent: "socketSessionEvent",
  sessionResult: "sessionResult",
  sessionNoResult: "sessionNoResult",
  sessionResultUnDeclare: "sessionResultUnDeclare",
  matchResult: "matchResult",
  cardResult: "cardResult",
  matchResultUnDeclare: "matchResultUnDeclare",
  sessionDeleteBet: "sessionDeleteBet",
  matchDeleteBet: "matchDeleteBet",
  updateDeleteReason: "updateDeleteReason"
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
  card: "_card",
  userExposureLimit : "exposureLimit",
  profitLoss:"_profitLoss",
}

module.exports.betResultStatus = {
  UNDECLARE: "UNDECLARE",
  PENDING: "PENDING",
  WIN: "WIN",
  LOSS: "LOSS",
  TIE: "TIE"
}

module.exports.matchBettingType = {
  tournament: "tournament" 
};

module.exports.racingBettingType = {
  matchOdd: "matchOdd",
};


exports.marketBetType = {
  SESSION: "SESSION",
  MATCHBETTING: "MATCHBETTING",
};

module.exports.resultType = {
  tie: "Tie",
  noResult: "No Result",
};


module.exports.matchWiseBlockType = {
  match: "match",
  session: "session",
};

module.exports.lockType = {
  user: "user",
  bet: "bet"
}

exports.cardGameType = {
  dt20: "dt20",
  teen20: "teen20",
  lucky7: "lucky7",
  card32: "card32",
  abj: "abj",
  dt202: "dt202",
  dtl20: "dtl20",
  dt6: "dt6",
  lucky7eu: "lucky7eu",
  teen: "teen",
  teen9:"teen9",
  teen8:"teen8",
  poker: "poker",
  poker20: "poker20",
  poker6:"poker6",
  baccarat:"baccarat",
  baccarat2:"baccarat2",
  card32eu: "card32eu",
  ab20:"ab20",
  "3cardj":"3cardj",
  war:"war",
  worli2:"worli2",
  superover:"superover",
  cmatch20:"cmatch20",
  aaa: "aaa",
  btable: "btable",
  race20:"race20",
  cricketv3:"cricketv3",
  cmeter: "cmeter",
  worli: "worli",
  queen: "queen",
  ballbyball: "ballbyball"
}

exports.cardGameShapeCode = {
  "CC": "club",
  "DD": "heart",
  "SS": "diamond",
  "HH": "spade"
}

exports.cardGameShapeColor = {
  "CC": "black",
  "DD": "red",
  "SS": "red",
  "HH": "black"
}

exports.cardsNo = {
  K: 13,
  Q: 12,
  J: 11,
  A: 1,
}

exports.cardGames = [
  {
    type: "dt20",
    name: "20-20 DRAGON TIGER",
    id: "d67dcc3f-dfa8-48c9-85cb-c258b0d7084a"
  }, {
    type: "teen20",
    name: "20-20 TEENPATTI",
    id: "27948657-084b-469e-887a-4e3dbd8532f6"
  },
  {
    type: "card32",
    name: "32 CARDS - A",
    id: "2aa3973a-91ef-4159-ad6d-b1cd99eea9a7"
  },
  {
    type: "lucky7",
    name: "LUCKY 7 - A",
    "id": "541da7e4-2c6b-429f-9c01-0952882b4cb3"
  },
  {
    type: "abj",
    name: "ANDAR BAHAR 2",
    id: "ab24f5bd-4b29-41c2-8a79-017dfaa89684"
  },
  {
    type: "dt202",
    name: "20-20 DRAGON TIGER 2",
    id: "0d6d8c3f-7b2a-4ec6-9d2c-b482c9e8425b"
  },
  {
    type: "dtl20",
    name: "20-20 D T L",
    id: "7c64e3b9-2439-4c68-8e34-7b6c8b75e5e4"
  },
  {
    type: "dt6",
    name: "1 DAY DRAGON TIGER",
    id: "9fa835c7-10ea-4d42-8963-3f5b5e99d962"
  },
  {
    type: "lucky7eu",
    name: "LUCKY 7 - B",
    id: "db0e8a6d-4b8e-4d71-9f3b-d90d1e5b1b37"
  },
  {
    type: "teen",
    name: "TEENPATTI 1-DAY",
    id: "79e1e7cb-8f38-4d5e-a9f2-674d8f4b1b0b"
  },
  {
    type: "teen9",
    name: "TEENPATTI TEST",
    id: "a3925a8b-2c85-40c6-a6f9-bd9b3d3f7b2a"
  },
  {
    type: "teen8",
    name: "TEENPATTI OPEN",
    id: "f8e627d4-4295-4d49-ae64-03d5f4eaa82b"
  },
  {
    type: "poker",
    name: "POKER 1-DAY",
    id: "4d9821ea-6474-4c6c-a9b0-36d7e05e4b79"
  },
  {
    type: "poker20",
    name: "20-20 POKER",
    id: "b7a3e6b2-f1b1-4b1d-a0e9-36d5c8f7e6d9"
  },
  {
    type: "poker6",
    name: "POKER 6 PLAYERS",
    id: "85319b1c-9838-49f3-8b0f-45c5d6b8d6f3"
  },
  {
    type: "baccarat",
    name: "BACCARAT",
    id: "7a9d7dce-7a6d-4d6b-9c7d-7d8d8d8d8d8d"
  },
  {
    type: "baccarat2",
    name: "BACCARAT 2",
    id: "1b4b8a5e-6f7a-4d4b-9d3e-7a1d3d8e6f1b"
  },
  {
    type: "card32eu",
    name: "32 CARDS - B",
    id: "c3b5e1e2-8d5e-4d5a-8a5d-7d5e7a1d8e5c"
  },
  {
    type: "ab20",
    name: "ANDAR BAHAR 1",
    id: "d1a4d7b8-8a7b-4a3b-8a7d-7d5e7a1d8e5d"
  },
  {
    type: "3cardj",
    name: "3 CARDS JUDGEMENT",
    id: "a3d8a7e4-6a3d-4d4b-9a7e-7a1d7d3e7a5d"
  },
  {
    type: "war",
    name: "CASINO WAR",
    id: "7a5d7d8e-7a5e-4a5e-9a7e-7a5e7d3e7a5d"
  },
  {
    type: "worli2",
    name: "INSTANT WORLI",
    id: "7a5e7d3e-7a5e-4a5e-9a7e-7a5e7d3e7a5d"
  },
  {
    type: "superover",
    name: "SUPER OVER",
    id: "7a5e7d3e-7a5e-4a5e-9a7e-7a5e7d3e7a5e"
  },
  {
    type: "cmatch20",
    name: "CRICKET MATCH 20-20",
    id: "7a5e7d3e-7a5e-4a5e-9a7e-7a5e7d3e7a5f"
  },
  {
    type: "aaa",
    name: "AMAR AKBAR ANTHONY",
    id: "7a5e7d3e-7a5e-4a5e-9a7e-7a5e7d3e7a60"
  },
  {
    type: "btable",
    name: "BOLLYWOOD CASINO",
    id: "7a5e7d3e-7a5e-4a5e-9a7e-7a5e7d3e7a61"
  },
  {
    type: "race20",
    name: "RACE 20",
    id: "7a5e7d3e-7a5e-4a5e-9a7e-7a5e7d3e7a62"
  },
  {
    type: "cricketv3",
    name: "FIVE FIVE CRICKET",
    id: "7a5e7d3e-7a5e-4a5e-9a7e-7a5e7d3e7a63"
  },
  {
    type: "cmeter",
    name: "Casino Meter",
    id: "7a5e7d3e-7a5e-4a5e-9a7e-9a5e7d3e7a63"
  },
  {
    type: "worli",
    name: "Worli Matka",
    id: "7a5e7d3e-7a5a-4a5e-9a7e-7a5e7d3e7a63"
  }, {
    type: "queen",
    name: "Queen",
    id: "7a5e7d3e-7a5a-4a5e-9a7e-7a5e7b3e7a63"
  }, {
    type: "ballbyball",
    name: "Ball By Ball",
    id: "7a5e7d3e-7a5e-4a5e-9a7e-7a5e7d3e8c63"
  }];