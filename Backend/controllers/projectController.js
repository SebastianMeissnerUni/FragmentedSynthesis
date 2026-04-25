const db = require("../utils/db");
const jwt = require("jsonwebtoken");

// Hilfsfunktion: User-ID aus JWT holen
function getUserIdFromRequest(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader) return null;

    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, "SECRET123");
        return decoded.id;
    } catch (err) {
        return null;
    }
}

// 1) Neues Projekt anlegen
exports.createProject = (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { title, content } = req.body;

    db.run(
        "INSERT INTO projects (user_id, title, content, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))",
        [userId, title, content],
        function (err) {
            if (err) return res.status(500).json({ error: "DB error" });

            res.json({
                message: "Projekt erstellt",
                projectId: this.lastID
            });
        }
    );
};

// 2) Projekt aktualisieren
exports.updateProject = (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { projectId, content, title } = req.body;

    db.run(
        "UPDATE projects SET title = ?, content = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?",
        [title, content, projectId, userId],
        function (err) {
            if (err) return res.status(500).json({ error: "DB error" });

            if (this.changes === 0) {
                return res.status(404).json({ error: "Projekt nicht gefunden" });
            }

            res.json({ message: "Projekt aktualisiert" });
        }
    );
};

// 3) Alle Projekte eines Users abrufen
exports.listProjects = (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    db.all(
        "SELECT id, title, created_at, updated_at FROM projects WHERE user_id = ?",
        [userId],
        (err, rows) => {
            if (err) return res.status(500).json({ error: "DB error" });

            res.json(rows);
        }
    );
};

// 4) Einzelnes Projekt abrufen
exports.getProject = (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const projectId = req.params.id;

    db.get(
        "SELECT * FROM projects WHERE id = ? AND user_id = ?",
        [projectId, userId],
        (err, row) => {
            if (err) return res.status(500).json({ error: "DB error" });

            if (!row) return res.status(404).json({ error: "Projekt nicht gefunden" });

            res.json(row);
        }
    );
};