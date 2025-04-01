const GrpcClient = require("./grpcClient");

const userProtoOptionsArray = [
    {
        path: `${__dirname}/proto/declareSession.proto`, //path to proto file
        package: "declareSessionProvider",//package in proto name
        service: "DeclareSessionProvider",//service name in proto file
    }
];


const grpcReq = {
  user: (address) => new GrpcClient(userProtoOptionsArray, address),
};

module.exports = grpcReq;