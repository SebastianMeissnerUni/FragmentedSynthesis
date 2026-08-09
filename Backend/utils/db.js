const Database = require("better-sqlite3");
const path = require("path");

const dbPath = path.join(__dirname, "..", "database.sqlite");

// Verbindung öffnen
let db;
try {
    db = new Database(dbPath);
    console.log("Mit SQLite (better-sqlite3) verbunden.");
} catch (err) {
    console.error("Fehler beim Verbinden mit SQLite:", err);
}

// 1) Users-Tabelle erstellen
db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password_hash TEXT
    );
`).run();

// 2) Users-Tabelle erweitern (nur falls Spalten fehlen)
const columns = db.prepare("PRAGMA table_info(users)").all();
const existing = columns.map(c => c.name);

if (!existing.includes("provider")) {
    db.prepare("ALTER TABLE users ADD COLUMN provider TEXT").run();
}
if (!existing.includes("provider_user_id")) {
    db.prepare("ALTER TABLE users ADD COLUMN provider_user_id TEXT").run();
}
if (!existing.includes("email")) {
    db.prepare("ALTER TABLE users ADD COLUMN email TEXT").run();
}
if (!existing.includes("avatar_url")) {
    db.prepare("ALTER TABLE users ADD COLUMN avatar_url TEXT").run();
}
if (!existing.includes("created_at")) {
    db.prepare("ALTER TABLE users ADD COLUMN created_at TEXT").run();
}
if (!existing.includes("updated_at")) {
    db.prepare("ALTER TABLE users ADD COLUMN updated_at TEXT").run();
}
if (!existing.includes("github_access_token")) {
    db.prepare("ALTER TABLE users ADD COLUMN github_access_token TEXT").run();
}

// 3) Projects-Tabelle erstellen
db.prepare(`
    CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT,
        content TEXT,
        created_at TEXT,
        updated_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
`).run();

module.exports = db;
