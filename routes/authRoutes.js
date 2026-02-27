const express = require('express');
const { login, forgotPassword, resetPassword, createSalesman, getAccounts, deleteAccount, updateAccount } = require('../controllers/authController');

const router = express.Router();

router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:resetToken', resetPassword);
router.post('/salesman', createSalesman);
router.get('/accounts', getAccounts);
router.delete('/accounts/:id', deleteAccount);
router.put('/accounts/:id', updateAccount);

module.exports = router;
//rrrrrrrrrrrrrrrrrrrrrr