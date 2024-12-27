
export const createOne = async (Model, data, req = {}) => {
    try {
        return await Model.create(data);
    } catch (error) {
        throw error;
    }
};

export const bulkCreate = async (Model, data, req = {}) => {
    try {
        return await Model.insertMany(data);
    } catch (error) {
        throw error;
    }
};

export const updateMany = async (Model, where, data, req = {}, transaction = {}) => {
    try {
        return await Model.updateMany(where, { $set: data });
    } catch (error) {
        throw error;
    }
};

export const updateManyArray = async (Model, where, data, req = {}, transaction = {}) => {
    try {
        return await Model.updateMany(where, { $push: data });
    } catch (error) {
        throw error;
    }
};

export const bulkWrite = async (Model, data, req = {}) => {
    try {
        return await Model.bulkWrite(data);
    } catch (error) {
        throw error;
    }
};

export const getOne = async (Model, where, req = {}) => {
    try {
        return await Model.findOne(where);
    } catch (error) {
        throw error;
    }
};

export const getOneById = async (Model, id, req = {}) => {
    try {
        return await Model.findById(id);
    } catch (error) {
        throw error;
    }
};

export const getOneAndUpdate = async (Model, where, data, req = {}) => {
    try {
        return await Model.findOneAndUpdate(where, data, { new: true });
    } catch (error) {
        throw error;
    }
};

export const getOneAndDelete = async (Model, where, req = {}) => {
    try {
        return await Model.findOneAndDelete(where);
    } catch (error) {
        throw error;
    }
};

export const updateOne = async (Model, where, data, req = {}) => {
    try {
        return await Model.updateOne(where, data);
    } catch (error) {
        throw error;
    }
};

export const updateOrInsert = async (Model, where, data, req = {}) => {
    try {
        return await Model.findOneAndUpdate(where, data, { upsert: true, setDefaultsOnInsert: true, new: true });
    } catch (error) {
        throw error;
    }
};

export const aggregate = async (Model, aggregateArray, req = {}) => {
    try {
        return await Model.aggregate(aggregateArray); //aggregateArray = [{$match: {}},{$lookup: {from:"", let: {}, pipeline: [$match: {$expr: {$and: [{}]}}], as: "" }}]
    } catch (error) {
        throw error;
    }
};

export const getAll = async (Model, where, req = {}) => {
    try {
        return await Model.find(where);
    } catch (error) {
        throw error;
    }
};
