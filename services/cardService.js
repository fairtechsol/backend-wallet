const { AppDataSource } = require("../config/postGresConnection");
const cardResultSchema = require("../models/cardResult.entity");
const ApiFeature = require("../utils/apiFeatures");
const CardResults = AppDataSource.getRepository(cardResultSchema);

exports.getCasinoCardResult = async (query) => {
  try {
    let casinoResultQuery = new ApiFeature(
      CardResults.createQueryBuilder(),
      query
    )
      .search()
      .filter()
      .sort()
      .paginate()
      .getResult();

    const [results, count] = await casinoResultQuery;

    return { results, count };
  } catch (error) {
    throw error;
  }
};
