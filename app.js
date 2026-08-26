require("dotenv").config();
const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { MongoClient, ObjectId } = require("mongodb");
const express = require("express");
const path = require("path");
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
const app = express();
const session = require("express-session");
const { MongoStore } = require("connect-mongo");
const upload = multer({
    storage: multer.memoryStorage()
});


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


function uploadImage(fileBuffer) {

    return new Promise(function(resolve, reject) {

        const stream = cloudinary.uploader.upload_stream(
            {
                folder: "givehand"
            },
            function(error, result) {

                if (error) {
                    reject(error);
                }
                else {
                    resolve(result);
                }

            }
        );

        stream.end(fileBuffer);

    });
}


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


app.use(express.urlencoded({
    extended: true
}));


app.use(express.json());


app.use(express.static("public"));



app.get("/", function(req, res) {

    res.sendFile(
        path.join(
            __dirname,
            "views",
            "home.html"
        )
    );

});



// register

app.get("/register", function(req, res) {

    res.sendFile(
        path.join(
            __dirname,
            "views",
            "register.html"
        )
    );

});


app.post("/register", async function(req, res) {

    const fullName =
        req.body.fullName;

    const email =
        req.body.email;

    const username =
        req.body.username;

    const password =
        req.body.password;


    if (fullName.length < 2) {

        return res.json({
            error: "name"
        });

    }


    if (
        !email.includes("@") ||
        !email.includes(".")
    ) {

        return res.json({
            error: "email"
        });

    }


    if (password.length < 6) {

        return res.json({
            error: "passwordLength"
        });

    }


    if (!/[A-Z]/.test(password)) {

        return res.json({
            error: "passwordUppercase"
        });

    }


    const existingUser =
        await db.collection("users").findOne({

            username: username

        });


    if (existingUser) {

        return res.json({
            error: "username"
        });

    }


    const newUser = {

        fullName: fullName,

        email: email,

        username: username,

        password: password,

        profileImage: ""

    };


    await db.collection("users").insertOne(
        newUser
    );


    req.session.userId =
        newUser._id.toString();


    res.json({
        success: true
    });

});



app.get("/check-username", async function(req, res) {

    const username =
        req.query.username;


    const existingUser =
        await db.collection("users").findOne({

            username: username

        });


    res.json({

        exists:
            existingUser !== null

    });

});



// login

app.get("/login", function(req, res) {

    res.sendFile(
        path.join(
            __dirname,
            "views",
            "login.html"
        )
    );

});


app.post("/login", async function(req, res) {

    const username =
        req.body.username;

    const password =
        req.body.password;


    const user =
        await db.collection("users").findOne({

            username: username

        });


    if (!user) {

        return res.json({
            error: "user"
        });

    }


    if (user.password !== password) {

        return res.json({
            error: "password"
        });

    }


    req.session.userId =
        user._id.toString();


    res.json({
        success: true
    });

});



// logout

app.post("/logout", function(req, res) {

    req.session.destroy(function(error) {

        if (error) {

            return res.status(500).json({
                error: "Could not log out"
            });

        }


        res.clearCookie("connect.sid");


        res.json({
            success: true
        });

    });

});



// get profile

app.get("/api/profile", async function(req, res) {

    try {

        const userId =
            req.session.userId;


        if (!userId) {

            return res.status(401).json({
                error: "Not logged in"
            });

        }


        const user =
            await db.collection("users").findOne(

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



// edit profile

app.put(
    "/api/profile",
    upload.single("profileImage"),
    async function(req, res) {

        try {

            const userId =
                req.session.userId;


            if (!userId) {

                return res.status(401).json({
                    error: "Not logged in"
                });

            }


            const user =
                await db.collection("users").findOne({

                    _id: new ObjectId(userId)

                });


            if (!user) {

                return res.status(404).json({
                    error: "User not found"
                });

            }


            const fullName =
                req.body.fullName;

            const email =
                req.body.email;


            if (
                !fullName ||
                fullName.trim().length < 2
            ) {

                return res.status(400).json({
                    error: "Please enter a valid full name"
                });

            }


            if (
                !email ||
                !email.includes("@") ||
                !email.includes(".")
            ) {

                return res.status(400).json({
                    error: "Please enter a valid email"
                });

            }


            let profileImage =
                user.profileImage || "";


            if (req.file) {

                const uploadedImage =
                    await uploadImage(
                        req.file.buffer
                    );


                profileImage =
                    uploadedImage.secure_url;

            }


            await db.collection("users").updateOne(

                {
                    _id: new ObjectId(userId)
                },

                {
                    $set: {

                        fullName:
                            fullName.trim(),

                        email:
                            email.trim(),

                        profileImage:
                            profileImage

                    }
                }

            );


            const updatedUser =
                await db.collection("users").findOne(

                    {
                        _id: new ObjectId(userId)
                    },

                    {
                        projection: {
                            password: 0
                        }
                    }

                );


            res.json({

                success: true,

                user: updatedUser

            });

        }
        catch (error) {

            console.log(error);


            res.status(500).json({
                error: "Could not update profile"
            });

        }

    }
);



// feed

app.get("/feed", function(req, res) {

    res.sendFile(
        path.join(
            __dirname,
            "views",
            "feed.html"
        )
    );

});



// edit project page

app.get("/edit-project/:id", function(req, res) {

    res.sendFile(
        path.join(
            __dirname,
            "views",
            "edit-project.html"
        )
    );

});



// create project page

app.get("/create-project", function(req, res) {

    res.sendFile(
        path.join(
            __dirname,
            "views",
            "create-project.html"
        )
    );

});



// create project

app.post(
    "/create-project",
    upload.single("image"),
    async function(req, res) {

        try {

            const userId =
                req.session.userId;


            if (!userId) {

                return res.status(401).json({
                    error: "You must be logged in"
                });

            }


            const user =
                await db.collection("users").findOne({

                    _id: new ObjectId(userId)

                });


            if (!user) {

                return res.status(404).json({
                    error: "User not found"
                });

            }


            const projectName =
                req.body.projectName;

            const description =
                req.body.description;

            const location =
                req.body.location;

            const category =
                req.body.category;

            const volunteers =
                req.body.volunteers;

            const contact =
                req.body.contact;


            let image = "";


            if (req.file) {

                const uploadedImage =
                    await uploadImage(
                        req.file.buffer
                    );


                image =
                    uploadedImage.secure_url;

            }


            const newProject = {

                projectName:
                    projectName,

                description:
                    description,

                location:
                    location,

                category:
                    category,

                volunteers:
                    Number(volunteers),

                contact:
                    contact,

                image:
                    image,

                joined:
                    0,

                joinedBy:
                    [],

                createdBy:
                    new ObjectId(userId),

                createdByUsername:
                    user.username

            };


            await db.collection("projects").insertOne(
                newProject
            );


            res.json({
                success: true
            });

        }
        catch (error) {

            console.log(error);


            res.status(500).json({
                error: "Could not create project"
            });

        }

    }
);



// profile page

app.get("/profile", function(req, res) {

    res.sendFile(
        path.join(
            __dirname,
            "views",
            "profile.html"
        )
    );

});



// project details page

app.get("/join-project/:id", function(req, res) {

    res.sendFile(
        path.join(
            __dirname,
            "views",
            "join-project.html"
        )
    );

});



// get all projects

app.get("/api/projects", async function(req, res) {

    const userId =
        req.session.userId;


    const projects =
        await db.collection("projects")
            .find()
            .toArray();


    const projectsWithUserStatus =
        projects.map(function(project) {

            const joinedBy =
                project.joinedBy || [];


            const currentUserJoined =
                !!userId &&
                joinedBy.some(function(id) {

                    return (
                        id.toString() ===
                        userId.toString()
                    );

                });


            return {

                ...project,

                currentUserJoined:
                    currentUserJoined

            };

        });


    res.json(
        projectsWithUserStatus
    );

});



// created projects

app.get(
    "/api/profile/projects/created",
    async function(req, res) {

        try {

            const userId =
                req.session.userId;


            if (!userId) {

                return res.status(401).json({
                    error: "Not logged in"
                });

            }


            const projects =
                await db.collection("projects")
                    .find({

                        createdBy:
                            new ObjectId(userId)

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

    }
);



// joined projects

app.get(
    "/api/profile/projects/joined",
    async function(req, res) {

        try {

            const userId =
                req.session.userId;


            if (!userId) {

                return res.status(401).json({
                    error: "Not logged in"
                });

            }


            const projects =
                await db.collection("projects")
                    .find({

                        joinedBy:
                            new ObjectId(userId)

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

    }
);



// get one project

app.get("/api/projects/:id", async function(req, res) {

    try {

        const projectId =
            req.params.id;


        if (!ObjectId.isValid(projectId)) {

            return res.status(400).json({
                error: "Invalid project ID"
            });

        }


        const project =
            await db.collection("projects").findOne({

                _id:
                    new ObjectId(projectId)

            });


        if (!project) {

            return res.status(404).json({
                error: "Project not found"
            });

        }


        const userId =
            req.session.userId;


        let isOwner =
            false;


        if (
            userId &&
            project.createdBy
        ) {

            isOwner =

                project.createdBy.toString() ===
                userId.toString();

        }


        let currentUserJoined =
            false;


        if (userId) {

            const joinedBy =
                project.joinedBy || [];


            currentUserJoined =
                joinedBy.some(function(id) {

                    return (
                        id.toString() ===
                        userId.toString()
                    );

                });

        }


        res.json({

            ...project,

            currentUserJoined:
                currentUserJoined,

            isOwner:
                isOwner

        });

    }
    catch (error) {

        console.log(error);


        res.status(500).json({
            error: "Could not load project"
        });

    }

});



// join a project

app.post(
    "/api/projects/:id/join",
    async function(req, res) {

        try {

            const userId =
                req.session.userId;


            if (!userId) {

                return res.status(401).json({
                    error: "You must be logged in"
                });

            }


            const projectId =
                req.params.id;


            if (!ObjectId.isValid(projectId)) {

                return res.status(400).json({
                    error: "Invalid project ID"
                });

            }


            const project =
                await db.collection("projects").findOne({

                    _id:
                        new ObjectId(projectId)

                });


            if (!project) {

                return res.status(404).json({
                    error: "Project not found"
                });

            }


            const joinedBy =
                project.joinedBy || [];


            const alreadyJoined =
                joinedBy.some(function(id) {

                    return (
                        id.toString() ===
                        userId.toString()
                    );

                });


            if (alreadyJoined) {

                return res.status(400).json({
                    error: "You already joined this project"
                });

            }


            const currentJoined =
                project.joined || 0;


            if (
                currentJoined >=
                project.volunteers
            ) {

                return res.status(400).json({
                    error: "This project is already full"
                });

            }


            const result =
                await db.collection("projects").updateOne(

                    {
                        _id:
                            new ObjectId(projectId)
                    },

                    {
                        $inc: {

                            joined:
                                1

                        },

                        $addToSet: {

                            joinedBy:
                                new ObjectId(userId)

                        }
                    }

                );


            if (result.modifiedCount === 0) {

                return res.status(400).json({
                    error: "Could not join the project"
                });

            }


            const updatedProject =
                await db.collection("projects").findOne({

                    _id:
                        new ObjectId(projectId)

                });


            res.json({

                success: true,

                project:
                    updatedProject

            });

        }
        catch (error) {

            console.log(error);


            res.status(500).json({
                error: "Could not join the project"
            });

        }

    }
);



// cancel joining a project

app.post(
    "/api/projects/:id/leave",
    async function(req, res) {

        try {

            const userId =
                req.session.userId;


            if (!userId) {

                return res.status(401).json({
                    error: "You must be logged in"
                });

            }


            const projectId =
                req.params.id;


            if (!ObjectId.isValid(projectId)) {

                return res.status(400).json({
                    error: "Invalid project ID"
                });

            }


            const project =
                await db.collection("projects").findOne({

                    _id:
                        new ObjectId(projectId)

                });


            if (!project) {

                return res.status(404).json({
                    error: "Project not found"
                });

            }


            const joinedBy =
                project.joinedBy || [];


            const alreadyJoined =
                joinedBy.some(function(id) {

                    return (
                        id.toString() ===
                        userId.toString()
                    );

                });


            if (!alreadyJoined) {

                return res.status(400).json({
                    error: "You are not joined to this project"
                });

            }


            await db.collection("projects").updateOne(

                {
                    _id:
                        new ObjectId(projectId)
                },

                {
                    $inc: {

                        joined:
                            -1

                    },

                    $pull: {

                        joinedBy:
                            new ObjectId(userId)

                    }
                }

            );


            const updatedProject =
                await db.collection("projects").findOne({

                    _id:
                        new ObjectId(projectId)

                });


            res.json({

                success: true,

                project:
                    updatedProject

            });

        }
        catch (error) {

            console.log(error);


            res.status(500).json({
                error: "Could not cancel joining"
            });

        }

    }
);



// edit a project

app.put(
    "/api/projects/:id",
    upload.single("image"),
    async function(req, res) {

        try {

            const userId =
                req.session.userId;


            if (!userId) {

                return res.status(401).json({
                    error: "You must be logged in"
                });

            }


            const projectId =
                req.params.id;


            if (!ObjectId.isValid(projectId)) {

                return res.status(400).json({
                    error: "Invalid project ID"
                });

            }


            const project =
                await db.collection("projects").findOne({

                    _id:
                        new ObjectId(projectId)

                });


            if (!project) {

                return res.status(404).json({
                    error: "Project not found"
                });

            }


            if (
                !project.createdBy ||
                project.createdBy.toString() !==
                userId.toString()
            ) {

                return res.status(403).json({
                    error: "You are not allowed to edit this project"
                });

            }


            const projectName =
                req.body.projectName;

            const description =
                req.body.description;

            const location =
                req.body.location;

            const category =
                req.body.category;

            const volunteers =
                Number(
                    req.body.volunteers
                );


            const currentJoined =
                project.joined || 0;


            if (
                volunteers <
                currentJoined
            ) {

                return res.status(400).json({

                    error:
                        "You already have " +
                        currentJoined +
                        " volunteers joined. The number of volunteers needed cannot be lower than that."

                });

            }


            const contact =
                req.body.contact;


            let image =
                project.image || "";


            if (req.file) {

                const uploadedImage =
                    await uploadImage(
                        req.file.buffer
                    );


                image =
                    uploadedImage.secure_url;

            }


            await db.collection("projects").updateOne(

                {
                    _id:
                        new ObjectId(projectId)
                },

                {
                    $set: {

                        projectName:
                            projectName,

                        description:
                            description,

                        location:
                            location,

                        category:
                            category,

                        volunteers:
                            volunteers,

                        contact:
                            contact,

                        image:
                            image

                    }
                }

            );


            const updatedProject =
                await db.collection("projects").findOne({

                    _id:
                        new ObjectId(projectId)

                });


            res.json({

                success: true,

                project:
                    updatedProject

            });

        }
        catch (error) {

            console.log(error);


            res.status(500).json({
                error: "Could not edit project"
            });

        }

    }
);



// delete a project

app.delete(
    "/api/projects/:id",
    async function(req, res) {

        try {

            const userId =
                req.session.userId;


            if (!userId) {

                return res.status(401).json({
                    error: "You must be logged in"
                });

            }


            const projectId =
                req.params.id;


            if (!ObjectId.isValid(projectId)) {

                return res.status(400).json({
                    error: "Invalid project ID"
                });

            }


            const project =
                await db.collection("projects").findOne({

                    _id:
                        new ObjectId(projectId)

                });


            if (!project) {

                return res.status(404).json({
                    error: "Project not found"
                });

            }


            if (
                !project.createdBy ||
                project.createdBy.toString() !==
                userId.toString()
            ) {

                return res.status(403).json({
                    error: "You are not allowed to delete this project"
                });

            }


            await db.collection("projects").deleteOne({

                _id:
                    new ObjectId(projectId)

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

    }
);


app.listen(3000);