const express = require("express");
const projectController = require("../controllers/projectController");
const requireAuth = require("../middleware/auth");
const { upload } = require("../middleware/upload");

const router = express.Router();
const mustBeLoggedIn = requireAuth("You must be logged in");

router.get("/feed", projectController.showFeed);
router.get("/statistics", projectController.showStatistics);
router.get("/edit-project/:id", projectController.showEditProject);
router.get("/create-project", projectController.showCreateProject);
router.get("/join-project/:id", projectController.showJoinProject);

router.post(
    "/create-project",
    mustBeLoggedIn,
    upload.single("image"),
    projectController.createProject
);
router.get("/api/projects", projectController.getProjects);
router.get("/api/projects/:id", projectController.getProject);
router.post("/api/projects/:id/join", mustBeLoggedIn, projectController.joinProject);
router.post("/api/projects/:id/leave", mustBeLoggedIn, projectController.leaveProject);
router.put(
    "/api/projects/:id",
    mustBeLoggedIn,
    upload.single("image"),
    projectController.updateProject
);
router.delete("/api/projects/:id", mustBeLoggedIn, projectController.deleteProject);
router.get(
    "/api/statistics/projects-by-category",
    projectController.projectsByCategory
);
router.get(
    "/api/statistics/volunteers-by-category",
    projectController.volunteersByCategory
);

module.exports = router;
