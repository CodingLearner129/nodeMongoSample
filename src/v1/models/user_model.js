import mongoose from "mongoose";

// create schema 
const userSchema = new mongoose.Schema({
    first_name: {
        type: String,
        trim: true,
        default: ""
    },
    last_name: {
        type: String,
        trim: true,
        default: ""
    },
    gender: {
        type: Number,
        default: 0,
        comment: "0 = Male, 1 = Female, 2 = Non-binary, 3 = Prefer Not to say"
    },
    country_code: {
        type: String,
        default: "",
    },
    phone: {
        type: Number,
        default: 0,
    },
    dob: {
        type: Number,
        default: 0
    },
    profile: {
        type: String,
        default: ""
    },
    email: {
        type: String,
        // unique: true,
        lowercase: true,
        trim: true,
        default: "",
    },
    created_at: {
        type: Number,
        default: 0
    },
    updated_at: {
        type: Number,
        default: 0
    },
    deleted_at: {
        type: Number,
        default: 0
    },
    blocked_at: {
        type: Number,
        default: 0
    },
}, {
    timestamps: false
});

// userSchema.index({ country_code: 1, phone: 1 }, { unique: true }); // Define compound unique index
userSchema.index({ country_code: 1, phone: 1 });
userSchema.index({ email: 1 });

// create model
const user = mongoose.model("user", userSchema); //where "user" is model name which is used for relationship

export { user };