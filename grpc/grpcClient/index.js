const GrpcClient = require("./grpcClient");

const userProtoOptionsArray = [
  {
    path: `${__dirname}/proto/declareSession.proto`, //path to proto file
    package: "declareSessionProvider",//package in proto name
    service: "DeclareSessionProvider",//service name in proto file
  },
  {
    path: `${__dirname}/proto/declareMatch.proto`, //path to proto file
    package: "declareMatchProvider",//package in proto name
    service: "DeclareMatchProvider",//service name in proto file
  },
  {
    path: `${__dirname}/proto/bets.proto`, //path to proto file
    package: "betsProvider",//package in proto name
    service: "BetsProvider",//service name in proto file
  },
  {
    path: `${__dirname}/proto/match.proto`, //path to proto file
    package: "matchProvider",//package in proto name
    service: "MatchProvider",//service name in proto file
  },
  {
    path: `${__dirname}/proto/user.proto`, //path to proto file
    package: "userProvider",//package in proto name
    service: "UserService",//service name in proto file
  }
];

const expertServerAddress = "localhost:60600";

const grpcReq = {
  user: (address) => new GrpcClient(userProtoOptionsArray, address),
  expert: new GrpcClient(userProtoOptionsArray, expertServerAddress),
};

module.exports = grpcReq;