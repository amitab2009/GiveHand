const path = require("path");
const { ObjectId } = require("mongodb");
const projectModel = require("../models/projectModel");
const userModel = require("../models/userModel");
const { uploadImage } = require("../middleware/upload");
const xPublisher = require("../services/xPublisher");

function parseVolunteerCount(value) {
    const volunteers = Number(value);

    if (
        !Number.isFinite(volunteers) ||
        !Number.isInteger(volunteers) ||
        volunteers < 1
    ) {
        return null;
    }

    return volunteers;
}

function sendView(fileName) {
    return function(req, res) {
        res.sendFile(path.join(__dirname, "..", "views", fileName));
    };
}

const showFeed = sendView("feed.html");
const showStatistics = sendView("statistics.html");
const showEditProject = sendView("edit-project.html");
const showCreateProject = sendView("create-project.html");
const showJoinProject = sendView("join-project.html");

async function createProject(req, res) {
    try {
        const userId = req.session.userId;
        const user = await userModel.findById(userId, false);

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const volunteers = parseVolunteerCount(req.body.volunteers);

        if (volunteers === null) {
            return res.status(400).json({
                error: "Number of volunteers must be a positive whole number"
            });
        }

        let image = "";

        if (req.file) {
            const uploadedImage = await uploadImage(req.file.buffer);
            image = uploadedImage.secure_url;
        }

        const newProject = {
            projectName: req.body.projectName,
            description: req.body.description,
            location: req.body.location,
            category: req.body.category,
            volunteers: volunteers,
            contact: req.body.contact,
            image: image,
            joined: 0,
            joinedBy: [],
            createdBy: new ObjectId(userId),
            createdByUsername: user.username
        };

        if (
            req.body.latitude !== undefined &&
            req.body.longitude !== undefined &&
            req.body.latitude !== "" &&
            req.body.longitude !== ""
        ) {
            newProject.latitude = Number(req.body.latitude);
            newProject.longitude = Number(req.body.longitude);
        }

        await projectModel.create(newProject);

        try {
            const postId = await xPublisher.publishProject(newProject);
            console.log("Published X post:", postId);
        }
        catch (error) {
            const reason = error && error.code === "X_NOT_CONFIGURED"
                ? "not configured"
                : "request failed";
            console.warn("Could not publish project to X:", reason);
        }

        res.json({ success: true });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: "Could not create project" });
    }
}

async function getProjects(req, res) {
    const userId = req.session.userId;
    const projects = await projectModel.findAll();

    const result = projects.map(function(project) {
        const joinedBy = project.joinedBy || [];
        const currentUserJoined = !!userId && joinedBy.some(function(id) {
            return id.toString() === userId.toString();
        });

        return { ...project, currentUserJoined: currentUserJoined };
    });

    res.json(result);
}

async function getProject(req, res) {
    try {
        const projectId = req.params.id;

        if (!ObjectId.isValid(projectId)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        const project = await projectModel.findById(projectId);

        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        const userId = req.session.userId;
        const isOwner = !!(
            userId && project.createdBy &&
            project.createdBy.toString() === userId.toString()
        );
        const joinedBy = project.joinedBy || [];
        const currentUserJoined = !!userId && joinedBy.some(function(id) {
            return id.toString() === userId.toString();
        });

        res.json({
            ...project,
            currentUserJoined: currentUserJoined,
            isOwner: isOwner
        });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: "Could not load project" });
    }
}

async function joinProject(req, res) {
    try {
        const userId = req.session.userId;
        const projectId = req.params.id;

        if (!ObjectId.isValid(projectId)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        const project = await projectModel.findById(projectId);

        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        const joinedBy = project.joinedBy || [];
        const alreadyJoined = joinedBy.some(function(id) {
            return id.toString() === userId.toString();
        });

        if (alreadyJoined) {
            return res.status(400).json({
                error: "You already joined this project"
            });
        }

        if ((project.joined || 0) >= project.volunteers) {
            return res.status(400).json({
                error: "This project is already full"
            });
        }

        const result = await projectModel.join(projectId, userId);

        if (result.modifiedCount === 0) {
            return res.status(400).json({ error: "Could not join the project" });
        }

        const updatedProject = await projectModel.findById(projectId);
        res.json({ success: true, project: updatedProject });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: "Could not join the project" });
    }
}

async function leaveProject(req, res) {
    try {
        const userId = req.session.userId;
        const projectId = req.params.id;

        if (!ObjectId.isValid(projectId)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        const project = await projectModel.findById(projectId);

        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        const joinedBy = project.joinedBy || [];
        const alreadyJoined = joinedBy.some(function(id) {
            return id.toString() === userId.toString();
        });

        if (!alreadyJoined) {
            return res.status(400).json({
                error: "You are not joined to this project"
            });
        }

        await projectModel.leave(projectId, userId);
        const updatedProject = await projectModel.findById(projectId);
        res.json({ success: true, project: updatedProject });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: "Could not cancel joining" });
    }
}

async function updateProject(req, res) {
    try {
        const userId = req.session.userId;
        const projectId = req.params.id;

        if (!ObjectId.isValid(projectId)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        const project = await projectModel.findById(projectId);

        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        if (!project.createdBy || project.createdBy.toString() !== userId.toString()) {
            return res.status(403).json({
                error: "You are not allowed to edit this project"
            });
        }

        const volunteers = parseVolunteerCount(req.body.volunteers);
        const currentJoined = project.joined || 0;

        if (volunteers === null) {
            return res.status(400).json({
                error: "Number of volunteers must be a positive whole number"
            });
        }

        if (volunteers < currentJoined) {
            return res.status(400).json({
                error: "You already have " + currentJoined +
                    " volunteers joined. The number of volunteers needed cannot be lower than that."
            });
        }

        let image = project.image || "";

        if (req.file) {
            const uploadedImage = await uploadImage(req.file.buffer);
            image = uploadedImage.secure_url;
        }

        const updatedProject = await projectModel.update(projectId, {
            projectName: req.body.projectName,
            description: req.body.description,
            location: req.body.location,
            category: req.body.category,
            volunteers: volunteers,
            contact: req.body.contact,
            image: image
        });

        res.json({ success: true, project: updatedProject });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: "Could not edit project" });
    }
}

async function deleteProject(req, res) {
    try {
        const userId = req.session.userId;
        const projectId = req.params.id;

        if (!ObjectId.isValid(projectId)) {
            return res.status(400).json({ error: "Invalid project ID" });
        }

        const project = await projectModel.findById(projectId);

        if (!project) {
            return res.status(404).json({ error: "Project not found" });
        }

        if (!project.createdBy || project.createdBy.toString() !== userId.toString()) {
            return res.status(403).json({
                error: "You are not allowed to delete this project"
            });
        }

        await projectModel.remove(projectId);
        res.json({ success: true });
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ error: "Could not delete project" });
    }
}

async function projectsByCategory(req, res) {
    try {
        res.json(await projectModel.projectsByCategory());
    }
    catch (error) {
        console.log("PROJECT STATISTICS ERROR:", error);
        res.status(500).json({ error: "Could not load project statistics" });
    }
}

async function volunteersByCategory(req, res) {
    try {
        res.json(await projectModel.volunteersByCategory());
    }
    catch (error) {
        console.log("VOLUNTEER STATISTICS ERROR:", error);
        res.status(500).json({ error: "Could not load volunteer statistics" });
    }
}

module.exports = {
    showFeed,
    showStatistics,
    showEditProject,
    showCreateProject,
    showJoinProject,
    createProject,
    getProjects,
    getProject,
    joinProject,
    leaveProject,
    updateProject,
    deleteProject,
    projectsByCategory,
    volunteersByCategory
};
