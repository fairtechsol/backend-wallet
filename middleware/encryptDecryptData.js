const { decryptAESKeyWithRSA, decryptWithAES, encryptWithAES, encryptAESKeyWithRSA } = require("../utils/encryptDecrypt");
const crypto=require("crypto");

module.exports = (req, res, next) => {
    // Decrypt `req.query`
    if (req.query.encryptedData && req.query.encryptedKey) {
      const aesKey = decryptAESKeyWithRSA(req.query.encryptedKey);
      req.query = decryptWithAES(req.query.encryptedData, aesKey);
    }
  
    // Decrypt `req.body`
    if (req.body?.encryptedData && req.body?.encryptedKey) {
      const aesKey = decryptAESKeyWithRSA(req.body.encryptedKey);
      req.body = decryptWithAES(req.body.encryptedData, aesKey);
    }
    next();
  };