const express = require("express");
const router = express.Router();
const db = require("../utils/db");
const axios = require("axios");
const { authenticateToken } = require("../controllers/authController");

// Liste aller Repos
router.get("/repos", authenticateToken, (req, res) => {
    db.get(
        "SELECT github_access_token FROM users WHERE id = ?",
        [req.user.id],
        async (err, row) => {
            if (!row || !row.github_access_token) {
                return res.status(400).json({ error: "No GitHub token stored" });
            }

            try {
                const response = await axios.get("https://api.github.com/user/repos", {
                    headers: {
                        Authorization: `Bearer ${row.github_access_token}`,
                        Accept: "application/vnd.github+json"
                    }
                });

                res.json(response.data);
            } catch (e) {
                res.status(500).json({ error: "GitHub API error" });
            }
        }
    );
});

// Dateien eines Repos
router.get("/files", authenticateToken, (req, res) => {
    const { repo, owner } = req.query;

    if (!repo || !owner) {
        return res.status(400).json({ error: "Missing repo or owner" });
    }

    db.get(
        "SELECT github_access_token FROM users WHERE id = ?",
        [req.user.id],
        async (err, row) => {
            if (!row) return res.status(400).json({ error: "No token" });

            try {
                const url = `https://api.github.com/repos/${owner}/${repo}/contents`;
                const response = await axios.get(url, {
                    headers: { Authorization: `Bearer ${row.github_access_token}` }
                });

                res.json(response.data);
            } catch (e) {
                res.status(500).json({ error: "GitHub API error" });
            }
        }
    );
});

// einzelne Datei laden
router.get("/file", authenticateToken, (req, res) => {
    const { repo, owner, path } = req.query;

    if (!repo || !owner || !path) {
        return res.status(400).json({ error: "Missing repo, owner or path" });
    }

    db.get(
        "SELECT github_access_token FROM users WHERE id = ?",
        [req.user.id],
        async (err, row) => {
            if (!row) return res.status(400).json({ error: "No token" });

            try {
                const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
                const response = await axios.get(url, {
                    headers: { Authorization: `Bearer ${row.github_access_token}` }
                });

                const content = Buffer.from(response.data.content, "base64").toString("utf8");

                res.json({
                    name: response.data.name,
                    path: response.data.path,
                    content
                });
            } catch (e) {
                res.status(500).json({ error: "GitHub API error" });
            }
        }
    );
});

// Datei committen
router.post("/save", authenticateToken, (req, res) => {
    const { repo, owner, path, content, message } = req.body;

    if (!repo || !owner || !path || !content) {
        return res.status(400).json({ error: "Missing fields" });
    }

    db.get(
        "SELECT github_access_token FROM users WHERE id = ?",
        [req.user.id],
        async (err, row) => {
            if (!row) return res.status(400).json({ error: "No token" });

            try {
                // 1) SHA der Datei holen
                const fileInfo = await axios.get(
                    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
                    { headers: { Authorization: `Bearer ${row.github_access_token}` } }
                );

                const sha = fileInfo.data.sha;

                // 2) Datei committen
                const response = await axios.put(
                    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
                    {
                        message: message || "Update from Fragmented Synthesis",
                        content: Buffer.from(content).toString("base64"),
                        sha
                    },
                    { headers: { Authorization: `Bearer ${row.github_access_token}` } }
                );

                res.json({ success: true, commit: response.data.commit });
            } catch (e) {
                res.status(500).json({ error: "GitHub commit failed" });
            }
        }
    );
});

// GANZ AM ENDE
module.exports = router;
