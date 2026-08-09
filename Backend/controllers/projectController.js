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

    try {
        const stmt = db.prepare(
            "INSERT INTO projects (user_id, title, content, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))"
        );
        const result = stmt.run(userId, title, content);

        res.json({
            message: "Projekt erstellt",
            projectId: result.lastInsertRowid
        });
    } catch (err) {
        res.status(500).json({ error: "DB error" });
    }
};

// 2) Projekt aktualisieren
exports.updateProject = (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { projectId, content, title } = req.body;

    try {
        const stmt = db.prepare(
            "UPDATE projects SET title = ?, content = ?, updated_at = datetime('now') WHERE id = ? AND user_id = ?"
        );
        const result = stmt.run(title, content, projectId, userId);

        if (result.changes === 0) {
            return res.status(404).json({ error: "Projekt nicht gefunden" });
        }

        res.json({ message: "Projekt aktualisiert" });
    } catch (err) {
        res.status(500).json({ error: "DB error" });
    }
};

// 3) Alle Projekte eines Users abrufen
exports.listProjects = (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    try {
        const stmt = db.prepare(
            "SELECT id, title, created_at, updated_at FROM projects WHERE user_id = ?"
        );
        const rows = stmt.all(userId);

        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "DB error" });
    }
};

// 4) Einzelnes Projekt abrufen
exports.getProject = (req, res) => {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const projectId = req.params.id;

    try {
        const stmt = db.prepare(
            "SELECT * FROM projects WHERE id = ? AND user_id = ?"
        );
        const row = stmt.get(projectId, userId);

        if (!row) return res.status(404).json({ error: "Projekt nicht gefunden" });

        res.json(row);
    } catch (err) {
        res.status(500).json({ error: "DB error" });
    }
};
