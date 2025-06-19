const { Server } = require("./grpcServer");
const { getPlacedBets, getWalletLoginBetsData, getResultBetProfitLoss, getUserWiseSessionBetProfitLossExpert } = require("./handlers/betsHandler");
const { declareTournamentMatchResult, unDeclareTournamentMatchResult, declareFinalMatchResult, unDeclareFinalMatchResult } = require("./handlers/declareMatchHandler");
const { declareSessionResult, declareSessionNoResult, unDeclareSessionResult } = require("./handlers/declareSessionHandler");
const { addMatch, raceAdd, getCardResult, getCardResultDetail, declareVirtualCasinoResult, updateMatch } = require("./handlers/matchHandler");
const { updateUserBalanceBySA, lockUnlockUserByUserPanel, getPartnershipId } = require("./handlers/userHandler");

const { GRPC_PORT = 50500 } = process.env;

const protoOptionsArray = [
    {
        path: `${__dirname}/proto/declareSession.proto`, //path to proto file
        package: "grpc.declareSessionProvider",//package in proto name
        service: "DeclareSessionProvider",//service name in proto file
    },
    {
        path: `${__dirname}/proto/declareMatch.proto`, //path to proto file
        package: "grpc.declareMatchProvider",//package in proto name
        service: "DeclareMatchProvider",//service name in proto file
    },
    {
        path: `${__dirname}/proto/bets.proto`, //path to proto file
        package: "grpc.betsProvider",//package in proto name
        service: "BetsProvider",//service name in proto file
    },
    {
        path: `${__dirname}/proto/match.proto`, //path to proto file
        package: "grpc.matchProvider",//package in proto name
        service: "MatchProvider",//service name in proto file
    },
    {
        path: `${__dirname}/proto/user.proto`, //path to proto file
        package: "grpc.userProvider",//package in proto name
        service: "UserService",//service name in proto file
    }
];

const server = new Server(`${GRPC_PORT}`, protoOptionsArray);

// gRPC methods implementation
server
    .addService("DeclareSessionProvider", "DeclareSession", declareSessionResult)
    .addService("DeclareSessionProvider", "DeclareSessionNoResult", declareSessionNoResult)
    .addService("DeclareSessionProvider", "UnDeclareSession", unDeclareSessionResult)

    .addService("DeclareMatchProvider", "DeclareTournament", declareTournamentMatchResult)
    .addService("DeclareMatchProvider", "UnDeclareTournament", unDeclareTournamentMatchResult)

    .addService("DeclareMatchProvider", "DeclareFinalMatch", declareFinalMatchResult)
    .addService("DeclareMatchProvider", "UnDeclareFinalMatch", unDeclareFinalMatchResult)

    .addService("BetsProvider", "GetBets", getPlacedBets)
    .addService("BetsProvider", "GetBetsLoginData", getWalletLoginBetsData)
    .addService("BetsProvider", "GetSessionProfitLossUserWise", getUserWiseSessionBetProfitLossExpert)
    .addService("BetsProvider", "GetSessionProfitLossBet", getResultBetProfitLoss)

    .addService("MatchProvider", "AddMatch", addMatch)
    .addService("MatchProvider", "UpdateMatch", updateMatch)
    .addService("MatchProvider", "AddRaceMatch", raceAdd)
    .addService("MatchProvider", "GetCardResult", getCardResult)
    .addService("MatchProvider", "GetCardResultDetail", getCardResultDetail)
    .addService("MatchProvider", "DeclareVirtualCasinoResult", declareVirtualCasinoResult)

    .addService("UserService", "UpdateBalanceAPICall", updateUserBalanceBySA)
    .addService("UserService", "GetPartnershipId", getPartnershipId)
    .addService("UserService", "LockUnlockUserByUserPanel", lockUnlockUserByUserPanel)


module.exports = server;