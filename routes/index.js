const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const transactionsRoutes = require('./transactionRoutes');
const userBalanceRoutes = require('./userBalanceRoutes');
const superAdminRoutes = require("../routes/superAdminRoutes");
const walletRoutes = require("../routes/walletRoutes");
const expertRoutes = require("./expertRoutes");
const matchRoutes = require("./matchRoutes");
const betRoutes = require("./betRoutes.js");

// Define routes
router.use('/auth', authRoutes
// #swagger.tags = ['auth']
);
router.use('/user', userRoutes
// #swagger.tags = ['user']
);
router.use('/transaction', transactionsRoutes
// #swagger.tags = ['transaction']
);
router.use('/balance', userBalanceRoutes
// #swagger.tags = ['balance']
);
router.use("/superadmin", superAdminRoutes
// #swagger.tags = ['superadmin']
);
router.use("/wallet", walletRoutes
// #swagger.tags = ['wallet']
);
router.use("/expert", expertRoutes
// #swagger.tags = ['expert']
);
router.use("/match", matchRoutes
// #swagger.tags = ['match']
);
router.use("/bet", betRoutes
// #swagger.tags = ['bet']
);

module.exports = router;