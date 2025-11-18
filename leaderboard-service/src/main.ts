
import "dotenv/config";
import express from "express";
import { prisma } from "./prisma/prisma";


const app = express();

const PORT = parseInt(process.env["PORT"] || "3005")

app.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
})

app.get("/elo/:userId", async (req, res) => {
    const user = await prisma.rankedUser.findFirst({
        where: {
            userId: req.params.userId
        }
    })

    if(!user) {
        res.status(404).send("User not found")
        return;
    }

    res.json(user)
})

app.get("/", (req, res) => {
    res.json({git: "hub2"})
})