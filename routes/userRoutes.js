const express = require("express");
const userController = require("../controllers/userController");
const requireAuth = require("../middleware/auth");
const { upload } = require("../middleware/upload");

const router = express.Router();

router.get("/profile", userController.showProfile);

router.get(
    "/api/profile",
    requireAuth("Not logged in"),
    userController.getProfile
);
router.put(
    "/api/profile",
    requireAuth("Not logged in"),
    upload.single("profileImage"),
    userController.updateProfile
);
router.get(
    "/api/profile/projects/created",
    requireAuth("Not logged in"),
    userController.getCreatedProjects
);
router.get(
    "/api/profile/projects/joined",
    requireAuth("Not logged in"),
    userController.getJoinedProjects
);
router.get(
    "/api/profile/groups/created",
    requireAuth("Not logged in"),
    userController.getCreatedGroups
);
router.get(
    "/api/profile/groups/joined",
    requireAuth("Not logged in"),
    userController.getJoinedGroups
);

module.exports = router;
