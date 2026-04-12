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

// Tabelle erstellen, falls nicht vorhanden
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password_hash TEXT
  )
`);

module.exports = db;
