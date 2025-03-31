const GrpcClient = require("./grpcClient");

const userProtoOptionsArray = [
    {
        path: `${__dirname}/proto/declare.proto`, //path to proto file
        package: "declareProvider",//package in proto name
        service: "DeclareProvider",//service name in proto file
    }
];


const grpcReq = {
  user: (address) => new GrpcClient(userProtoOptionsArray, address),
};

module.exports = grpcReq;