
const express = require("express");
const router = express.Router();
// Hier das changePassword mit in die Klammern aufnehmen!
const { register, login, changePassword } = require("../controllers/authController");

router.post("/register", register);
router.post("/login", login);
router.post("/change-password", changePassword);

module.exports = router;
