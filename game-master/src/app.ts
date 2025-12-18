import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import { initRoutes } from "./routes";

export function createApp() {
    const app = express();
    app.use(bodyParser.json())
    app.use(cors())
    initRoutes(app)
    return app;
}