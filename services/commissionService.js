const { AppDataSource } = require("../config/postGresConnection");
const commissionSchema = require("../models/commission.entity");
const Commission = AppDataSource.getRepository(commissionSchema);

exports.insertCommissions =async (data) => {
  await Commission.insert(data);
};