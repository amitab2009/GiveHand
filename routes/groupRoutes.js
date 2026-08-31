const express = require("express");
const groupController = require("../controllers/groupController");
const requireAuth = require("../middleware/auth");

const router = express.Router();
const mustBeLoggedIn = requireAuth("You must be logged in");

router.get("/groups", groupController.showGroups);
router.get("/edit-group/:id", mustBeLoggedIn, groupController.showEditGroup);
router.get("/api/groups", mustBeLoggedIn, groupController.getGroups);
router.get("/api/groups/:id", mustBeLoggedIn, groupController.getGroup);
router.post("/api/groups", mustBeLoggedIn, groupController.createGroup);
router.put("/api/groups/:id", mustBeLoggedIn, groupController.updateGroup);
router.post("/api/groups/:id/join", mustBeLoggedIn, groupController.joinGroup);
router.post("/api/groups/:id/leave", mustBeLoggedIn, groupController.leaveGroup);
router.delete("/api/groups/:id", mustBeLoggedIn, groupController.deleteGroup);
router.get("/api/groups/:id/messages", mustBeLoggedIn, groupController.getMessages);
router.post("/api/groups/:id/messages", mustBeLoggedIn, groupController.sendMessage);

module.exports = router;
