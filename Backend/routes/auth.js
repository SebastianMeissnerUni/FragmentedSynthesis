const express = require("express");
const router = express.Router();
const {
    register,
    login,
    changePassword,
    githubRedirect,
    githubCallback,
    me,
    authenticateToken
} = require("../controllers/authController");


// Normaler Login
router.post("/register", register);
router.post("/login", login);
router.post("/change-password", changePassword);

// GitHub OAuth Login
router.get("/github", githubRedirect);
router.get("/github/callback", githubCallback);
router.get("/me", authenticateToken, me);

module.exports = router;
