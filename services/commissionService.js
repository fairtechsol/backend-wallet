const { AppDataSource } = require("../config/postGresConnection");
const commissionSchema = require("../models/commission.entity");
const Commission = AppDataSource.getRepository(commissionSchema);

exports.insertCommissions =async (data) => {
  await Commission.insert(data);
};

exports.getCombinedCommission = (betId)=>{
  return Commission.createQueryBuilder().where({betId:betId}).groupBy('"parentId"').addGroupBy(`"partnerShip"`).select(['Sum(commission.commissionAmount) * commission.partnerShip / 100 as amount','commission.parentId as "userId"']).getRawMany();
}

exports.deleteCommission = (betId)=>{
  Commission.delete({betId:betId});
}