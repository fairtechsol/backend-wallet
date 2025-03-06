const socketIO = require("socket.io");
const { createAdapter } = require("@socket.io/redis-adapter");
const Redis = require("ioredis");
const { verifyToken, getUserTokenFromRedis } = require("../utils/authUtils");
require("dotenv").config();

let io;

/**
 * Handles a new socket connection.
 * @param {object} client - The socket client object representing the connection.
 */
const handleConnection = async (client) => {
  try {
    // Extract the token from the client's handshake headers or auth object
    const token = client.handshake.headers.authorization || client.handshake.auth.token;
    if (!token) {
      client.disconnect();
      return;
    }

    // Verify the token to get user information
    const decodedUser = verifyToken(token);
    if (!decodedUser) {
      client.disconnect();
      return;
    }

    // Extract user ID from the decoded user object
    const { id: userId } = decodedUser;

    // Retrieve the user's token from Redis
    const userTokenRedis = await getUserTokenFromRedis(userId);
    if (userTokenRedis !== token) {
      client.disconnect();
      return;
    }

    // Join the room with the user's ID
    client.join(userId);
  } catch (err) {
    console.error(err);
    client.disconnect();
  }
};

/**
 * Handles a disconnect socket connection.
 * @param {object} client - The socket client object representing the connection.
 */
const handleDisconnect = async (client) => {
  try {
    // Extract the token from the client's handshake headers or auth object
    const token = client.handshake.headers.authorization || client.handshake.auth.token;
    if (!token) return;

    // Verify the token to get user information
    const decodedUser = verifyToken(token);
    if (!decodedUser) return;

    // Extract user ID from the decoded user object
    const { id: userId } = decodedUser;

    // Leave the room with the user's ID
    client.leave(userId);
  } catch (err) {
    console.error(err);
    client.disconnect();
  }
};

/**
 * Initializes and manages socket connections.
 * @param {object} server - The HTTP server instance.
 */
exports.socketManager = (server) => {
  // Ensure server.app is initialized
  if (!server.app) server.app = {};
  server.app.socketConnections = {};

  // Create a Socket.IO instance attached to the server
  io = socketIO(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Create Redis clients using ioredis for the pub/sub mechanism
  const pubClient = new Redis({
    host: process.env.INTERNAL_REDIS_HOST || "localhost",
    port: process.env.INTERNAL_REDIS_PORT || 6379,
    password: process.env.INTERNAL_REDIS_PASSWORD,
  });
  const subClient = pubClient.duplicate();

  // Use the Redis adapter with the ioredis clients
  io.adapter(createAdapter(pubClient, subClient));

  // Event listener for a new socket connection
  io.on("connect", (client) => {
    handleConnection(client);

    // Event listener for socket disconnection
    client.on("disconnect", () => {
      handleDisconnect(client);
    });
  });
};

/**
 * Sends a message to a specific user or room.
 *
 * @param {string} roomId - The ID of the user or room to send the message to.
 * @param {string} event - The name of the event to emit.
 * @param {any} data - The data to send with the message.
 */
exports.sendMessageToUser = (roomId, event, data) => {
  io.to(roomId).emit(event, data);
};

/**
 * Broadcasts an event to all connected clients.
 *
 * @param {string} event - The event name to broadcast.
 * @param {any} data - The data to send with the broadcast.
 */
exports.broadcastEvent = (event, data) => {
  io.sockets.emit(event, data);
};
