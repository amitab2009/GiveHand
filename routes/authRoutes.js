const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

router.get("/", authController.showHome);
router.get("/register", authController.showRegister);
router.post("/register", authController.register);
router.get("/check-username", authController.checkUsername);
router.get("/login", authController.showLogin);
router.post("/login", authController.login);
router.post("/logout", authController.logout);

module.exports = router;
