const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../utils/db");
const axios = require("axios");

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



exports.register = async (req, res) => {
    const { email, password } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email address" });
    }

    const hash = await bcrypt.hash(password, 10);

    db.run(
        "INSERT INTO users (username, password_hash) VALUES (?, ?)",
        [email, hash],
        function (err) {
            if (err) return res.status(400).json({ error: "User exists" });

            // Token erzeugen
            const token = jwt.sign(
                { id: this.lastID },
                "SECRET123",
                { expiresIn: "1h" }
            );

            // Token zurückgeben
            res.json({ token });
        }
    );
};


exports.login = (req, res) => {

    const { email, password } = req.body;

    // Email-Check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email address" });
    }

    db.get(
        "SELECT * FROM users WHERE username = ?",
        [email],
        async (err, user) => {
            if (!user) return res.status(400).json({ error: "User not found" });

            const match = await bcrypt.compare(password, user.password_hash);
            if (!match) return res.status(400).json({ error: "Wrong password" });

            const token = jwt.sign({ id: user.id }, "SECRET123", { expiresIn: "1h" });

            res.json({ token });
        }
    );

};

exports.changePassword = async (req, res) => {
    const { email, oldPassword, newPassword } = req.body;

    console.log("--- PASSWORT-CHECK START ---");
    console.log("Suche User mit Email:", email);
    console.log("Eingegebenes altes Passwort:", oldPassword);

    db.get("SELECT * FROM users WHERE username = ?", [email], async (err, user) => {
        if (err) {
            console.error("Datenbankfehler:", err);
            return res.status(500).json({ error: "DB Error" });
        }

        if (!user) {
            console.log("FEHLER: Kein User mit dieser Email in der DB gefunden.");
            return res.status(404).json({ error: "Benutzer nicht gefunden" });
        }

        console.log("User in DB gefunden. Vergleiche jetzt mit Bcrypt...");

        const match = await bcrypt.compare(oldPassword, user.password_hash);
        console.log("Stimmt das Passwort überein?:", match);

        if (!match) {
            return res.status(400).json({ error: "DAS AKTUELLE PASSWORT IST FALSCH." });
        }

        // ... ab hier kommt dein UPDATE Befehl
        const newHash = await bcrypt.hash(newPassword, 10);
        db.run("UPDATE users SET password_hash = ? WHERE username = ?", [newHash, email], (err) => {
            res.json({ message: "Erfolg!" });
        });
    });
};

// 1) User zu GitHub weiterleiten
exports.githubRedirect = (req, res) => {
    const redirectUrl =
        "https://github.com/login/oauth/authorize" +
        "?client_id=" + process.env.GITHUB_CLIENT_ID +
        "&redirect_uri=" + process.env.GITHUB_REDIRECT_URI +
        "&scope=read:user user:email";

    res.redirect(redirectUrl);
};

// 2) GitHub schickt Code zurück -> Token holen -> Userdaten holen
exports.githubCallback = async (req, res) => {
    const code = req.query.code;

    try {
        // Access Token holen
        const tokenResponse = await axios.post(
            "https://github.com/login/oauth/access_token",
            {
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code
            },
            { headers: { Accept: "application/json" } }
        );

        const accessToken = tokenResponse.data.access_token;

        // GitHub Userdaten holen
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
            email: emailResponse.data.find(e => e.primary)?.email
        };

        // Weiter zur Login/Registrierung
        return exports.githubLoginOrRegister(githubUser, res);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "GitHub OAuth failed" });
    }
};

// 3) User in DB anlegen oder einloggen
exports.githubLoginOrRegister = (githubUser, res) => {
    db.get(
        "SELECT * FROM users WHERE provider = 'github' AND provider_user_id = ?",
        [githubUser.id],
        (err, user) => {
            if (user) {
                // User existiert → JWT erzeugen
                const token = jwt.sign({ id: user.id }, "SECRET123", { expiresIn: "1h" });
                return res.redirect(`http://localhost:5173/login-success?token=${token}`);
            }

            // User existiert nicht → anlegen
            db.run(
                "INSERT INTO users (provider, provider_user_id, username, email, avatar_url) VALUES (?, ?, ?, ?, ?)",
                ["github", githubUser.id, githubUser.name, githubUser.email, githubUser.avatar],
                function (err) {
                    if (err) return res.status(500).json({ error: "DB error" });

                    const token = jwt.sign({ id: this.lastID }, "SECRET123", { expiresIn: "1h" });

                    return res.redirect(`http://localhost:5173/login-success?token=${token}`);
                }
            );
        }
    );
};

exports.me = (req, res) => {
    db.get(
        "SELECT id, username, email FROM users WHERE id = ?",
        [req.user.id],
        (err, user) => {
            if (err) return res.status(500).json({ error: "DB error" });
            if (!user) return res.status(404).json({ error: "User not found" });

            // Lokale User: username = E-Mail
            // GitHub User: email = echte GitHub-Mail
            const email = user.email || user.username;

            res.json({
                id: user.id,
                email
            });
        }
    );
};

