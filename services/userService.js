const { AppDataSource } = require("../config/postGresConnection");
const bcrypt = require("bcryptjs");
const userSchema = require("../models/user.entity");
const userBalanceSchema = require("../models/userBalance.entity");
const user = AppDataSource.getRepository(userSchema);
const UserBalance = AppDataSource.getRepository(userBalanceSchema);
const { ILike, In } = require("typeorm");
const ApiFeature = require("../utils/apiFeatures");

// id is required and select is optional parameter is an type or array

exports.getUserById = async (id, select) => {
  return await user.findOne({
    where: { id },
    select: select,
  });
};

exports.getUser = async (where, select) => {
  return await user.findOne({
    where: where,
    select: select,
  });
};

exports.getUsersWithoutCount = async (where, select) => {
  return await user.find({
    where: where,
    select: select,
  });
};
exports.addUser = async (body) => {
  let insertUser = await user.save(body);
  return insertUser;
};

exports.updateUser = async (id, body) => {
  let updateUser = await user.update(id, body);
  return updateUser;
};

exports.deleteUser = async (id) => {
  let deleteUser = await user.delete({id});
  return deleteUser;
};


exports.getUserByUserName = async (userName, select) => {
  return await user.findOne({
    where: { userName: ILike(userName) },
    select: select,
  });
};
/**
 * Block or unblock a user or bet based on the specified parameters.
 *
 * @param {string} userId - The ID of the user to be blocked or unblocked.
 * @param {string} blockBy - The ID of the user performing the block or unblock action.
 * @param {boolean} block - A boolean indicating whether to block or unblock the user.
 * @returns {Promise<object>} - A Promise that resolves to the result of the database query.
 */
exports.userBlockUnblock = async (userId, blockBy, block) => {


  // Define a recursive SQL query to fetch user hierarchy for the given 'userId'
  const getUserChild = `WITH RECURSIVE RoleHierarchy AS (
            SELECT id, "roleName", "createBy", "isUrl"
            FROM public.users
            WHERE id = '${userId}'
            UNION
            SELECT ur.id, ur."roleName", ur."createBy", ur."isUrl"
            FROM public.users ur
            JOIN RoleHierarchy rh ON ur."createBy" = rh.id
            )`;

  // Construct the SQL query for blocking or unblocking users based on the 'block' parameter
  const userBlockUnBlockQuery = block
    ? `
${getUserChild}
  UPDATE users
  SET "userBlock" = true, "userBlockedBy" = '${blockBy}'
  WHERE id IN (SELECT id FROM RoleHierarchy) AND "userBlockedBy" IS NULL RETURNING id,"roleName";
`
    : `
${getUserChild}
    UPDATE users
    SET "userBlock" = false, "userBlockedBy" = NULL
    WHERE id IN (SELECT id FROM RoleHierarchy) AND "userBlockedBy" = '${blockBy}' RETURNING id,"roleName";
    `;

  // Execute the constructed query using the 'user.query' method
  let query = await user.query(userBlockUnBlockQuery);
  // Return the result of the query
  return query;
};

exports.betBlockUnblock = async (userId, blockBy, block) => {


  // Define a recursive SQL query to fetch user hierarchy for the given 'userId'
  const getUserChild = `WITH RECURSIVE RoleHierarchy AS (
            SELECT id, "roleName", "createBy", "isUrl"
            FROM public.users
            WHERE id = '${userId}'
            UNION
            SELECT ur.id, ur."roleName", ur."createBy", ur."isUrl"
            FROM public.users ur
            JOIN RoleHierarchy rh ON ur."createBy" = rh.id
            )`;

  // Construct the SQL query for blocking or unblocking users based on the 'block' parameter
  const userBlockUnBlockQuery = block
    ? `
${getUserChild}
  UPDATE users
  SET "betBlock" = true, "betBlockedBy" = '${blockBy}'
  WHERE id IN (SELECT id FROM RoleHierarchy) AND "betBlockedBy" IS NULL RETURNING id,"roleName";
`
    : `
${getUserChild}
    UPDATE users
    SET "betBlock" = false, "betBlockedBy" = NULL
    WHERE id IN (SELECT id FROM RoleHierarchy) AND "betBlockedBy" = '${blockBy}' RETURNING id,"roleName";
    `;

  // Execute the constructed query using the 'user.query' method
  let query = await user.query(userBlockUnBlockQuery);
  // Return the result of the query
  return query;
};





exports.getUsers = async (where, select, offset, limit, relations) => {
  //find list with filter and pagination
  
  return await user.findAndCount({
    where: where,
    select: select,
    skip: offset,
    take: limit,
    relations: relations
  });

};

exports.getUsersWithUserBalance = async (where, offset, limit) => {
  //get all users with user balance according to pagoination

  let Query = user.createQueryBuilder()
  .select()
  .where(where)
  .leftJoinAndMapOne("user.userBal","userBalances", "UB","user.id = UB.userId")
  .leftJoinAndMapOne("user.domainData","domainData","domainData","user.id = domainData.userId")

  if (offset) {
    Query = Query.offset(parseInt(offset));
  }
  if (limit) {
    Query = Query.limit(parseInt(limit));
  }

  var result = await Query.getManyAndCount();
  return result;

}

exports.getUsersWithUsersBalanceData = async (where, query) => {
  //get all users with user balance according to pagoination
  let transactionQuery = new ApiFeature(user.createQueryBuilder()
  .where(where)
  .leftJoinAndMapOne("user.userBal","userBalances", "UB","user.id = UB.userId")
  .leftJoinAndMapOne("user.domainData", "domainDatas", "domainData", "user.id = domainData.userId")
  ,query).search().filter().sort().paginate().getResult();

    return await transactionQuery;

}


exports.getUsersWithTotalUsersBalanceData = (where, query, select) => {
  //get all users with user balance according to pagoination
  let transactionQuery = new ApiFeature(user.createQueryBuilder()
    .where(where)
    .leftJoinAndMapOne("user.userBal", "userBalances", "UB", "user.id = UB.userId")
    .select(select)
    .addOrderBy('1'), query)
    .search()
    .filter();


  return transactionQuery.query.getRawOne();
}



exports.getChildUser = async (id) => {
  let query = `WITH RECURSIVE p AS (
    SELECT * FROM "users" WHERE "users"."id" = '${id}'
    UNION
    SELECT "lowerU".* FROM "users" AS "lowerU" JOIN p ON "lowerU"."createBy" = p."id"
  )
SELECT "id", "userName","roleName" FROM p where "deletedAt" IS NULL AND id != '${id}';`

  return await user.query(query)
}

exports.getParentUsers = async (id) => {
  let query = `WITH RECURSIVE p AS (
    SELECT * FROM "users" WHERE "users"."id" = '${id}'
    UNION
    SELECT "lowerU".* FROM "users" AS "lowerU" JOIN p ON "lowerU"."id" = p."createBy"
  )
SELECT "id" , "roleName" FROM p where "deletedAt" IS NULL AND id != '${id}';`;

  return await user.query(query);
};


exports.getFirstLevelChildUser = async (id) => {
  return await user.find({ where: { createBy: id }, select: { id: true, roleName: true, isUrl: true, userName: true } })

}

exports.getFirstLevelChildUserWithPartnership = async (id,partnership) => {
  return await user.find({ where: { createBy: id }, select: { id: true, roleName: true, isUrl: true, userName: true, [partnership]: true } })

}

exports.getUserBalanceDataByUserIds = async (userIds, select) => {
  return await UserBalance.find({
    where: { userId: In(userIds) },
    select: select
  })
}

exports.getUserDataWithUserBalance = async (where) => {
  return await user
  .createQueryBuilder()
  .where(where)
  .leftJoinAndMapOne(
    "user.userBal",
    "userBalances",
    "UB",
    "user.id = UB.userId"
  )
  .getOne();
}


exports.getUserWithUserBalance = async (userName) => {
  let userData = user
    .createQueryBuilder()
    .where({ userName: ILike(userName) })
    .leftJoinAndMapOne(
      "user.userBal",
      "userBalances",
      "UB",
      "user.id = UB.userId"
    )
    .getOne();

  return userData;
}