const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');

// User profile routes
router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.post('/', userController.createUser);
router.post('/add-supplier', userController.addSupplierFromContact);
router.put('/:id', userController.updateUserProfile);
router.patch('/:id', userController.updateUserProfile);
router.patch('/:id/role', userController.updateUserRole);

// Auth endpoints under /api/users
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/google-auth', authController.googleAuth);
router.post('/truecaller/verify', authController.verifyTruecaller);

module.exports = router;
