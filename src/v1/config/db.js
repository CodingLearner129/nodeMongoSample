import mongoose from "mongoose";
import path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import config from "./config.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
mongoose.set("strictQuery", true);

const basename = path.basename(__filename);
let db = {};

try {
    await mongoose.connect(config.mongo_db);
    console.log(`Connected to mongodb successfully...`);
    const modelFiles = fs.readdirSync(`${__dirname}/../models`)
        .filter(file => {
            return (
                file.indexOf('.') !== 0 &&
                file !== basename &&
                file.slice(-3) === '.js' &&
                !file.includes('.test.js')
            );
        });
    await Promise.all(modelFiles.map(async file => {
        try {
            const model = await import(`file://${path.join(`${__dirname}/../models`, file)}`);
            db = { ...db, ...model };
        } catch (error) {
            console.error('Error importing model:', error);
        }
    }));
} catch (error) {
    console.log(error.name + "💥 : " + error.message);
}
export default db;