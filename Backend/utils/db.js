const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "..", "database.sqlite");

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Fehler beim Verbinden mit SQLite:", err);
    } else {
        console.log("Mit SQLite verbunden.");
    }
});

// Alles nacheinander ausführen → verhindert SQLITE_BUSY
db.serialize(() => {

    // 1) Users-Tabelle erstellen
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
                                             id INTEGER PRIMARY KEY AUTOINCREMENT,
                                             username TEXT UNIQUE,
                                             password_hash TEXT
        );
    `);

    // 2) Users-Tabelle erweitern (nur falls Spalten fehlen)
    db.all("PRAGMA table_info(users)", (err, columns) => {
        if (err) {
            console.error("Fehler beim Lesen der User-Tabelle:", err);
            return;
        }

        const existing = columns.map(c => c.name);

        if (!existing.includes("provider")) {
            db.run("ALTER TABLE users ADD COLUMN provider TEXT");
        }
        if (!existing.includes("provider_user_id")) {
            db.run("ALTER TABLE users ADD COLUMN provider_user_id TEXT");
        }
        if (!existing.includes("email")) {
            db.run("ALTER TABLE users ADD COLUMN email TEXT");
        }
        if (!existing.includes("avatar_url")) {
            db.run("ALTER TABLE users ADD COLUMN avatar_url TEXT");
        }
        if (!existing.includes("created_at")) {
            db.run("ALTER TABLE users ADD COLUMN created_at TEXT");
        }
        if (!existing.includes("updated_at")) {
            db.run("ALTER TABLE users ADD COLUMN updated_at TEXT");
        }
    });

    // 3) Projects-Tabelle erstellen
    db.run(`
        CREATE TABLE IF NOT EXISTS projects (
                                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                                user_id INTEGER,
                                                title TEXT,
                                                content TEXT,
                                                created_at TEXT,
                                                updated_at TEXT,
                                                FOREIGN KEY (user_id) REFERENCES users(id)
            );
    `);

});

module.exports = db;
