const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../utils/db");
const axios = require("axios");

// Middleware: Token prüfen
function authenticateToken(req, res, next) {
    const authHeader = req.headers["authorization"];
    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).json({ error: "No token provided" });
    }

    jwt.verify(token, "SECRET123", (err, user) => {
        if (err) {
            return res.status(403).json({ error: "Invalid token" });
        }
        req.user = user;
        next();
    });
}
exports.authenticateToken = authenticateToken;


// REGISTER
exports.register = async (req, res) => {
    const { email, password } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email address" });
    }

    const hash = await bcrypt.hash(password, 10);

    try {
        const stmt = db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)");
        const result = stmt.run(email, hash);

        const token = jwt.sign({ id: result.lastInsertRowid }, "SECRET123", { expiresIn: "6h" });
        res.json({ token });

    } catch (err) {
        return res.status(400).json({ error: "User exists" });
    }
};


// LOGIN
exports.login = async (req, res) => {
    const { email, password } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email address" });
    }

    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(email);

    if (!user) return res.status(400).json({ error: "User not found" });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(400).json({ error: "Wrong password" });

    const token = jwt.sign({ id: user.id }, "SECRET123", { expiresIn: "6h" });
    res.json({ token });
};


// PASSWORT ÄNDERN
exports.changePassword = async (req, res) => {
    const { email, oldPassword, newPassword } = req.body;

    const user = db.prepare("SELECT * FROM users WHERE username = ?").get(email);

    if (!user) {
        return res.status(404).json({ error: "Benutzer nicht gefunden" });
    }

    const match = await bcrypt.compare(oldPassword, user.password_hash);
    if (!match) {
        return res.status(400).json({ error: "DAS AKTUELLE PASSWORT IST FALSCH." });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    db.prepare("UPDATE users SET password_hash = ? WHERE username = ?")
        .run(newHash, email);

    res.json({ message: "Erfolg!" });
};


// GITHUB REDIRECT
exports.githubRedirect = (req, res) => {
    const redirectUri = encodeURIComponent(process.env.GITHUB_REDIRECT_URI);

    const redirectUrl =
        "https://github.com/login/oauth/authorize" +
        "?client_id=" + process.env.GITHUB_CLIENT_ID +
        "&redirect_uri=" + redirectUri +
        "&scope=read:user user:email repo" +
        "&allow_signup=true";

    res.redirect(redirectUrl);
};


// GITHUB CALLBACK
exports.githubCallback = async (req, res) => {
    const code = req.query.code;

    try {
        const tokenResponse = await axios.post(
            "https://github.com/login/oauth/access_token",
            {
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code,
                redirect_uri: process.env.GITHUB_REDIRECT_URI
            },
            { headers: { Accept: "application/json" } }
        );

        const accessToken = tokenResponse.data.access_token;

        const userResponse = await axios.get("https://api.github.com/user", {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const emailResponse = await axios.get("https://api.github.com/user/emails", {
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const githubUser = {
            id: userResponse.data.id,
            name: userResponse.data.name,
            avatar: userResponse.data.avatar_url,
            email: emailResponse.data.find(e => e.primary)?.email,
            github_username: userResponse.data.login
        };

        return exports.githubLoginOrRegister(githubUser, res, accessToken);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "GitHub OAuth failed" });
    }
};


// GITHUB LOGIN / REGISTER
exports.githubLoginOrRegister = (githubUser, res, githubAccessToken) => {

    const user = db.prepare(
        "SELECT * FROM users WHERE provider = 'github' AND provider_user_id = ?"
    ).get(githubUser.id);

    // USER EXISTIERT
    if (user) {
        db.prepare("UPDATE users SET github_access_token = ?, github_username = ? WHERE id = ?")
            .run(githubAccessToken, githubUser.github_username, user.id);

        const token = jwt.sign({ id: user.id }, "SECRET123", { expiresIn: "6h" });

        return res.redirect(
            `${process.env.FRONTEND_URL}/login-success?token=${token}&github_username=${githubUser.github_username}`
        );
    }

    // USER EXISTIERT NICHT → ANLEGEN
    const stmt = db.prepare(
        "INSERT INTO users (provider, provider_user_id, username, email, avatar_url, github_access_token, github_username) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );

    const result = stmt.run(
        "github",
        githubUser.id,
        githubUser.name,
        githubUser.email,
        githubUser.avatar,
        githubAccessToken,
        githubUser.github_username
    );

    const token = jwt.sign({ id: result.lastInsertRowid }, "SECRET123", { expiresIn: "6h" });

    return res.redirect(
        `${process.env.FRONTEND_URL}/login-success?token=${token}&github_username=${githubUser.github_username}`
    );
};


// GITHUB REPOS
exports.getGithubRepos = async (req, res) => {
    const row = db.prepare("SELECT github_access_token FROM users WHERE id = ?")
        .get(req.user.id);

    if (!row || !row.github_access_token) {
        return res.status(400).json({ error: "No GitHub token stored" });
    }

    try {
        const repoResponse = await axios.get(
            "https://api.github.com/user/repos",
            {
                headers: {
                    Authorization: `Bearer ${row.github_access_token}`,
                    Accept: "application/vnd.github+json"
                }
            }
        );

        res.json(repoResponse.data);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "GitHub API error" });
    }
};


// ME
exports.me = (req, res) => {
    const user = db.prepare("SELECT id, username, email FROM users WHERE id = ?")
        .get(req.user.id);

    if (!user) return res.status(404).json({ error: "User not found" });

    const email = user.email || user.username;

    res.json({
        id: user.id,
        email,
        github_username: user.github_username
    });
};
