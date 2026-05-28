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
router.get("/repo-files", authenticateToken, (req, res) => {
    const { repo, owner, path = "" } = req.query;

    if (!repo || !owner) {
        return res.status(400).json({ error: "Missing repo or owner" });
    }

    db.get(
        "SELECT github_access_token FROM users WHERE id = ?",
        [req.user.id],
        async (err, row) => {
            if (!row || !row.github_access_token) {
                return res.status(400).json({ error: "No GitHub token stored" });
            }

            try {
                const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
                const response = await axios.get(url, {
                    headers: {
                        Authorization: `Bearer ${row.github_access_token}`,
                        Accept: "application/vnd.github+json"
                    }
                });

                res.json(response.data);
            } catch (e) {
                console.log(e.response?.data);
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
                //
                // 1) Datei-Metadaten holen (liefert SHA)
                //
                const metaUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
                const metaRes = await axios.get(metaUrl, {
                    headers: { Authorization: `Bearer ${row.github_access_token}` }
                });

                const isBinary = /\.(png|jpe?g|gif|svg|pdf)$/i.test(path);

                //
                // 2) PUBLIC REPO → /contents API ist OK
                //
                if (!metaRes.data._links.git.includes("/git/blobs/")) {
                    // GitHub liefert content direkt
                    if (isBinary) {
                        return res.json({
                            name: metaRes.data.name,
                            path: metaRes.data.path,
                            content: metaRes.data.content
                        });
                    }

                    const text = Buffer.from(metaRes.data.content, "base64").toString("utf8");

                    return res.json({
                        name: metaRes.data.name,
                        path: metaRes.data.path,
                        content: text
                    });
                }

                //
                // 3) PRIVATE REPO → IMMER /git/blobs/:sha benutzen
                //
                const blobUrl = metaRes.data._links.git;
                const blobRes = await axios.get(blobUrl, {
                    headers: { Authorization: `Bearer ${row.github_access_token}` }
                });

                if (isBinary) {
                    return res.json({
                        name: metaRes.data.name,
                        path: metaRes.data.path,
                        content: blobRes.data.content
                    });
                }

                const text = Buffer.from(blobRes.data.content, "base64").toString("utf8");

                return res.json({
                    name: metaRes.data.name,
                    path: metaRes.data.path,
                    content: text
                });

            } catch (e) {
                console.log(e.response?.data);
                res.status(500).json({ error: "GitHub API error" });
            }
        }
    );
});

// Datei committen
router.post("/save-text", authenticateToken, (req, res) => {
    const { repo, owner, path, content, message } = req.body;

    if (!repo || !owner || !path || content === undefined) {
        return res.status(400).json({ error: "Missing fields" });
    }

    db.get(
        "SELECT github_access_token FROM users WHERE id = ?",
        [req.user.id],
        async (err, row) => {
            if (!row) return res.status(400).json({ error: "No token" });

            try {
                // SHA holen
                let sha = null;
                try {
                    const fileInfo = await axios.get(
                        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
                        { headers: { Authorization: `Bearer ${row.github_access_token}` } }
                    );
                    sha = fileInfo.data.sha;
                } catch (_) {
                    sha = null; // Datei existiert nicht → wird neu erstellt
                }

                // Commit
                const response = await axios.put(
                    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
                    {
                        message: message || "Update text file",
                        content: Buffer.from(content).toString("base64"),
                        sha
                    },
                    { headers: { Authorization: `Bearer ${row.github_access_token}` } }
                );

                res.json({ success: true, commit: response.data.commit });
            } catch (e) {
                console.log(e.response?.data);
                res.status(500).json({ error: "GitHub commit failed" });
            }
        }
    );
});

router.post("/upload-image", authenticateToken, (req, res) => {
    const { repo, owner, path, base64, message } = req.body;

    if (!repo || !owner || !path || !base64) {
        return res.status(400).json({ error: "Missing fields" });
    }

    db.get(
        "SELECT github_access_token FROM users WHERE id = ?",
        [req.user.id],
        async (err, row) => {
            if (!row) return res.status(400).json({ error: "No token" });

            try {
                // Datei existiert? SHA holen
                let sha = null;
                try {
                    const fileInfo = await axios.get(
                        `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
                        { headers: { Authorization: `Bearer ${row.github_access_token}` } }
                    );
                    sha = fileInfo.data.sha;
                } catch (_) {
                    sha = null;
                }

                const response = await axios.put(
                    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
                    {
                        message: message || "Upload image",
                        content: base64, // bereits Base64
                        sha
                    },
                    { headers: { Authorization: `Bearer ${row.github_access_token}` } }
                );

                res.json({ success: true, commit: response.data.commit });
            } catch (e) {
                console.log(e.response?.data);
                res.status(500).json({ error: "GitHub image upload failed" });
            }
        }
    );
});


router.post("/update-image", authenticateToken, (req, res) => {
    const { repo, owner, path, base64, message } = req.body;

    if (!repo || !owner || !path || !base64) {
        return res.status(400).json({ error: "Missing fields" });
    }

    db.get(
        "SELECT github_access_token FROM users WHERE id = ?",
        [req.user.id],
        async (err, row) => {
            if (!row) return res.status(400).json({ error: "No token" });

            try {
                const fileInfo = await axios.get(
                    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
                    { headers: { Authorization: `Bearer ${row.github_access_token}` } }
                );

                const sha = fileInfo.data.sha;

                const response = await axios.put(
                    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
                    {
                        message: message || "Update image",
                        content: base64,
                        sha
                    },
                    { headers: { Authorization: `Bearer ${row.github_access_token}` } }
                );

                res.json({ success: true, commit: response.data.commit });
            } catch (e) {
                console.log(e.response?.data);
                res.status(500).json({ error: "GitHub image update failed" });
            }
        }
    );
});

router.post("/create-file", authenticateToken, (req, res) => {
    const { repo, owner, path, base64, message } = req.body;

    if (!repo || !owner || !path || !base64) {
        return res.status(400).json({ error: "Missing fields" });
    }

    db.get(
        "SELECT github_access_token FROM users WHERE id = ?",
        [req.user.id],
        async (err, row) => {
            if (!row) return res.status(400).json({ error: "No token" });

            try {
                const response = await axios.put(
                    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
                    {
                        message: message || "Create new file",
                        content: base64
                    },
                    { headers: { Authorization: `Bearer ${row.github_access_token}` } }
                );

                res.json({ success: true, commit: response.data.commit });
            } catch (e) {
                console.log(e.response?.data);
                res.status(500).json({ error: "GitHub create file failed" });
            }
        }
    );
});

router.post("/delete-file", authenticateToken, (req, res) => {
    const { repo, owner, path, message } = req.body;

    if (!repo || !owner || !path) {
        return res.status(400).json({ error: "Missing fields" });
    }

    db.get(
        "SELECT github_access_token FROM users WHERE id = ?",
        [req.user.id],
        async (err, row) => {
            if (!row) return res.status(400).json({ error: "No token" });

            try {
                const fileInfo = await axios.get(
                    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
                    { headers: { Authorization: `Bearer ${row.github_access_token}` } }
                );

                const sha = fileInfo.data.sha;

                const response = await axios.delete(
                    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
                    {
                        headers: { Authorization: `Bearer ${row.github_access_token}` },
                        data: {
                            message: message || "Delete file",
                            sha
                        }
                    }
                );

                res.json({ success: true });
            } catch (e) {
                console.log(e.response?.data);
                res.status(500).json({ error: "GitHub delete failed" });
            }
        }
    );
});
module.exports = router;
