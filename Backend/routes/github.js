const express = require("express");
const router = express.Router();
const db = require("../utils/db");
const axios = require("axios");
const { authenticateToken } = require("../controllers/authController");
const USER_AGENT = "MyApp-" + Math.random().toString(36).substring(2, 10);

// Helper: get GitHub token
function getToken(userId) {
    const stmt = db.prepare("SELECT github_access_token FROM users WHERE id = ?");
    return stmt.get(userId);
}

// -----------------------------
// 1) Liste aller Repos
// -----------------------------
router.get("/repos", authenticateToken, async (req, res) => {
    try {
        const row = getToken(req.user.id);
        if (!row || !row.github_access_token)
            return res.status(400).json({ error: "No GitHub token stored" });

        const response = await axios.get("https://api.github.com/user/repos", {
            headers: {
                Authorization: `Bearer ${row.github_access_token}`,
                Accept: "application/vnd.github+json"
            }
        });

        res.json(response.data);
    } catch (e) {
        console.log("GitHub error:", e.response?.data || e.message);
        res.status(500).json({ error: "GitHub API error" });
    }
});

// -----------------------------
// 2) Dateien eines Repos
// -----------------------------
router.get("/repo-files", authenticateToken, async (req, res) => {
    const { repo, owner, path = "" } = req.query;

    if (!repo || !owner)
        return res.status(400).json({ error: "Missing repo or owner" });

    try {
        const row = getToken(req.user.id);
        if (!row || !row.github_access_token)
            return res.status(400).json({ error: "No GitHub token stored" });

        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
        const response = await axios.get(url, {
            headers: {
                Authorization: `Bearer ${row.github_access_token}`,
                Accept: "application/vnd.github+json"
            }
        });

        res.json(response.data);
    } catch (e) {
        console.log("GitHub error:", e.response?.data);
        res.status(500).json({ error: "GitHub API error" });
    }
});

// -----------------------------
// 3) Repo rekursiv laden
// -----------------------------
router.get("/repo-tree", authenticateToken, async (req, res) => {
    const { owner, repo } = req.query;

    if (!owner || !repo)
        return res.status(400).json({ error: "Missing owner or repo" });

    try {
        const row = getToken(req.user.id);
        if (!row || !row.github_access_token)
            return res.status(400).json({ error: "No GitHub token stored" });

        const token = row.github_access_token;

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

                    if (item._links && item._links.git) {
                        const blobRes = await axios.get(item._links.git, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        contentBase64 = blobRes.data.content;
                    } else {
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
    } catch (e) {
        res.status(500).json({ error: "GitHub API error" });
    }
});

// -----------------------------
// 4) Dateien eines Repos (root)
// -----------------------------
router.get("/files", authenticateToken, async (req, res) => {
    const { repo, owner } = req.query;

    if (!repo || !owner)
        return res.status(400).json({ error: "Missing repo or owner" });

    try {
        const row = getToken(req.user.id);
        if (!row) return res.status(400).json({ error: "No token" });

        const url = `https://api.github.com/repos/${owner}/${repo}/contents`;
        const response = await axios.get(url, {
            headers: { Authorization: `Bearer ${row.github_access_token}` }
        });

        res.json(response.data);
    } catch (e) {
        res.status(500).json({ error: "GitHub API error" });
    }
});

// -----------------------------
// 5) Einzelne Datei laden
// -----------------------------
router.get("/file", authenticateToken, async (req, res) => {
    const { repo, owner, path } = req.query;

    if (!repo || !owner || !path)
        return res.status(400).json({ error: "Missing repo, owner or path" });

    try {
        const row = getToken(req.user.id);
        if (!row) return res.status(400).json({ error: "No token" });

        const metaUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
        const metaRes = await axios.get(metaUrl, {
            headers: { Authorization: `Bearer ${row.github_access_token}` }
        });

        const isBinary = /\.(png|jpe?g|gif|svg|pdf)$/i.test(path);

        if (!metaRes.data._links.git.includes("/git/blobs/")) {
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
});

// -----------------------------
// 6) Textdatei speichern
// -----------------------------
router.post("/save-text", authenticateToken, async (req, res) => {
    const { repo, owner, path, content, message } = req.body;

    if (!repo || !owner || !path || content === undefined)
        return res.status(400).json({ error: "Missing fields" });

    try {
        const row = getToken(req.user.id);
        if (!row) return res.status(400).json({ error: "No token" });

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
});

// -----------------------------
// 7) Bild hochladen
// -----------------------------
router.post("/upload-image", authenticateToken, async (req, res) => {
    const { repo, owner, path, base64, message } = req.body;

    if (!repo || !owner || !path || !base64)
        return res.status(400).json({ error: "Missing fields" });

    try {
        const row = getToken(req.user.id);
        if (!row) return res.status(400).json({ error: "No token" });

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
                content: base64,
                sha
            },
            { headers: { Authorization: `Bearer ${row.github_access_token}` } }
        );

        res.json({ success: true, commit: response.data.commit });
    } catch (e) {
        console.log(e.response?.data);
        res.status(500).json({ error: "GitHub image upload failed" });
    }
});

// -----------------------------
// 8) Bild aktualisieren
// -----------------------------
router.post("/update-image", authenticateToken, async (req, res) => {
    const { repo, owner, path, base64, message } = req.body;

    if (!repo || !owner || !path || !base64)
        return res.status(400).json({ error: "Missing fields" });

    try {
        const row = getToken(req.user.id);
        if (!row) return res.status(400).json({ error: "No token" });

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
});

// -----------------------------
// 9) Datei erstellen
// -----------------------------
router.post("/create-file", authenticateToken, async (req, res) => {
    const { repo, owner, path, base64, message } = req.body;

    if (!repo || !owner || !path || !base64)
        return res.status(400).json({ error: "Missing fields" });

    try {
        const row = getToken(req.user.id);
        if (!row) return res.status(400).json({ error: "No token" });

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
});

// -----------------------------
// 10) Datei löschen
// -----------------------------
router.post("/delete-file", authenticateToken, async (req, res) => {
    const { repo, owner, path, message } = req.body;

    if (!repo || !owner || !path)
        return res.status(400).json({ error: "Missing fields" });

    try {
        const row = getToken(req.user.id);
        if (!row) return res.status(400).json({ error: "No token" });

        const fileInfo = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
            { headers: { Authorization: `Bearer ${row.github_access_token}` } }
        );

        const sha = fileInfo.data.sha;

        await axios.delete(
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
});

// -----------------------------
// 11) Ganzes Repo committen
// -----------------------------
router.post("/commit", authenticateToken, async (req, res) => {
    const { owner, repo, branch, files } = req.body;

    if (!owner || !repo || !branch || !files)
        return res.status(400).json({ error: "Missing fields" });

    try {
        const row = getToken(req.user.id);
        if (!row || !row.github_access_token)
            return res.status(400).json({ error: "No GitHub token stored" });

        const token = row.github_access_token;

        const refRes = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const latestCommitSha = refRes.data.object.sha;

        const commitRes = await axios.get(
            `https://api.github.com/repos/${owner}/${repo}/git/commits/${latestCommitSha}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const baseTreeSha = commitRes.data.tree.sha;

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

        const treeRes = await axios.post(
            `https://api.github.com/repos/${owner}/${repo}/git/trees`,
            {
                base_tree: baseTreeSha,
                tree
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );

        const commitRes2 = await axios.post(
            `https://api.github.com/repos/${owner}/${repo}/git/commits`,
            {
                message: "Update from Fragmented Synthesis Editor",
                tree: treeRes.data.sha,
                parents: [latestCommitSha]
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );

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
});

// -----------------------------
// 12) Neues Repo erstellen
// -----------------------------
router.post("/create-repo", authenticateToken, async (req, res) => {
    const { name, description = "", isPrivate = false } = req.body;

    if (!name)
        return res.status(400).json({ error: "Missing repository name" });

    try {
        const row = getToken(req.user.id);
        if (!row || !row.github_access_token)
            return res.status(400).json({ error: "No GitHub token stored" });

        const token = row.github_access_token;

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
});

module.exports = router;
