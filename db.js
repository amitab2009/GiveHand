const { MongoClient } = require("mongodb");

const client = new MongoClient(process.env.MONGO_URI);
let db;

async function connectDB() {
    try {
        await client.connect();

        db = client.db("givehand");

        console.log("Connected to MongoDB");

        return db;
    }
    catch (err) {
        console.log(err);
    }
}

function getDB() {
    return db;
}

module.exports = {
    connectDB,
    getDB
};
