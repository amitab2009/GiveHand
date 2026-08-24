require("dotenv").config();
const multer = require("multer");
const { MongoClient, ObjectId } = require("mongodb");
const express = require("express");
const path = require("path");
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
const app = express();
const upload = multer({
    dest: "public/uploads/"
});


let db;const crypto = require("crypto");

const sessions = new Map();

function createSession(userId) {
    const sessionId = crypto.randomBytes(32).toString("hex");
    sessions.set(sessionId, userId.toString());
    return sessionId;
}
function getCurrentUser(req) {

    const cookies = req.headers.cookie || "";

    const sessionCookie = cookies
        .split(";")
        .map(cookie => cookie.trim())
        .find(cookie =>
            cookie.startsWith("sessionId=")
        );

    if (!sessionCookie) {
        return null;
    }

    const sessionId =
        sessionCookie.substring("sessionId=".length);

    if (!sessionId) {
        return null;
    }

    return sessions.get(sessionId) || null;
}



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

const sessionId = createSession(newUser._id);

res.setHeader(
    "Set-Cookie",
    `sessionId=${sessionId}; HttpOnly; Path=/`
);

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

    const sessionId = createSession(user._id);

    res.setHeader(
        "Set-Cookie",
        `sessionId=${sessionId}; HttpOnly; Path=/`
    );

    res.json({
        success: true
    });
});
app.get("/api/profile", async function(req, res) {

    try {

        const userId = getCurrentUser(req);

        if (!userId) {
            return res.status(401).json({
                error: "Not logged in"
            });
        }

        const user = await db.collection("users").findOne(
            {
                _id: new ObjectId(userId)
            },
            {
                projection: {
                    password: 0
                }
            }
        );

        if (!user) {
            return res.status(404).json({
                error: "User not found"
            });
        }

        res.json(user);

    }
    catch (error) {

        console.log(error);

        res.status(500).json({
            error: "Could not load profile"
        });
    }
});

// feed
app.get("/feed", function(req, res) {
    res.sendFile(path.join(__dirname, "views", "feed.html"));
});

app.get("/create-project", function(req, res) {
    res.sendFile(path.join(__dirname, "views", "create-project.html"));
});

app.post("/create-project", upload.single("image"), async function(req, res) {

    const projectName = req.body.projectName;
    const description = req.body.description;
    const location = req.body.location;
    const category = req.body.category;
    const volunteers = req.body.volunteers;
    const contact = req.body.contact;


    let image = "";

    if (req.file) {
        image = "/uploads/" + req.file.filename;
    }
const newProject = {
    projectName: projectName,
    description: description,
    location: location,
    category: category,
    volunteers: Number(volunteers),
    contact: contact,
    image: image,
    joined: 0,
    createdBy: null
};

    await db.collection("projects").insertOne(newProject);

    res.json({ success: true });
});

// profile
app.get("/profile", function(req, res) {
    res.sendFile(path.join(__dirname, "views", "profile.html"));
});

// project details page
app.get("/join-project/:id", function(req, res) {
    res.sendFile(
        path.join(__dirname, "views", "join-project.html")
    );
});

app.get("/api/projects", async function(req, res) {

    const projects = await db.collection("projects").find().toArray();

    res.json(projects);
});
app.get("/api/profile/projects/created", async function(req, res) {

    try {

        const userId = getCurrentUser(req);

        if (!userId) {
            return res.status(401).json({
                error: "Not logged in"
            });
        }

        const projects = await db.collection("projects")
            .find({
                createdBy: new ObjectId(userId)
            })
            .toArray();

        res.json(projects);

    }
    catch (error) {

        console.log(error);

        res.status(500).json({
            error: "Could not load created projects"
        });
    }
});

// Get projects that the current user joined
app.get("/api/profile/projects/joined", async function(req, res) {

    try {

        // Check if user is logged in
        const userId = getCurrentUser(req);

        if (!userId) {
            return res.status(401).json({
                error: "Not logged in"
            });
        }

        // Find all projects where this user appears in joinedBy
        const projects = await db.collection("projects")
            .find({
                joinedBy: new ObjectId(userId)
            })
            .toArray();

        res.json(projects);

    }
    catch (error) {

        console.log(error);

        res.status(500).json({
            error: "Could not load joined projects"
        });
    }
});
// get one project
app.get("/api/projects/:id", async function(req, res) {

    try {
        const projectId = req.params.id;

        if (!ObjectId.isValid(projectId)) {
            return res.status(400).json({
                error: "Invalid project ID"
            });
        }

        const project = await db.collection("projects").findOne({
            _id: new ObjectId(projectId)
        });

        if (!project) {
            return res.status(404).json({
                error: "Project not found"
            });
        }

        res.json(project);
    }
    catch (error) {
        console.log(error);

        res.status(500).json({
            error: "Could not load project"
        });
    }
});

// join a project
app.post("/api/projects/:id/join", async function(req, res) {

    try {

        // Check if user is logged in
        const userId = getCurrentUser(req);

        if (!userId) {
            return res.status(401).json({
                error: "You must be logged in"
            });
        }

        const projectId = req.params.id;

        // Check if project ID is valid
        if (!ObjectId.isValid(projectId)) {
            return res.status(400).json({
                error: "Invalid project ID"
            });
        }

        // Find the project
        const project = await db.collection("projects").findOne({
            _id: new ObjectId(projectId)
        });

        if (!project) {
            return res.status(404).json({
                error: "Project not found"
            });
        }

        // Check if the user already joined
        const joinedBy = project.joinedBy || [];

        const alreadyJoined = joinedBy.some(
            id => id.toString() === userId.toString()
        );

        if (alreadyJoined) {
            return res.status(400).json({
                error: "You already joined this project"
            });
        }

        // Check if the project is full
        const currentJoined = project.joined || 0;

        if (currentJoined >= project.volunteers) {
            return res.status(400).json({
                error: "This project is already full"
            });
        }

        // Add the user to the project
        const result = await db.collection("projects").updateOne(
            {
                _id: new ObjectId(projectId)
            },
            {
                $inc: {
                    joined: 1
                },
                $addToSet: {
                    joinedBy: new ObjectId(userId)
                }
            }
        );

        if (result.modifiedCount === 0) {
            return res.status(400).json({
                error: "Could not join the project"
            });
        }

        // Get updated project
        const updatedProject =
            await db.collection("projects").findOne({
                _id: new ObjectId(projectId)
            });

        res.json({
            success: true,
            project: updatedProject
        });

    }
    catch (error) {

        console.log(error);

        res.status(500).json({
            error: "Could not join the project"
        });
    }
});

// cancel joining a project
app.post("/api/projects/:id/leave", async function(req, res) {

    try {
        const projectId = req.params.id;

        if (!ObjectId.isValid(projectId)) {
            return res.status(400).json({
                error: "Invalid project ID"
            });
        }

        const result = await db.collection("projects").updateOne(
            {
                _id: new ObjectId(projectId),
                joined: { $gt: 0 }
            },
            {
                $inc: {
                    joined: -1
                }
            }
        );

        if (result.modifiedCount === 0) {
            return res.status(400).json({
                error: "You are not joined to this project"
            });
        }

        const updatedProject = await db.collection("projects").findOne({
            _id: new ObjectId(projectId)
        });

        res.json({
            success: true,
            project: updatedProject
        });

    }
    catch (error) {

        console.log(error);

        res.status(500).json({
            error: "Could not cancel joining"
        });
    }
});
// delete a project
app.delete("/api/projects/:id", async function(req, res) {

    try {

        const userId = getCurrentUser(req);

        if (!userId) {
            return res.status(401).json({
                error: "You must be logged in"
            });
        }

        const projectId = req.params.id;

        if (!ObjectId.isValid(projectId)) {
            return res.status(400).json({
                error: "Invalid project ID"
            });
        }

        const project = await db.collection("projects").findOne({
            _id: new ObjectId(projectId)
        });

        if (!project) {
            return res.status(404).json({
                error: "Project not found"
            });
        }

        if (!project.createdBy ||
            project.createdBy.toString() !== userId.toString()) {

            return res.status(403).json({
                error: "You are not allowed to delete this project"
            });
        }

        await db.collection("projects").deleteOne({
            _id: new ObjectId(projectId)
        });

        res.json({
            success: true
        });

    }
    catch (error) {

        console.log(error);

        res.status(500).json({
            error: "Could not delete project"
        });

    }

});

app.listen(3000);
