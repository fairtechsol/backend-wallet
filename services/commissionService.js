const { AppDataSource } = require("../config/postGresConnection");
const commissionSchema = require("../models/commission.entity");
const Commission = AppDataSource.getRepository(commissionSchema);

exports.insertCommissions = async (data) => {
  await Commission.insert(data);
};

exports.getCombinedCommission = (betId) => {
  return Commission.createQueryBuilder().where({ betId: betId }).groupBy('"parentId"').addGroupBy(`"partnerShip"`).select(['Sum(commission.commissionAmount) * commission.partnerShip / 100 as amount', 'commission.parentId as "userId"']).getRawMany();
}

exports.deleteCommission = (betId) => {
  Commission.delete({ betId: betId });
}

exports.commissionReport = (userId, query) => {
  const commissionMatches = Commission.createQueryBuilder().where({ parentId: userId , settled : false }).groupBy('"matchId"').addGroupBy(`"matchName"`).addGroupBy(`"matchStartDate"`).select(['commission.matchName as "matchName"', 'commission.matchId as "matchId"', 'commission.matchStartDate as "matchStartDate"','ROUND((Sum(commission.commissionAmount * commission.partnerShip)  / 100)::numeric, 2) as amount'])

  if (query.page) {
    commissionMatches.skip((parseInt(query.page) - 1) * parseInt(query.limit || 10)).take(parseInt(query?.limit || 10));
  }
  return commissionMatches.getRawMany();
}

exports.commissionMatchReport = (userId, matchId) => {
  const commissionMatches = Commission.createQueryBuilder().where({ parentId: userId, matchId: matchId }).select(['commission.userName as "userName"', 'commission.teamName as "name"', 'commission.betPlaceDate as "date"', 'commission.teamName as "teamName"', 'commission.odds as "odds"', 'commission.betType as "betType"', 'commission.stake as "stake"', 'commission.commissionAmount as "commissionAmount"','commission.commissionType as "commissionType"','commission.partnerShip as "partnerShip"','commission.matchName as "matchName"']);

  return commissionMatches.getRawMany();
}

exports.settleCommission = (userId) => {
  Commission.update({ parentId: userId },{
    settled:true
  });
}