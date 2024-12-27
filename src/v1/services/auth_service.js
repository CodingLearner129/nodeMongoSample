import jwt from 'jsonwebtoken';
import { promisify } from "util";
import moment from 'moment';
import mongoose from 'mongoose';
import config from '../config/config.js';
import db from "./../config/db.js";

export const signToken = async (data, expiresIn) => {
    return jwt.sign(data, config.jwt_encryption, { expiresIn });
};

export const verifyToken = async (token) => {
    try {
        return await promisify(jwt.verify)(token, config.jwt_encryption);
    } catch (error) {
        throw error;
    }
};