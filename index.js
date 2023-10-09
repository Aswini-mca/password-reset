import  express  from "express";
import { MongoClient } from "mongodb";
import { UsersRouter } from "./routes/users.js";
import 'dotenv/config'
import cors from "cors"

const app = express();
const PORT = 9000;

//Inbuilt middleware
app.use(express.json())
app.use(cors())

//mongoDB connection
const MONGO_URL = process.env.MONGO_URL

async function createConnection() {
    const client = new MongoClient(MONGO_URL)
    await client.connect()
    console.log("Mongodb is connected")
    return client;
}

export const client = await createConnection()

app.get('/',(req,res)=>{
    res.send('Password Reset Flow')
})

app.use('/users',UsersRouter)

app.listen(PORT,()=> console.log('The server started on the port',PORT))