const { Not, IsNull } = require("typeorm");
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

exports.commissionReport = async (userId, query) => {
  const baseQuery = Commission.createQueryBuilder("commission")
    .where({ parentId: userId, matchId: Not(IsNull()) })
    .groupBy('"matchId"')
    .addGroupBy('"matchName"')
    .addGroupBy('"matchStartDate"')
    .select([
      'commission.matchName as "matchName"',
      'commission.matchId as "matchId"',
      'commission.matchStartDate as "matchStartDate"',
      'ROUND((SUM(commission.commissionAmount * commission.partnerShip) / 100)::numeric, 2) as amount'
    ])
    .orderBy('commission.matchStartDate', 'DESC');

  // Clone base query to get count before applying pagination
  const countQuery = Commission.createQueryBuilder("commission")
    .where({ parentId: userId, matchId: Not(IsNull()) })
    .select([
      'commission.matchId as "matchId"',
    ])
    .groupBy('"matchId"')
    .addGroupBy('"matchName"')
    .addGroupBy('"matchStartDate"');

  const totalRecords = (await countQuery.getRawMany())?.length || 0;

  // Apply pagination
  if (query.page) {
    baseQuery
      .skip((parseInt(query.page) - 1) * parseInt(query.limit || 10))
      .take(parseInt(query.limit || 10));
  }

  const results = await baseQuery.getRawMany();

  return {
    rows: results,
    count: totalRecords,
  };
};


exports.commissionMatchReport = (userId, matchId) => {
  const commissionMatches = Commission.createQueryBuilder().where({ parentId: userId, matchId: matchId }).select(['commission.userName as "userName"', 'commission.matchType as "matchType"', 'commission.teamName as "name"', 'commission.betPlaceDate as "date"', 'commission.teamName as "teamName"', 'commission.odds as "odds"', 'commission.betType as "betType"', 'commission.stake as "stake"', 'commission.commissionAmount as "commissionAmount"', 'commission.commissionType as "commissionType"', 'commission.partnerShip as "partnerShip"', 'commission.matchName as "matchName"', 'commission.settled as "settled"']);

  return commissionMatches.getRawMany();
}

exports.settleCommission = async (userId) => {
  await Commission.update({ parentId: userId, settled: false }, {
    settled: true
  });
}