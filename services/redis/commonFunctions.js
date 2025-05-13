const internalRedis = require("../../config/internalRedisConnection");
const externalRedis = require("../../config/externalRedisConnection");
const { redisKeys, matchBettingType } = require("../../config/contants");

exports.getUserRedisData = async (userId) => {

  // Retrieve all user data for the match from Redis
  const userData = await internalRedis.hgetall(userId);

  // Return the user data as an object or null if no data is found
  return Object.keys(userData)?.length == 0 ? null : userData;
}

exports.updateUserDataRedis = async (userId, value) => {
  await internalRedis.hmset(userId, value);
};

exports.hasUserInCache = async (userId) => {
  return await internalRedis.exists(userId);
}


exports.deleteKeyFromUserRedis = async (userId, ...key) => {
  return await internalRedis.hdel(userId, key);
}

exports.getUserRedisKeys = async (userId, keys) => {
  // Retrieve all user data for the match from Redis
  const userData = await internalRedis.hmget(userId, keys);

  // Return the user data as an object or null if no data is found
  return userData;
}

exports.getUserRedisKey = async (userId, key) => {
  // Retrieve all user data for the match from Redis
  const userData = await internalRedis.hget(userId, key);

  // Return the user data as an object or null if no data is found
  return userData;
}
// Assuming internalRedis is the Redis client instance
exports.incrementValuesRedis = async (userId, value, updateValues) => {
  // Start pipelining
  const pipeline = internalRedis.pipeline();
  // Queue up HINCRBY commands for each field in 'value' object
  Object.entries(value).forEach(([field, increment]) => {
    pipeline.hincrbyfloat(userId, field, increment);
  });
  // If there are additional values to update, queue an HMSET command
  if (updateValues) {
    pipeline.hmset(userId, updateValues);
  }
  // Execute the pipeline
  await pipeline.exec();
};

exports.getCasinoDomainBets=async (mid)=>{
  return await externalRedis.hgetall(`${mid}${redisKeys.card}`);
}

exports.delCardBetPlaceRedis = async (key) => {
  await externalRedis.del(key);
}

exports.deleteHashKeysByPattern = async (key,pattern) => {
  let cursor = '0';
  do {
    const result = await internalRedis.hscan(key, cursor, 'MATCH', pattern);
    cursor = result[0];
    const keys = result[1];
    for (const keyData of keys) {
      await internalRedis.hdel(key, keyData);
    }
  } while (cursor !== '0');
}

exports.getHashKeysByPattern = async (key, pattern) => {
  let cursor = '0';
  let resultObj={};
  do {
    const result = await internalRedis.hscan(key, cursor, 'MATCH', pattern);
    cursor = result[0];
    const keys = result[1];
    for (let i = 0; i < keys?.length - 1; i += 2) {
      resultObj[keys[i]] = keys[i + 1];
    }
  } while (cursor !== '0');
  return resultObj;
}


exports.getMatchFromCache = async (matchId) => {
  let matchKey = `${matchId}_match`;
  let matchData = await externalRedis.hgetall(matchKey);
  if (Object.keys(matchData)?.length) {
    if (matchData?.sessionMaxBets) {
      matchData.sessionMaxBets = JSON.parse(matchData.sessionMaxBets)
    }

    Object.values(matchBettingType)?.forEach((item) => {
      if (matchData?.[item]) {
        matchData[item] = JSON.parse(matchData[item]);
      }
    });

    return matchData;
  }
  return null;
}

exports.getAllSessionRedis = async (matchId) => {
  // Retrieve all session data for the match from Redis
  const sessionData = await externalRedis.hgetall(`${matchId}_session`);

  // Return the session data as an object or null if no data is found
  return Object.keys(sessionData)?.length == 0 ? null : sessionData;
};

exports.getUserRedisMultiKeyData = async (userIds, keys) => {
  // Validate input to avoid unnecessary processing
  if (!Array.isArray(userIds) || !Array.isArray(keys) || userIds.length === 0 || keys.length === 0) {
    return {};
  }

  try {
    const pipeline = internalRedis.pipeline();

    // Use more efficient array iteration
    for (const userId of userIds) {
      pipeline.hmget(userId, ...keys);
    }

    const results = await pipeline.exec();

    // Process results to extract values and handle potential individual command errors
    return results.reduce((prev, [error, data], index) => {
      if (!error&&data?.filter((item) => item !== null).length) {
        prev[userIds[index]] = {};
        for (let i = 0; i < data.length; i++) {
          prev[userIds[index]][keys[i]] = data[i];
        }
      }
      return prev;
    }, {});
  } catch (error) {
    throw error;
  }
};