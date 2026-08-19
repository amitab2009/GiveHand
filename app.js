require("dotenv").config();
const { MongoClient } = require("mongodb");
const express = require("express");
const path = require("path");
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
const app = express();

let db;


async function connectDB() {
    try {
        await client.connect();

        db = client.db("givehand");

        console.log("Connected to MongoDB");
    }
    catch (err) {
        console.log(err);
    }
}
connectDB();


app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

app.get("/", function(req, res) {
    res.sendFile(path.join(__dirname, "views", "home.html"));
});
// register
app.get("/register", function(req, res) {
    res.sendFile(path.join(__dirname, "views", "register.html"));
});

app.post("/register", async function(req, res) {

    const fullName = req.body.fullName;
    const email = req.body.email;
    const username = req.body.username;
    const password = req.body.password;


    if (fullName.length < 2) {
        return res.json({ error: "name" });
    }


    if (!email.includes("@") || !email.includes(".")) {
        return res.json({ error: "email" });
    }


    if (password.length < 6) {
        return res.json({ error: "passwordLength" });
    }


    if (!/[A-Z]/.test(password)) {
        return res.json({ error: "passwordUppercase" });
    }


    const existingUser = await db.collection("users").findOne({
        username: username
    });


    if (existingUser) {
        return res.json({ error: "username" });
    }


    const newUser = {
        fullName: fullName,
        email: email,
        username: username,
        password: password
    };


    await db.collection("users").insertOne(newUser);

    res.json({ success: true });

});

app.get("/check-username", async function(req, res) {

    const username = req.query.username;

    const existingUser = await db.collection("users").findOne({
        username: username
    });

    res.json({
        exists: existingUser !== null
    });

});

// login
app.get("/login", function(req, res) {
    res.sendFile(path.join(__dirname, "views", "login.html"));
});

app.post("/login", async function(req, res) {

    const username = req.body.username;
    const password = req.body.password;

    const user = await db.collection("users").findOne({
        username: username
    });

    if (!user) {
        return res.json({ error: "user" });
    }

    if (user.password !== password) {
        return res.json({ error: "password" });
    }

    res.json({ success: true });
});

// feed
app.get("/feed", function(req, res) {
    res.sendFile(path.join(__dirname, "views", "feed.html"));
});

app.listen(3000);
