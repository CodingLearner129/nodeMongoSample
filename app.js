import express from "express";
import morgan from "morgan";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import { router as routerV1 } from "./src/v1/routes/index.js";
import config from "./src/v1/config/config.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Development logging
app.use(morgan('dev'));

app.use(express.json());

// serving static files
app.use(express.static(path.join(__dirname, './src/public')));

//route middlewares
app.use('/v1', routerV1);

app.all('*', (req, res) => {
    res.status(404).json({
        status: config.status_fail,
        message: `Can't find ${req.originalUrl} on this server!`
    });
});

export default app;
