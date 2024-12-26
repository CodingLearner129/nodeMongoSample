import db from "./../config/db.js";
import * as modelService from "./model_service.js";
import { GetBlockUsers, GetPosts, GetUserDTO, GetUserProfileDTO } from '../dto/user.js';
import { GetSubscriptionDTO } from '../dto/subscription.js';
import moment from 'moment';
import config from '../config/config.js';
import { response } from "../helpers/response.js";
import getMessage from "../helpers/getMessage.js";
import sendEmail from "../helpers/email.js";
import mongoose from "mongoose";
import { deleteFilesFromFilesDump } from "./common_service.js";
import { deleteFileS3Bucket } from "../helpers/aws_s3.js";
import {
    GetCommunityOtherUserProfileDTO,
    GetCommunityUserFollowersDTO,
    GetCommunityUserProfileDTO
} from "../dto/community.js";
import * as commonService from "./common_service.js";

export const profileCreate = async (req, model) => {
    const transaction = await mongoose.startSession();
    transaction.startTransaction();
    try {
        await deleteFilesFromFilesDump([new mongoose.Types.ObjectId(req.body.profile._id)], req);
        delete req.body.profile._id;
        let data = {
            profile_completed_at: moment().unix(),
            ...req.body
        };
        if (!data?.dietary) {
            delete data.dietary;
        }
        if (req.body.address !== '' && req.body.longitude !== 0 && req.body.latitude !== 0) {
            data.location = {
                type: 'Point',
                address: req.body.address,
                coordinates: [req.body.longitude, req.body.latitude],
            };
        }
        if (data.country_code) {
            delete data.country_code;
        }
        if (data.phone) {
            delete data.phone;
        }
        if (data.dob) {
            data.dob = Math.abs(data.dob);
        }
        const userCreate = await modelService.getOneAndUpdate(db[model[0]], { _id: req.user._id }, data, req);
        let regionExists;
        if (data.postcode && data.postcode !== "") {
            regionExists = await modelService.getOne(db[model[1]], { postcode: { $eq: data.postcode } }, req);
            if (!regionExists) {
                await modelService.createOne(db[model[1]], { postcode: data.postcode }, req);
            }
        }
        const createStripeCustomer = await commonService.createCustomer(userCreate);
        await modelService.getOneAndUpdate(db[model[0]], { _id: req.user._id }, { customer_id: createStripeCustomer.id }, req);
        if (data?.email) {
            await sendEmail('welcome', 'Welcome to BTND!', data);
        }
        await transaction.commitTransaction();
        return response(config.http_status_ok, {
            status: config.status_success,
            message: await getMessage('common.profile_create_success'),
        });
    } catch (error) {
        await transaction.abortTransaction();
        throw error;
    } finally {
        await transaction.endSession();
    }
}

export const profileUpdate = async (req, model) => {
    const transaction = await mongoose.startSession();
    transaction.startTransaction();
    try {
        let data;
        let regionExists;
        if (req.body.screen_type === 1) {
            data = {
                first_name: req.body.first_name,
                last_name: req.body.last_name,
                gender: req.body.gender
            }
            if (req.body.profile._id) {
                await deleteFileS3Bucket(req.body.deleted_profile.file_name, req);
                await deleteFilesFromFilesDump([new mongoose.Types.ObjectId(req.body.profile._id)], req);
                delete req.body.profile._id;
                data.profile = req.body.profile;
            }
        } else if (req.body.screen_type === 2) {
            data = {
                dob: Math.abs(req.body.dob)
            }
        } else if (req.body.screen_type === 3) {
            data = {
                bio: req.body.bio
            }
        } else if (req.body.screen_type === 4) {
            data = {
                height: req.body.height,
                height_type: req.body.height_type
            }
        } else if (req.body.screen_type === 5) {
            data = {
                weight: req.body.weight,
                weight_type: req.body.weight_type
            }
        } else if (req.body.screen_type === 6) {
            data = {
                dietary: req.body.dietary,
                dietary_description: req.body.dietary_description,
            }
            if (!data?.dietary) {
                data.dietary = null;
            }
        } else if (req.body.screen_type === 7) {
            data = {
                fitness_goals: req.body.fitness_goals
            }
        } else if (req.body.screen_type === 8) {
            data = {
                email: req.body.email,
                insta_link: req.body.insta_link,
                postcode: req.body.postcode,
            }
            if (req.body.address !== '' && req.body.longitude !== 0 && req.body.latitude !== 0) {
                data.location = {
                    type: 'Point',
                    address: req.body.address,
                    coordinates: [req.body.longitude, req.body.latitude],
                };
            }
            if (data.postcode && data.postcode !== "") {
                req.body.screen_type === 8 && data.postcode ? regionExists = await modelService.getOne(db[model[1]], { postcode: { $eq: data.postcode } }, req) : '';
                console.log(data.postcode)
                if (!regionExists && data.postcode !== "") {
                    await modelService.createOne(db[model[1]], { postcode: data.postcode }, req);
                }
            }
        }
        data = {
            ...data,
            updated_at: moment().unix(),
        }
        const userUpdate = await modelService.getOneAndUpdate(db[model[0]], { _id: req.user._id }, data, req);
        await commonService.updateCustomer(userUpdate);


        await transaction.commitTransaction();
        return response(config.http_status_ok, {
            status: config.status_success,
            message: await getMessage('common.profile_update_success'),
        });
    } catch (error) {
        await transaction.abortTransaction();
        throw error;
    } finally {
        await transaction.endSession();
    }
}

export const getProfile = async (req, model) => {
    try {
        let aggregationArray = [
            {
                $match: {
                    _id: req.user._id,
                },
            },
            {
                $addFields: {
                    fitnessGoalIds: {
                        $map: {
                            input: "$fitness_goals",
                            as: "goalId",
                            in: { $toObjectId: "$$goalId" }
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: "fitness_goals",
                    localField: "fitnessGoalIds", // Use the temporary field
                    foreignField: "_id",
                    as: "fitness_goals_details"
                }
            },
            {
                $lookup: {
                    from: "dietary_life_styles",
                    localField: "dietary",
                    foreignField: "_id",
                    as: "dietary_life_styles"
                }
            },
            {
                $unwind: {
                    path: "$dietary_life_styles",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 0,
                    first_name: 1,
                    last_name: 1,
                    gender: 1,
                    country_flag: 1,
                    country_code: 1,
                    phone: 1,
                    dob: 1,
                    profile: 1,
                    bio: 1,
                    height: 1,
                    height_type: 1,
                    weight: 1,
                    weight_type: 1,
                    dietary: 1,
                    dietary_description: 1,
                    email: 1,
                    location: 1,
                    postcode: 1,
                    google_social_id: 1,
                    apple_social_id: 1,
                    insta_link: 1,
                    is_plan_active: 1,
                    allow_notification: 1,
                    allow_dm: 1,
                    profile_completed_at: 1,
                    profile_verified_at: 1,
                    created_at: 1,
                    updated_at: 1,
                    fitness_goals: 1,
                    fitness_goals_details: {
                        $ifNull: ["$fitness_goals_details", []]
                    },
                    dietary_life_styles: "$dietary_life_styles",
                }
            }
        ];
        return new GetUserProfileDTO((await modelService.aggregate(db[model], aggregationArray, req))[0]);
    } catch (error) {
        throw error;
    }
}

export const linkSocialAccount = async (req, model) => {
    const transaction = await mongoose.startSession();
    transaction.startTransaction();
    try {
        const data = {};
        if (req.body.social_type === 1) {
            data.google_social_id = req.body.social_id;
        } else {
            data.apple_social_id = req.body.social_id;
        }
        const result = await modelService.getOne(db[model], {
            $and: [
                {
                    _id: {
                        $ne: req.user._id
                    }
                },
                {
                    $or: [
                        {
                            google_social_id: req.body.social_id
                        },
                        {
                            apple_social_id: req.body.social_id
                        }
                    ]
                }
            ]
        }, req);
        if (result) {
            await transaction.commitTransaction();
            return response(config.http_status_ok, {
                status: config.status_fail,
                message: await getMessage('common.link_social_account_fail'),
            });
        } else {
            await modelService.getOneAndUpdate(db[model], { _id: req.user._id }, data, req);
            await transaction.commitTransaction();
            return response(config.http_status_ok, {
                status: config.status_success,
                message: await getMessage('common.link_social_account_success'),
            });
        }
    } catch (error) {
        await transaction.abortTransaction();
        throw error;
    } finally {
        await transaction.endSession();
    }
}

export const addSubscription = async (req, model) => {
    const transaction = await mongoose.startSession();
    transaction.startTransaction();
    try {
        const data = {
            user_id: req.user._id,
            created_at: moment().unix(),
            updated_at: moment().unix(),
            ...req.body
        }
        const userData = {
            is_plan_active: true
        }
        await modelService.createOne(db[model[0]], data, req);
        await modelService.getOneAndUpdate(db[model[1]], { _id: req.user._id }, userData, req);
        await transaction.commitTransaction();
        return response(config.http_status_ok, {
            status: config.status_success,
            message: await getMessage('common.add_subscription_success')
        });
    } catch (error) {
        await transaction.abortTransaction();
        throw error;
    } finally {
        await transaction.endSession();
    }
}

export const getSubscription = async (req, model) => {
    try {
        const getSubscriptions = await modelService.getAll(db[model], { user_id: req.user._id }, req);
        return new GetSubscriptionDTO(getSubscriptions);
    } catch (error) {
        throw error;
    }
}

export const selfUserProfile = async (req, model) => {
    try {
        let aggregateArray = [
            {
                $match: {
                    _id: req.user._id,
                    deleted_at: { $eq: 0 }
                }
            },
            {
                $project: {
                    _id: 1,
                    name: { $concat: ["$first_name", " ", "$last_name"] },
                    profile: 1,
                    bio: 1,
                    insta_link: 1,
                    posts_count: 1,
                    followers: "$followers_count",
                    followings: "$following_count",
                }
            },
        ];
        return new GetCommunityUserProfileDTO((await modelService.aggregate(db[model], aggregateArray, req))[0]);
    } catch (error) {
        throw error;
    }
}
export const otherUserProfile = async (req, model) => {
    try {
        let aggregateArray = [
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(req.body.user_id),
                    blocked_at: { $eq: 0 },
                    deleted_at: { $eq: 0 }
                }
            },
            {
                $lookup: {
                    from: "user_actions",
                    let: { userId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: [req.user._id, "$sender_id"] },
                                        { $eq: ["$receiver_id", "$$userId"] },
                                        { $eq: ["$deleted_at", 0] },

                                        // {$or: [
                                        //         { $ne: ["$blocked_at", 0] }, { $ne: ["$unblocked_at", 0] },
                                        //         { $eq: ["$blocked_at", 0] }
                                        //     ]},
                                        // { $eq: ["$reported_at", 0] },
                                        { $gt: ["$followed_at", 0] },
                                        { $eq: ["$unfollowed_at", 0] },
                                    ]
                                },
                            }
                        }
                    ],
                    as: "followed"
                }
            },
            {
                $unwind: {
                    path: "$followed",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: "user_actions",
                    let: { userId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: [req.user._id, "$sender_id"] },
                                        { $eq: ["$receiver_id", "$$userId"] },
                                        { $eq: ["$deleted_at", 0] },
                                        // {$or: [
                                        //         { $ne: ["$blocked_at", 0] }, { $ne: ["$unblocked_at", 0] },
                                        //         { $eq: ["$blocked_at", 0] }
                                        //     ]},
                                        { $eq: ["$reported_at", 0] },
                                        { $eq: ["$followed_at", 0] },
                                        { $eq: ["$unfollowed_at", 0] },
                                        { $ne: ["$blocked_at", 0] },
                                        { $eq: ["$unblocked_at", 0] },
                                    ]
                                },
                            }
                        }
                    ],
                    as: "blocked"
                }
            },
            {
                $unwind: {
                    path: "$blocked",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    _id: 1,
                    name: { $concat: ["$first_name", " ", "$last_name"] },
                    profile: 1,
                    bio: 1,
                    insta_link: 1,
                    posts_count: 1,
                    allow_dm: 1,
                    followers: { $ifNull: ['$followers_count', 0] },
                    followings: { $ifNull: ['$following_count', 0] },
                    followed_at: {
                        $cond: [
                            {
                                $gt: ["$followed.followed_at", 0]
                            },
                            "$followed.followed_at",
                            0
                        ]
                    },
                    blocked_at: {
                        $cond: [
                            {
                                $gt: ["$blocked.blocked_at", 0]
                            },
                            "$blocked.blocked_at",
                            0
                        ]
                    }
                }
            },
        ];
        return new GetCommunityOtherUserProfileDTO((await modelService.aggregate(db[model], aggregateArray, req))[0]);
    } catch (error) {
        throw error;
    }
}

export const getPosts = async (req, model) => {
    try {
        const page = req.body?.page ?? 1;
        const size = req.body?.size ?? 10;
        const skip = (page - 1) * size;
        let aggregateArray = [
            {
                $match: {
                    created_by: 'user',
                    creator_id: req.user._id,
                    deleted_at: { $eq: 0 }
                }
            },
            {
                $lookup: {
                    from: "community_post_comments",
                    localField: "_id",
                    foreignField: "post_id",
                    as: "post_comments"
                }
            },
            {
                $unwind: {
                    path: "$post_comments",
                    preserveNullAndEmptyArrays: true // This keeps the left join behavior
                }
            },
            {
                $lookup: {
                    from: "community_post_likes",
                    let: { postId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$post_id", "$$postId"] },
                                        { $eq: ["$creator_id", req.user._id] },
                                        { $eq: ["$created_by", "user"] },
                                        { $eq: ["$deleted_at", 0] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "post_likes",
                }
            },
            {
                $unwind: {
                    path: "$post_likes",
                    preserveNullAndEmptyArrays: true // This keeps the left join behavior
                }
            },
            {
                $addFields: {
                    liked_at: {
                        $cond: [
                            { $and: [{ $gt: ["$post_likes.created_at", 0] }, { $eq: ["$post_likes.deleted_at", 0] }] },
                            "$post_likes.created_at",
                            0
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: "$_id",
                    community_id: { $first: "$community_id" },
                    title: { $first: "$title" },
                    description: { $first: "$description" },
                    images: { $first: "$images" },
                    created_by: { $first: "$created_by" },
                    creator_id: { $first: "$creator_id" },
                    created_at: { $first: "$created_at" },
                    updated_at: { $first: "$updated_at" },
                    deleted_at: { $first: "$deleted_at" },
                    likes_count: { $first: "$likes_count" },
                    comments_count: { $first: "$comments_count" },
                    liked_at: { $first: "$liked_at" },
                    max_comment_like_activity: {
                        $max: {
                            $max: ["$post_comments.created_at", "$post_comments.updated_at", "$post_comments.deleted_at", "$post_likes.created_at", "$post_likes.updated_at", "$post_likes.deleted_at"]
                        }
                    }
                }
            },
            {
                $project: {
                    community_id: 1,
                    title: 1,
                    description: 1,
                    images: 1,
                    created_by: 1,
                    creator_id: 1,
                    created_at: 1,
                    updated_at: 1,
                    deleted_at: 1,
                    likes_count: 1,
                    comments_count: 1,
                    liked_at: 1,
                    recent_activity: {
                        $max: ["$max_comment_like_activity", "$created_at"]
                    },
                }
            },
            {
                $sort: {
                    created_at: -1
                }
            },
            {
                $skip: skip // Skip documents
            }, {
                $limit: size // Limit the number of documents
            }
        ];
        return new GetPosts(await modelService.aggregate(db[model], aggregateArray, req));
    } catch (error) {
        throw error;
    }
}

export const getOtherUserPosts = async (req, model) => {
    try {
        const page = req.body?.page ?? 1;
        const size = req.body?.size ?? 10;
        const skip = (page - 1) * size;
        let aggregateArray = [
            {
                $match: {
                    created_by: 'user',
                    creator_id: new mongoose.Types.ObjectId(req.body.user_id),
                    deleted_at: { $eq: 0 }
                }
            },
            {
                $lookup: {
                    from: "community_post_comments",
                    localField: "_id",
                    foreignField: "post_id",
                    as: "post_comments"
                }
            },
            {
                $unwind: {
                    path: "$post_comments",
                    preserveNullAndEmptyArrays: true // This keeps the left join behavior
                }
            },
            {
                $lookup: {
                    from: "community_post_likes",
                    let: { postId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$post_id", "$$postId"] },
                                        { $eq: ["$creator_id", req.user._id] },
                                        { $eq: ["$created_by", "user"] },
                                        { $eq: ["$deleted_at", 0] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "post_likes",
                }
            },
            {
                $unwind: {
                    path: "$post_likes",
                    preserveNullAndEmptyArrays: true // This keeps the left join behavior
                }
            },
            {
                $addFields: {
                    liked_at: {
                        $cond: [
                            { $and: [{ $gt: ["$post_likes.created_at", 0] }, { $eq: ["$post_likes.deleted_at", 0] }] },
                            "$post_likes.created_at",
                            0
                        ]
                    }
                }
            },
            {
                $lookup: {
                    from: "users",
                    let: { userId: "$creator_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ["$_id", "$$userId"]
                                }
                            }
                        }
                    ],
                    as: "users",
                }
            },
            {
                $unwind: {
                    path: "$users",
                    preserveNullAndEmptyArrays: true // This keeps the left join behavior
                }
            },
            {
                $group: {
                    _id: "$_id",
                    community_id: { $first: "$community_id" },
                    title: { $first: "$title" },
                    description: { $first: "$description" },
                    images: { $first: "$images" },
                    created_by: { $first: "$created_by" },
                    creator_id: { $first: "$creator_id" },
                    created_at: { $first: "$created_at" },
                    updated_at: { $first: "$updated_at" },
                    deleted_at: { $first: "$deleted_at" },
                    likes_count: { $first: "$likes_count" },
                    comments_count: { $first: "$comments_count" },
                    liked_at: { $first: "$liked_at" },
                    max_comment_like_activity: {
                        $max: {
                            $max: ["$post_comments.created_at", "$post_comments.updated_at", "$post_comments.deleted_at", "$post_likes.created_at", "$post_likes.updated_at", "$post_likes.deleted_at"]
                        }
                    },
                    user_profile: { $first: "$users" }
                }
            },
            {
                $project: {
                    community_id: 1,
                    title: 1,
                    description: 1,
                    images: 1,
                    created_by: 1,
                    creator_id: 1,
                    created_at: 1,
                    updated_at: 1,
                    deleted_at: 1,
                    likes_count: 1,
                    comments_count: 1,
                    liked_at: 1,
                    recent_activity: {
                        $max: ["$max_comment_like_activity", "$created_at"]
                    },
                    user_profile: 1
                }
            },
            {
                $sort: {
                    created_at: 1
                }
            },
            {
                $skip: skip // Skip documents
            }, {
                $limit: size // Limit the number of documents
            }
        ];
        return new GetPosts(await modelService.aggregate(db[model], aggregateArray, req));
    } catch (error) {
        throw error;
    }
}

export const getCommunityPosts = async (req, model) => {
    try {
        const page = req.body?.page ?? 1;
        const size = req.body?.size ?? 10;
        const skip = (page - 1) * size;
        let aggregateArray = [
            {
                $match: {
                    community_id: new mongoose.Types.ObjectId(req.body.community_id),
                    created_by: 'user',
                    creator_id: req.user._id,
                    deleted_at: { $eq: 0 }
                }
            },
            {
                $lookup: {
                    from: "community_post_comments",
                    localField: "_id",
                    foreignField: "post_id",
                    as: "post_comments"
                }
            },
            {
                $unwind: {
                    path: "$post_comments",
                    preserveNullAndEmptyArrays: true // This keeps the left join behavior
                }
            },
            {
                $lookup: {
                    from: "community_post_likes",
                    localField: "_id",
                    foreignField: "post_id",
                    as: "post_likes"
                }
            },
            {
                $unwind: {
                    path: "$post_likes",
                    preserveNullAndEmptyArrays: true // This keeps the left join behavior
                }
            },
            {
                $match: {
                    "post_comments": { $exists: false },
                    "post_likes": { $exists: false }
                }
            },
            {
                $addFields: {
                    liked_at: {
                        $cond: [
                            { $and: [{ $gt: ["$post_likes.created_at", 0] }, { $eq: ["$post_likes.deleted_at", 0] }] },
                            "$post_likes.created_at",
                            0
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: "$_id",
                    community_id: "$community_id",
                    title: { $first: "$title" },
                    description: { $first: "$description" },
                    images: { $first: "$images" },
                    created_by: { $first: "$created_by" },
                    creator_id: { $first: "$creator_id" },
                    created_at: { $first: "$created_at" },
                    updated_at: { $first: "$updated_at" },
                    deleted_at: { $first: "$deleted_at" },
                    likes_count: { $first: "$likes_count" },
                    comments_count: { $first: "$comments_count" },
                    liked_at: { $first: "$liked_at" },
                    max_comment_like_activity: {
                        $max: {
                            $max: ["$post_comments.created_at", "$post_comments.updated_at", "$post_comments.deleted_at", "$post_likes.created_at", "$post_likes.updated_at", "$post_likes.deleted_at"]
                        }
                    }
                }
            },
            {
                $project: {
                    community_id: 1,
                    title: 1,
                    description: 1,
                    images: 1,
                    created_by: 1,
                    creator_id: 1,
                    created_at: 1,
                    updated_at: 1,
                    deleted_at: 1,
                    likes_count: 1,
                    comments_count: 1,
                    recent_activity: {
                        $max: ["$max_comment_like_activity", "$created_at"]
                    },
                }
            },
            {
                $skip: skip // Skip documents
            }, {
                $limit: size // Limit the number of documents
            }
        ];
        return new GetPosts(await modelService.aggregate(db[model], aggregateArray, req));
    } catch (error) {
        throw error;
    }
}

export const reportUser = async (req, model) => {
    const transaction = await mongoose.startSession();
    transaction.startTransaction();
    try {
        const prevReportedUser = await modelService.getAll(db[model[0]], {
            sender_id: req.user._id,
            receiver_id: new mongoose.Types.ObjectId(req.body.user_id),
            reported_type: req.body.reported_type,
            // reported_description: req.body.reported_description,
        }, req);
        if (prevReportedUser.length > 0) {
            return response(config.http_status_ok, {
                status: config.status_fail,
                message: await getMessage('common.repeat_reported_type_invalid')
            });
        }
        let data = {
            sender_id: req.user._id,
            receiver_id: new mongoose.Types.ObjectId(req.body.user_id),
            reported_type: req.body.reported_type,
            reported_description: req.body.reported_description,
            reported_at: moment().unix()
        };
        const report = await modelService.createOne(db[model[0]], data, req);
        if (!report) {
            return response(config.http_status_ok, {
                status: config.status_fail,
                message: await getMessage('common.user_report_fail')
            })
        }
        let addStrikeData = {
            $inc: { strikes: 1, user_strikes: 1 },
            user_strike_is_read: 0
        }
        const userStrike = await modelService.getOneAndUpdate(db[model[1]], { _id: new mongoose.Types.ObjectId(req.body.user_id) }, addStrikeData, req);
        if ((userStrike.strikes % config.reportLimit) === 0) {
            await modelService.getOneAndUpdate(db[model[1]], { _id: userStrike._id }, { blocked_at: moment().unix() }, req);
            await sendEmail('accountBlocked', 'BTND - Account Blocked', userStrike);
        }
        await transaction.commitTransaction();
        return response(config.http_status_ok, {
            status: config.status_success,
            message: await getMessage('common.user_report_success')
        })
    } catch (error) {
        await transaction.abortTransaction();
        throw error;
    } finally {
        await transaction.endSession();
    }
}

export const blockUser = async (req, model) => {
    const transaction = await mongoose.startSession();
    transaction.startTransaction();
    try {
        if (req.body.is_blocked) {
            const report = await modelService.updateOrInsert(db[model[0]], {
                sender_id: req.user._id,
                receiver_id: req.body.user_id,
                blocked_at: { $ne: 0 },
                unblocked_at: { $eq: 0 }
            }, {
                sender_id: req.user._id,
                receiver_id: req.body.user_id,
                blocked_at: moment().unix()
            }, req);
            if (!report) {
                return response(config.http_status_ok, {
                    status: config.status_fail,
                    message: await getMessage('common.user_block_fail')
                })
            }
            const follower = await modelService.getOne(db[model[0]], {
                receiver_id: req.user._id,
                sender_id: req.body.user_id,
                followed_at: { $gt: 0 },
                unfollowed_at: { $eq: 0 }
            }, req);
            await modelService.getOneAndUpdate(db[model[0]], {
                receiver_id: req.user._id,
                sender_id: req.body.user_id,
                followed_at: { $gt: 0 },
                unfollowed_at: { $eq: 0 }
            }, {
                unfollowed_at: moment().unix()
            }, req);
            const following = await modelService.getOne(db[model[0]], {
                receiver_id: req.body.user_id,
                sender_id: req.user._id,
                followed_at: { $gt: 0 },
                unfollowed_at: { $eq: 0 }
            }, req);
            await modelService.getOneAndUpdate(db[model[0]], {
                receiver_id: req.body.user_id,
                sender_id: req.user._id,
                followed_at: { $gt: 0 },
                unfollowed_at: { $eq: 0 }
            }, {
                unfollowed_at: moment().unix()
            }, req);
            if (follower) {
                await modelService.getOneAndUpdate(db[model[1]], { _id: req.user._id }, { $inc: { followers_count: -1 } }, req);
                await modelService.getOneAndUpdate(db[model[1]], { _id: req.body.user_id }, { $inc: { following_count: -1 } }, req);
            }
            if (following) {
                await modelService.getOneAndUpdate(db[model[1]], { _id: req.user._id }, { $inc: { following_count: -1 } }, req);
                await modelService.getOneAndUpdate(db[model[1]], { _id: req.body.user_id }, { $inc: { followers_count: -1 } }, req);
            }
            await transaction.commitTransaction();
            return response(config.http_status_ok, {
                status: config.status_success,
                message: await getMessage('common.user_block_success')
            })
        } else {
            await modelService.getOneAndUpdate(db[model[0]], {
                sender_id: req.user._id,
                receiver_id: req.body.user_id,
                blocked_at: { $gt: 0 },
                unblocked_at: { $eq: 0 }
            }, {
                unblocked_at: moment().unix()
            }, req);
            await transaction.commitTransaction();
            return response(config.http_status_ok, {
                status: config.status_success,
                message: await getMessage('common.user_unblock_success')
            })
        }

    } catch (error) {
        await transaction.abortTransaction();
        throw error;
    } finally {
        await transaction.endSession();
    }
}

export const blockUserList = async (req, model) => {
    try {
        const aggregationArray = [
            {
                $match: {
                    sender_id: req.user._id,
                    blocked_at: { $gt: 0 },
                    unblocked_at: { $eq: 0 }
                },
            },
            {
                $lookup: {
                    from: "users",
                    let: { userId: "$receiver_id" },
                    pipeline: [{
                        $match: {
                            $expr: {
                                $eq: ["$$userId", "$_id"],
                            },
                        }
                    }],
                    as: "user",
                },
            },
            {
                $unwind: {
                    path: "$user",
                    preserveNullAndEmptyArrays: true // This keeps the left join behavior
                }
            },
            {
                $project: {
                    blocked_at: 1,
                    user: "$user",
                }
            }
        ];
        return new GetBlockUsers(await modelService.aggregate(db[model], aggregationArray, req));
    } catch (error) {
        throw error;
    }
}

export const followUser = async (req, model) => {
    try {
        const aggregationArray = [
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(req.body.user_id),
                    deleted_at: 0,
                    blocked_at: 0
                }
            },
            {
                $lookup: {
                    from: "user_tokens",
                    localField: "_id",
                    foreignField: "user_id",
                    as: "user_tokens"
                },
            },
        ];
        const receiverUser = await modelService.aggregate(db[model[1]], aggregationArray, req);
        if (receiverUser.length === 0) {
            return response(config.http_status_ok, {
                status: config.status_fail,
                message: await getMessage('common.user_not_found')
            })
        }
        if (req.body.is_follow) {
            const where = {
                sender_id: req.user._id,
                receiver_id: new mongoose.Types.ObjectId(req.body.user_id),
                deleted_at: { $eq: 0 },
                reported_at: { $eq: 0 },
                // $or: [{
                //     blocked_at: { $eq: 0 }
                // }, {
                //     unblocked_at: { $gt: 0 }
                // }],
                $and: [{
                    followed_at: { $gt: 0 }
                }, {
                    unfollowed_at: { $eq: 0 }
                }]
            };

            const data = {
                sender_id: req.user._id,
                receiver_id: new mongoose.Types.ObjectId(req.body.user_id),
                followed_at: moment().unix()
            }
            const follow = await modelService.updateOrInsert(db[model[0]], where, data, req);
            if (!follow) {
                return response(config.http_status_ok, {
                    status: config.status_fail,
                    message: await getMessage('common.user_follow_fail')
                })
            } else {
                await modelService.getOneAndUpdate(db[model[1]], { _id: req.body.user_id }, { $inc: { followers_count: 1 } }, req);
                await modelService.getOneAndUpdate(db[model[1]], { _id: req.user._id }, { $inc: { following_count: 1 } }, req);

                const registrationTokens = [];
                const deviceTypes = [];
                const notifications = [];

                // Pre-fetch notification messages
                const notificationTitle = await getMessage('notification.new_follower.title');
                const notificationBodySuffix = await getMessage('notification.new_follower.body');
                const notificationBody = `${req.user.first_name} ${notificationBodySuffix}`;


                if (receiverUser[0]?.user_tokens && (receiverUser[0]?.user_tokens).length > 0) {
                    if (receiverUser[0]?.allow_notification === true) {
                        (receiverUser[0].user_tokens).forEach(userToken => {
                            if (userToken.firebase_token) {
                                registrationTokens.push(userToken.firebase_token);
                                deviceTypes.push(userToken?.device_type ?? 2);
                            }
                        });
                    }
                    notifications.push({
                        notification_type: 8,
                        title: notificationTitle,
                        body: notificationBody,
                        sender_type: "user",
                        sender_id: req.user._id,
                        receiver_type: "user",
                        receiver_id: receiverUser[0]._id,
                        created_at: moment().unix(),
                        updated_at: moment().unix()
                    });
                }
                if (registrationTokens.length > 0) {
                    const message = {
                        tokens: registrationTokens,
                        deviceTypes: deviceTypes,
                        data: {
                            title: notificationTitle,
                            body: notificationBody,
                            notification_type: "8",
                            data: JSON.stringify(follow)
                        },
                        notification: {
                            title: notificationTitle,
                            body: notificationBody,
                        },
                        apns: {
                            payload: {
                                aps: {
                                    // alert: {
                                    //     title: notificationTitle,
                                    //     body: notificationBody,
                                    // },
                                    sound: config.default_sound,
                                    "content-available": 1
                                }
                            }
                        }
                    }
                    await commonService.sendPushNotification(message);
                    // const message = {
                    //     data: {
                    //         title: notificationTitle,
                    //         body: notificationBody,
                    //         data: follow
                    //     },
                    //     notification: {
                    //         title: notificationTitle,
                    //         body: notificationBody,
                    //         sound: config.default_sound,
                    //     },
                    // };
                    // await commonService.sendToDevicePushNotification(registrationTokens, message);
                }
                if (notifications.length > 0) {
                    await commonService.addNotifications(notifications, req);
                }
                return response(config.http_status_ok, {
                    status: config.status_success,
                    message: await getMessage('common.user_follow_success')
                })
            }
        } else {
            const where = {
                sender_id: req.user._id,
                receiver_id: new mongoose.Types.ObjectId(req.body.user_id),
                followed_at: { $ne: 0 },
                unfollowed_at: { $eq: 0 },
                reported_at: { $eq: 0 },
                deleted_at: { $eq: 0 },
                $or: [{
                    blocked_at: { $eq: 0 }
                }, {
                    unblocked_at: { $gt: 0 }
                }]
            }
            const unfollow = await modelService.getOneAndUpdate(db[model[0]], where, { unfollowed_at: moment().unix() }, req);
            if (unfollow?.unfollowed_at > 0) {
                await modelService.getOneAndUpdate(db[model[1]], { _id: req.body.user_id }, { $inc: { followers_count: -1 } }, req);
                await modelService.getOneAndUpdate(db[model[1]], { _id: req.user._id }, { $inc: { following_count: -1 } }, req);
                return response(config.http_status_ok, {
                    status: config.status_success,
                    message: await getMessage('common.user_unfollow_success')
                })
            } else {
                return response(config.http_status_ok, {
                    status: config.status_fail,
                    message: await getMessage('common.user_unfollow_fail')
                })
            }
        }
    } catch (error) {
        throw error;
    }
}

export const userFollowerList = async (req, model) => {
    try {
        const page = req.body?.page ?? 1;
        const size = req.body?.size ?? 10;
        const skip = (page - 1) * size;
        const aggregateArray = [];
        if (req.body.is_follow) {
            aggregateArray.push(
                {
                    $match: {
                        receiver_id: req.body.user_id ? new mongoose.Types.ObjectId(req.body.user_id) : req.user._id,
                        followed_at: { $gt: 0 },
                        unfollowed_at: { $eq: 0 },
                        deleted_at: { $eq: 0 },
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        let: { userId: "$sender_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$$userId", "$_id"]
                                    },
                                    blocked_at: { $eq: 0 },
                                    // deleted_at: { $eq: 0 },
                                }
                            },
                            {
                                $lookup: {
                                    from: "user_actions",
                                    let: { receiverId: "$_id" },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $eq: ["$$receiverId", "$receiver_id"]
                                                },
                                                $and: [
                                                    { sender_id: req.user._id },
                                                    { followed_at: { $gt: 0 } },
                                                    { unfollowed_at: { $eq: 0 } },
                                                    { deleted_at: { $eq: 0 } },
                                                ]
                                            }
                                        }
                                    ],
                                    as: "user_action_follow"
                                }
                            },
                            {
                                $lookup: {
                                    from: "user_actions",
                                    let: { senderId: "$_id" },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $eq: ["$$senderId", "$sender_id"]
                                                },
                                                $and: [
                                                    { receiver_id: req.user._id },
                                                    { blocked_at: { $gt: 0 } },
                                                    { unblocked_at: { $eq: 0 } },
                                                    { deleted_at: { $eq: 0 } },
                                                ]
                                            }
                                        }
                                    ],
                                    as: "user_action_block"
                                }
                            }
                        ],
                        as: "user"
                    }
                },
                {
                    $unwind: {
                        path: "$user",
                    }
                },
                {
                    $unwind: {
                        path: "$user.user_action_follow",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $unwind: {
                        path: "$user.user_action_block",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $sort: {
                        "user.first_name": 1,
                        "user.deleted_at": -1,
                    }
                },
                {
                    $skip: skip // Skip documents
                },
                {
                    $limit: size // Limit the number of documents
                },
            );
        } else {
            aggregateArray.push(
                {
                    $match: {
                        sender_id: req.body.user_id ? new mongoose.Types.ObjectId(req.body.user_id) : req.user._id,
                        followed_at: { $gt: 0 },
                        unfollowed_at: { $eq: 0 },
                        deleted_at: { $eq: 0 },
                    }
                },
                {
                    $lookup: {
                        from: "users",
                        let: { userId: "$receiver_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $eq: ["$$userId", "$_id"]
                                    },
                                    blocked_at: { $eq: 0 },
                                    // deleted_at: { $eq: 0 },
                                }
                            },
                            {
                                $lookup: {
                                    from: "user_actions",
                                    let: { receiverId: "$_id" },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $eq: ["$$receiverId", "$receiver_id"]
                                                },
                                                $and: [
                                                    { sender_id: req.user._id },
                                                    { followed_at: { $gt: 0 } },
                                                    { unfollowed_at: { $eq: 0 } },
                                                    { deleted_at: { $eq: 0 } },
                                                ]
                                            }
                                        }
                                    ],
                                    as: "user_action_follow"
                                }
                            },
                            {
                                $lookup: {
                                    from: "user_actions",
                                    let: { senderId: "$_id" },
                                    pipeline: [
                                        {
                                            $match: {
                                                $expr: {
                                                    $eq: ["$$senderId", "$sender_id"]
                                                },
                                                $and: [
                                                    { receiver_id: req.user._id },
                                                    { blocked_at: { $gt: 0 } },
                                                    { unblocked_at: { $eq: 0 } },
                                                    { deleted_at: { $eq: 0 } },
                                                ]
                                            }
                                        }
                                    ],
                                    as: "user_action_block"
                                }
                            }
                        ],
                        as: "user"
                    },
                },
                {
                    $unwind: {
                        path: "$user",
                    }
                },
                {
                    $unwind: {
                        path: "$user.user_action_follow",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $unwind: {
                        path: "$user.user_action_block",
                        preserveNullAndEmptyArrays: true
                    }
                },
                {
                    $sort: {
                        "user.first_name": 1,
                        "user.deleted_at": -1,
                    }
                },
                {
                    $skip: skip // Skip documents
                },
                {
                    $limit: size // Limit the number of documents
                },
            );
        }
        return new GetCommunityUserFollowersDTO(await modelService.aggregate(db[model], aggregateArray, req));
    } catch (error) {
        throw error;
    }
}

export const settings = async (req, model) => {
    try {
        return await modelService.getOneAndUpdate(db[model], { _id: req.user._id }, {
            allow_notification: req.body.allow_notification,
            allow_dm: req.body.allow_dm
        }, req);
    } catch (error) {
        throw error;
    }
}

export const requestWorkoutTypeList = async (req, model) => {
    try {
        return await modelService.getAll(db[model], {}, req);
    } catch (error) {
        throw error;
    }
}

export const newWorkoutRequest = async (req, model) => {
    try {
        const getRequestWorkoutTypeList = await modelService.getAll(db[model[0]], { _id: { $in: [...req.body.workout_request_type_ids] } }, req);
        const getWorkout_request_type_ids = getRequestWorkoutTypeList.map(getRequestWorkoutType => {
            return getRequestWorkoutType._id;
        });
        return await modelService.createOne(db[model[1]], {
            user_id: req.user._id,
            workout_request_type_ids: [...getWorkout_request_type_ids],
            created_at: moment().unix()
        }, req);
    } catch (error) {
        throw error;
    }
}