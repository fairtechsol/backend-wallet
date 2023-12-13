const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes')
const buttonRoutes = require('./buttonRoutes')
const transactionsRoutes = require('./transactionRoutes')
const userBalanceRoutes = require('./userBalanceRoutes')
const superAdminRoutes = require("../routes/superAdminRoutes")
const walletRoutes = require("../routes/walletRoutes")
const expertRoutes = require("./expertRoutes")
// Define routes
router.use('/auth', authRoutes);
router.use('/user',userRoutes)
router.use('/button',buttonRoutes)
router.use('/transaction',transactionsRoutes)
router.use('/balance',userBalanceRoutes)
router.use("/superadmin",superAdminRoutes)
router.use("/wallet",walletRoutes)
router.use("/expert",expertRoutes)

module.exports = router;