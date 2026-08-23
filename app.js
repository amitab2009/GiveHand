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
        joined: 0
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
        const projectId = req.params.id;

        if (!ObjectId.isValid(projectId)) {
            return res.status(400).json({
                error: "Invalid project ID"
            });
        }

        const result = await db.collection("projects").updateOne(
            {
                _id: new ObjectId(projectId),

                $expr: {
                    $lt: [
                        { $ifNull: ["$joined", 0] },
                        "$volunteers"
                    ]
                }
            },
            {
                $inc: {
                    joined: 1
                }
            }
        );

        if (result.modifiedCount === 0) {

            const project = await db.collection("projects").findOne({
                _id: new ObjectId(projectId)
            });

            if (!project) {
                return res.status(404).json({
                    error: "Project not found"
                });
            }

            return res.status(400).json({
                error: "This project is already full"
            });
        }

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


app.listen(3000);
