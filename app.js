require("dotenv").config();

const express = require("express");
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const { connectDB } = require("./db");
const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const projectRoutes = require("./routes/projectRoutes");
const groupRoutes = require("./routes/groupRoutes");

const app = express();

connectDB();

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        dbName: "givehand",
        collectionName: "sessions"
    }),
    cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true
    }
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

app.use(authRoutes);
app.use(userRoutes);
app.use(projectRoutes);
app.use(groupRoutes);

app.use(function(error, req, res, next) {
    console.error("UNHANDLED REQUEST ERROR:", error);

    if (res.headersSent) {
        return next(error);
    }

    res.status(500).json({
        error: "An unexpected server error occurred"
    });
});

app.listen(3000);
