import express from 'express';
import { router as userRouter } from './user.js';

const router = express.Router();

router.use('/user', userRouter);

export { router };