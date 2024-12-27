import { verifyToken } from "./../services/auth_service.js";
import db from "../config/db.js";

export const authenticationMiddleware = async (req, res, next) => {
    try {
        const token = req.headers['x-access-token'];
        if (!token) {
            return res.send({
                status: 0,
                message: "No token provided.",
            });
        } else {
            const decoded = await verifyToken(token);
            const getModel = await db.user.findOne({ _id: decoded.id, token: token });
            if (getModel != null) {
                if (getModel.blocked_at > 0) {
                    return res.send({
                        status: 0,
                        message: "Your account is blocked.",
                    });
                } else if (getModel.deleted_at > 0) {
                    return res.send({
                        status: 0,
                        message: "Your account is deleted.",
                    });
                } else {
                    req.user = getModel;
                    next();
                }
            } else {
                return res.send({
                    status: 0,
                    message: "Account does not exist.",
                });
            }
        }
    } catch (error) {
        logMessage(error, req);
        return res.send({
            status: 0,
            message: "Your session has expired. Please sign in again.",
        });
    }
}
