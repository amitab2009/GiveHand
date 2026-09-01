const path = require("path");
const userModel = require("../models/userModel");

function showHome(req, res) {
    res.sendFile(path.join(__dirname, "..", "views", "home.html"));
}

function showRegister(req, res) {
    res.sendFile(path.join(__dirname, "..", "views", "register.html"));
}

async function register(req, res) {
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

    const existingUser = await userModel.findByUsername(username);

    if (existingUser) {
        return res.json({ error: "username" });
    }

    const newUser = {
        fullName: fullName,
        email: email,
        username: username,
        password: password,
        profileImage: ""
    };

    try {
        await userModel.create(newUser);
    }
    catch (error) {
        if (error && error.code === 11000) {
            return res.json({ error: "username" });
        }

        throw error;
    }

    req.session.userId = newUser._id.toString();

    res.json({ success: true });
}

async function checkUsername(req, res) {
    const existingUser = await userModel.findByUsername(req.query.username);

    res.json({ exists: existingUser !== null });
}

function showLogin(req, res) {
    res.sendFile(path.join(__dirname, "..", "views", "login.html"));
}

async function login(req, res) {
    const user = await userModel.findByUsername(req.body.username);

    if (!user) {
        return res.json({ error: "user" });
    }

    if (user.password !== req.body.password) {
        return res.json({ error: "password" });
    }

    req.session.userId = user._id.toString();

    res.json({ success: true });
}

function logout(req, res) {
    req.session.destroy(function(error) {
        if (error) {
            return res.status(500).json({
                error: "Could not log out"
            });
        }

        res.clearCookie("connect.sid");
        res.json({ success: true });
    });
}

module.exports = {
    showHome,
    showRegister,
    register,
    checkUsername,
    showLogin,
    login,
    logout
};
