const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const app = express();
const http = require("http");
const http2 = require("http2");
const { socketManager } = require("./sockets/socketManager.js");
const route = require("./routes/index.js");
const swaggerUi = require("swagger-ui-express");
const error = require("./utils/error.js");
const i18n = require("./config/i18n");
const setI18Language = require("./middleware/setI18Language.js");
const { logger } = require("./config/logger.js");
const helmet = require('helmet');
const { WalletMatchBetQueue } = require("./queue/consumer.js")

const allowSubdomainsAndLocalhost = (origin, callback) => {
  // Check if the request comes from the specified domain or localhost
  if (!origin || origin.includes("fairgame7.com") || origin.includes("maxbet07.com")) {
    callback(null, true); // Allow the request
  } else {
    callback(new Error("Not allowed by CORS")); // Deny the request
  }
};

if (process.env.NODE_ENV == 'production') {
  // Enable CORS with the custom origin function
  app.use(cors({ credentials: true, origin: allowSubdomainsAndLocalhost }));
} else {
  app.use(cors({ origin: "*" }));
}

app.enable('trust proxy');
app.use(helmet());
/**
 * Parse incoming JSON data
 */
app.use(express.json({ limit: '2mb' }));

/**
 * Parse URL-encoded data with extended support
 */
app.use(bodyParser.urlencoded({ extended: true }));

// configureing i18 for message control
app.use(i18n.init);
app.use(setI18Language);
app.use((req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const body = JSON.stringify(req.body);
  const query = JSON.stringify(req.query);
  const params = JSON.stringify(req.params);
  logger.debug(`Request [From:${ip}] ${req.path} ||  ${req.method} || query : ${query} || params : ${params} || body : ${body}`);
  next();
});
// Routes
app.use("/", route);
if (process.env.NODE_ENV != 'production') {
  const swaggerDocument = require("./swagger_output.json");
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}
app.use(error);


// Check environment to determine SSL setup
let server;

if (process.env.NODE_ENV == "production" || process.env.NODE_ENV == "dev") {
  // Production SSL configuration with Let's Encrypt certificates
  const sslOptions = {
    key: fs.readFileSync(`/etc/letsencrypt/live/${process.env.SSL_PATH}/privkey.pem`),
    cert: fs.readFileSync(`/etc/letsencrypt/live/${process.env.SSL_PATH}/fullchain.pem`),
    allowHTTP1: true, // Allows HTTP/1.1 fallback
  };

  // Create an HTTP/2 server with SSL options
  server = http2.createSecureServer(sslOptions, app);

  console.log("Running with HTTPS in production mode");
} else {
  // Create an HTTP server for local development
  server = http.createServer(app);

  console.log("Running with HTTP in development mode");
}

//Connect socket
socketManager(server);
// Start server
const PORT = process.env.PORT || 5050;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
