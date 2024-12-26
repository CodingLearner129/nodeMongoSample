import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
dotenvExpand.expand(dotenv.config());

// get data from .env file
const config = {
    node_env: process.env.NODE_ENV || 'development',
    host: process.env.HOST || 'localhost',
    port: process.env.PORT || 3000,
    mongo_db: process.env.MONGO_CLUSTER_DB || '',
    app_name: process.env.APP_NAME || "NodeMongoSample",

    // bcrypt
    bcrypt_salt_round: process.env.BCRYPT_SALT_ROUND || 10,

    // set locale for language
    locale: process.env.LOCALE || 'en',

    // Jwt
    jwt_encryption: process.env.JWT_ENCRYPTION || 'secret',
    jwt_expiration: process.env.JWT_EXPIRATION || '1d',
    jwt_refresh_expiration: Number(process.env.JWT_REFRESH_ENCRYPTION) || 7,
    
    corsOriginUris: process.env.CORS_ORIGIN_URIS == "" ? ["http://127.0.0.1:8000"] : (process.env.CORS_ORIGIN_URIS).split(','),
};

export default config;
