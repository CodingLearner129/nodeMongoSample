import config from "../config/config.js";
import db from "./../config/db.js";
import mongoose from "mongoose";

export const getUser = async (req, res) => {
    // const transaction = await mongoose.startSession();
    // transaction.startTransaction();
    try {
        // const result = await db.user.findOne({ _id: new mongoose.Types.ObjectId(req.body.id) });
        const result = await db.user.findOne({ _id: new mongoose.Types.ObjectId(req.params.id) }); // testing 24 char hex string C3707D6737FDBE565CF8F680
        res.send({
            status: 1,
            message: "User found successfully.",
            data: result || {}
        });
    } catch (error) {
        console.log(error);
        
        // await transaction.abortTransaction();
        res.send({
            status: 0,
            message: "Something went wrong. Please try again later."
        });
    // } finally {
    //     await transaction.endSession();
    }
}
