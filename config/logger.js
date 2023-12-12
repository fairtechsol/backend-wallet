const path = require('path');
const winston = require('winston');
const pino = require('pino');
const pretty = require('pino-pretty');

let logger;


function formatDate(date){
    if(!date)
    date = new Date();
    var options = {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false // Use 24-hour format
      };
      return date.toLocaleString('en-US', options);
}
if (process.env.NODE_ENV === 'dev') {
  // Enable console logging in development environment
  logger = pino(pretty({
    colorize: true,
    translateTime: 'yyyy-mm-dd HH:MM:ss',
    // include : "name,dummyArray,dummyArray1"
  }));
} else {
  // Disable console logging in production environment
  logger = pino({
    level: 'silent',
    colorize: true,
    translateTime: 'yyyy-mm-dd HH:MM:ss',
  });
}

exports.logger = logger;

const colors = {
  info: 'green',
  warn: 'yellow',
  error: 'red',
};
const localTimestamp = winston.format((info) => {
  if (info instanceof Error) {
    // console.log(info)
    return {
      ...info,
      stack: info.stack,
      message: info.message,
    };
  }
  info.timestamp = formatDate();
  return info;
});

const logFormat = winston.format.printf(({
  level, message, label, timestamp,
}) => {
  const color = colors[level] || 'reset';
  return `${timestamp}] [${label}] ${level}\x1b[0m: ${message}`;
});

/**
 * levels available : debug, info, warn, error
 */
const loggerFileTransportOptions = {
  level: 'info',
  filename: path.normalize('./logs/app.log'),
  handleExceptions: true,
  maxsize: 5000000,
  maxFiles: 10,
};

const loggerOptions = {
  level: 'info',
  format: winston.format.combine(
    winston.format.label({ label: 'APP' }),
    localTimestamp(),
    logFormat,
  ),
  defaultMeta: { service: 'APP' },
  transports: [
    new winston.transports.File(loggerFileTransportOptions),
  ],
  exitOnError: false,
};

let LOGGER;
try {
  LOGGER = winston.createLogger(loggerOptions);
  // If we're not in production then log to the `console` with the format:
  `SON.stringify({ ...rest }) `
  if (process.env.NODE_ENV !== 'production') {
      LOGGER.add(new winston.transports.Console({
          format: winston.format.combine(
              winston.format.label({ label: 'APP' }),
              localTimestamp(),
              logFormat
          ),
      }));
  }
} catch (error) {
  console.error('Error Initializing Logger');
  console.error(error);
}

// export let LOG = LOGGER
module.exports.LOG = LOGGER;