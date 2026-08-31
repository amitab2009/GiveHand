const path = require("path");
const userModel = require("../models/userModel");
const groupModel = require("../models/groupModel");
const { uploadImage } = require("../middleware/upload");

function showProfile(req, res) {
    res.sendFile(path.join(__dirname, "..", "views", "profile.html"));
}

async function getProfile(req, res) {
    try {
        const user = await userModel.findById(req.session.userId, true);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(user);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: "Could not load profile" });
    }
}

async function updateProfile(req, res) {
    try {
        const userId = req.session.userId;
        const user = await userModel.findById(userId, false);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const fullName = req.body.fullName;
        const email = req.body.email;

        if (!fullName || fullName.trim().length < 2) {
            return res.status(400).json({
                error: "Please enter a valid full name"
            });
        }

        if (!email || !email.includes("@") || !email.includes(".")) {
            return res.status(400).json({
                error: "Please enter a valid email"
            });
        }

        let profileImage = user.profileImage || "";

        if (req.file) {
            const uploadedImage = await uploadImage(req.file.buffer);
            profileImage = uploadedImage.secure_url;
        }

        const updatedUser = await userModel.updateProfile(userId, {
            fullName: fullName.trim(),
            email: email.trim(),
            profileImage: profileImage
        });

        res.json({ success: true, user: updatedUser });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: "Could not update profile" });
    }
}

async function getCreatedProjects(req, res) {
    try {
        const projects = await userModel.findCreatedProjects(req.session.userId);
        res.json(projects);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: "Could not load created projects" });
    }
}

async function getJoinedProjects(req, res) {
    try {
        const projects = await userModel.findJoinedProjects(req.session.userId);
        res.json(projects);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: "Could not load joined projects" });
    }
}

async function getCreatedGroups(req, res) {
    try {
        const groups = await groupModel.findCreatedBy(req.session.userId);
        res.json(groups);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: "Could not load created groups" });
    }
}

async function getJoinedGroups(req, res) {
    try {
        const groups = await groupModel.findJoinedBy(req.session.userId);
        res.json(groups);
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: "Could not load joined groups" });
    }
}

module.exports = {
    showProfile,
    getProfile,
    updateProfile,
    getCreatedProjects,
    getJoinedProjects,
    getCreatedGroups,
    getJoinedGroups
};
