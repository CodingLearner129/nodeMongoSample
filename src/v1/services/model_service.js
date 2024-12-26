import { logMessage } from "../helpers/logger.js";

export const createOne = async (Model, data, req = {}) => {
    try {
        return await Model.create(data);
    } catch (error) {
        logMessage(error, req);
        throw error;
    }
};

export const bulkCreate = async (Model, data, req = {}) => {
    try {
        return await Model.insertMany(data);
    } catch (error) {
        logMessage(error, req);
        throw error;
    }
};

export const updateMany = async (Model, where, data, req = {}, transaction = {}) => {
    try {
        return await Model.updateMany(where, { $set: data });
    } catch (error) {
        logMessage(error, req);
        throw error;
    }
};

export const updateManyArray = async (Model, where, data, req = {}, transaction = {}) => {
    try {
        return await Model.updateMany(where, { $push: data });
    } catch (error) {
        logMessage(error, req);
        throw error;
    }
};

export const bulkWrite = async (Model, data, req = {}) => {
    try {
        return await Model.bulkWrite(data);
    } catch (error) {
        logMessage(error, req);
        throw error;
    }
};

export const getOne = async (Model, data, req = {}) => {
    try {
        return await Model.findOne(data);
    } catch (error) {
        logMessage(error, req);
        throw error;
    }
};

export const getOneById = async (Model, id, req = {}) => {
    try {
        return await Model.findById(id);
    } catch (error) {
        logMessage(error, req);
        throw error;
    }
};

export const getOneAndUpdate = async (Model, where, data, req = {}) => {
    try {
        return await Model.findOneAndUpdate(where, data, { new: true });
    } catch (error) {
        logMessage(error, req);
        throw error;
    }
};

export const getOneAndDelete = async (Model, where, req = {}) => {
    try {
        return await Model.findOneAndDelete(where);
    } catch (error) {
        logMessage(error, req);
        throw error;
    }
};

export const updateOne = async (Model, where, data, req = {}) => {
    try {
        return await Model.updateOne(where, data);
    } catch (error) {
        logMessage(error, req);
        throw error;
    }
};

export const updateOrInsert = async (Model, where, data, req = {}) => {
    try {
        return await Model.findOneAndUpdate(where, data, { upsert: true, setDefaultsOnInsert: true, new: true });
    } catch (error) {
        logMessage(error, req);
        throw error;
    }
};

export const aggregate = async (Model, aggregateArray, req = {}) => {
    try {
        return await Model.aggregate(aggregateArray);
    } catch (error) {
        logMessage(error, req);
        throw error;
    }
};

export const getAll = async (Model, where, req = {}) => {
    try {
        return await Model.find(where);
    } catch (error) {
        logMessage(error, req);
        throw error;
    }
};