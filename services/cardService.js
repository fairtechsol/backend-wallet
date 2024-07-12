const { AppDataSource } = require("../config/postGresConnection");
const cardResultSchema = require("../models/cardResult.entity");
const ApiFeature = require("../utils/apiFeatures");
const CardResults = AppDataSource.getRepository(cardResultSchema);

exports.getCasinoCardResult = async (query, where, select) => {
  try {
    let casinoResultQuery = new ApiFeature(
      CardResults.createQueryBuilder().where(where).select(select),
      query
    )
      .search()
      .filter()
      .sort()
      .paginate();

    const [results, count] = [await casinoResultQuery.query.getRawMany(), await casinoResultQuery.query.getCount()];

    return { results, count };
  } catch (error) {
    throw error;
  }
};


exports.getCardResultData =async (where, select) => {
    const casinoResult = await CardResults.createQueryBuilder()
      .where(where).select(select)
      .getOne();
    return casinoResult;

};