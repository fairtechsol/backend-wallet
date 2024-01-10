const { AppDataSource } = require("../config/postGresConnection");
const bcrypt = require("bcryptjs");
const domainDataSchema = require("../models/domainData.entity");
const { In } = require("typeorm");
const DomainData = AppDataSource.getRepository(domainDataSchema);

// id is required and select is optional parameter is an type or array

exports.getDomainDataById = async (id, select) => {
  return await DomainData.findOne({
    where: { id },
    select: select,
  });
};

exports.getDomainDataByDomain = async (domain, select) => {
  return await DomainData.findOne({
    where: { domain },
    select: select,
  });
};
exports.getDomainDataByUserId = async (userId, select) => {
  return await DomainData.findOne({
    where: { userId },
    select: select,
  });
}

exports.getDomainByUserId = async (userId) => {
  let domain= await DomainData.findOne({
    where: { userId },
    select: ["domain"],
  });
  if(!domain)
  return null;
  return domain.domain;
}
exports.getDomainDataByUserIds = async (userIds) => {
  let domains= await DomainData.find({
    where: { userId : In(userIds) },
    select: ["domain","id"],
  });
  return domains;
}

exports.getDomainData = async (where, select) => {
  return await DomainData.findOne({
    where,
    select: select,
  });
};

exports.addDomainData = async (body) => {
  let insertDomain = await DomainData.save(body);
  return insertDomain;
};

exports.updateDomain = async (id, body) => {
  let updateDomain = await DomainData.update(id, body);
  return updateDomain;
};


exports.getDomainDataByUserName = async (userName, select) => {
  return await DomainData.findOne({
    where: { userName: ILike(userName) },
    select: select,
  });
};

exports.getUserDomainWithFaId = async () => {
  let domainData =await DomainData
    .createQueryBuilder()
    .getMany();

  return domainData;
}