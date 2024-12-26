import express from 'express';
import * as userController from '../controllers/user_controller.js';
import * as userRequest from '../requests/user_request.js';

const router = express.Router();

// Initialize upload
// router.get('/user', [userRequest.getUserRequest], userController.getUser);
router.get('/:id', userController.getUser);

export { router }; 
