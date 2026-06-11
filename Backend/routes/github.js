const express = require("express");
const router = express.Router();
const db = require("../utils/db");
const axios = require("axios");
const { authenticateToken } = require("../controllers/authController");
const USER_AGENT = "MyApp-" + Math.random().toString(36).substring(2, 10);


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


// Komplettes Repo rekursiv laden
router.get("/repo-tree", authenticateToken, async (req, res) => {
    const { owner, repo } = req.query;

    if (!owner || !repo) {
        return res.status(400).json({ error: "Missing owner or repo" });
    }

    db.get(
        "SELECT github_access_token FROM users WHERE id = ?",
        [req.user.id],
        async (err, row) => {
            if (!row || !row.github_access_token) {
                return res.status(400).json({ error: "No GitHub token stored" });
            }

            const token = row.github_access_token;

            // Rekursive Funktion
            async function loadPath(path = "") {
                const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

                let response;
                try {
                    response = await axios.get(url, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                } catch (e) {
                    console.log("GitHub error:", e.response?.data);
                    return [];
                }

                const items = response.data;
                let result = [];

                for (const item of items) {
                    if (item.type === "dir") {
                        const children = await loadPath(item.path);
                        result = result.concat(children);
                    } else {
                        let contentBase64 = null;

                        // PRIVATE REPO → /git/blobs/:sha
                        if (item._links && item._links.git) {
                            const blobRes = await axios.get(item._links.git, {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            contentBase64 = blobRes.data.content;
                        } else {
                            // PUBLIC REPO → content direkt
                            contentBase64 = item.content;
                        }

                        result.push({
                            path: item.path,
                            content: contentBase64
                        });
                    }
                }

                return result;
            }

            const tree = await loadPath("");
            res.json(tree);
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
                        content,
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

// GANZES REPO committen
router.post("/commit", authenticateToken, (req, res) => {
    const { owner, repo, branch, files } = req.body;

    if (!owner || !repo || !branch || !files) {
        return res.status(400).json({ error: "Missing fields" });
    }

    db.get(
        "SELECT github_access_token FROM users WHERE id = ?",
        [req.user.id],
        async (err, row) => {
            if (!row || !row.github_access_token) {
                return res.status(400).json({ error: "No GitHub token stored" });
            }

            const token = row.github_access_token;

            try {
                //
                // 1) HEAD SHA holen
                //
                const refRes = await axios.get(
                    `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                const latestCommitSha = refRes.data.object.sha;

                //
                // 2) Commit holen → Tree SHA extrahieren
                //
                const commitRes = await axios.get(
                    `https://api.github.com/repos/${owner}/${repo}/git/commits/${latestCommitSha}`,
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                const baseTreeSha = commitRes.data.tree.sha;

                //
                // 3) Blobs für jede Datei erzeugen
                //
                const tree = [];

                for (const file of files) {
                    const blobRes = await axios.post(
                        `https://api.github.com/repos/${owner}/${repo}/git/blobs`,
                        {
                            content: file.content,
                            encoding: "base64"
                        },
                        { headers: { Authorization: `Bearer ${token}` } }
                    );

                    tree.push({
                        path: file.path,
                        mode: "100644",
                        type: "blob",
                        sha: blobRes.data.sha
                    });
                }

                //
                // 4) Neuen Tree erzeugen
                //
                const treeRes = await axios.post(
                    `https://api.github.com/repos/${owner}/${repo}/git/trees`,
                    {
                        base_tree: baseTreeSha,
                        tree
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                //
                // 5) Commit erzeugen
                //
                const commitRes2 = await axios.post(
                    `https://api.github.com/repos/${owner}/${repo}/git/commits`,
                    {
                        message: "Update from Fragmented Synthesis Editor",
                        tree: treeRes.data.sha,
                        parents: [latestCommitSha]
                    },
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                //
                // 6) Branch aktualisieren
                //
                await axios.patch(
                    `https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`,
                    { sha: commitRes2.data.sha },
                    { headers: { Authorization: `Bearer ${token}` } }
                );

                res.json({ success: true });
            } catch (e) {
                console.log("GitHub commit error:", e.response?.data);
                res.status(500).json({ error: "GitHub commit failed" });
            }
        }
    );
});

// Neues GitHub-Repository erstellen
router.post("/create-repo", authenticateToken, (req, res) => {
    const { name, description = "", isPrivate = false } = req.body;

    if (!name) {
        return res.status(400).json({ error: "Missing repository name" });
    }

    db.get(
        "SELECT github_access_token FROM users WHERE id = ?",
        [req.user.id],
        async (err, row) => {
            if (!row || !row.github_access_token) {
                return res.status(400).json({ error: "No GitHub token stored" });
            }

            const token = row.github_access_token;

            try {
                const response = await axios.post(
                    "https://api.github.com/user/repos",
                    {
                        name,
                        description,
                        private: isPrivate
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            Accept: "application/vnd.github+json",
                            "User-Agent": USER_AGENT
                        }

                    }
                );

                res.json({
                    success: true,
                    repo: response.data
                });
            } catch (e) {
                console.log("GitHub create repo error:", e.response?.data);
                res.status(500).json({ error: "GitHub create repo failed" });
            }
        }
    );
});

module.exports = router;
