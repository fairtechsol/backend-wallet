const { AppDataSource } = require("../config/postGresConnection");
const resultFailedSchema = require("../models/resultFailed.entity");
const resultFailed = AppDataSource.getRepository(resultFailedSchema);

exports.addResultFailed = async(body) =>{
    let insertUser = await resultFailed.save(body);
    return insertUser;
}