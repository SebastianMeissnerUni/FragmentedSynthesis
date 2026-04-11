// --- Grundlegende Imports ---
const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
require("dotenv").config();

// --- Express App erstellen ---
const app = express();
app.use(cors());
app.use(express.json());

// --- SQLite Datenbank öffnen ---
const db = new Database("database.sqlite");

// Tabelle erstellen
db.prepare(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password_hash TEXT
  )
`).run();

// --- Test-Route ---
app.get("/", (req, res) => {
    res.json({ message: "Backend läuft erfolgreich!" });
});

// --- Test-Insert ---
app.get("/addtest", (req, res) => {
    db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
        .run("sebastian11123", "hash");
    res.json({ message: "Testuser hinzugefügt" });
});

// --- Server starten ---
const PORT = 3000;
app.listen(PORT, () => {
    console.log("Backend läuft auf Port " + PORT);
});
