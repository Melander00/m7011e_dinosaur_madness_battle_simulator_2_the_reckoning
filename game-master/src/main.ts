import bodyParser from "body-parser"
import cors from "cors"
import express from "express"
import { requireAuth } from "./auth"

const app = express()

const server = app.listen(8080, () => {
    console.log("Listening on port 8080")
})

app.use(bodyParser.json())
app.use(cors())


app.get("/match", requireAuth, (req, res) => {

    const user = req.user
    console.log(user.sub)

})