const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const db = require("../utils/db");

exports.register = async (req, res) => {
    const { email, password } = req.body;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email address" });
    }

    const hash = await bcrypt.hash(password, 10);

    db.run(
        "INSERT INTO users (username, password_hash) VALUES (?, ?)",
        [email, hash],
        function (err) {
            if (err) return res.status(400).json({ error: "User exists" });

            // Token erzeugen
            const token = jwt.sign(
                { id: this.lastID },
                "SECRET123",
                { expiresIn: "1h" }
            );

            // Token zurückgeben
            res.json({ token });
        }
    );
};


exports.login = (req, res) => {

    const { email, password } = req.body;

    // Email-Check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email address" });
    }

    db.get(
        "SELECT * FROM users WHERE username = ?",
        [email],
        async (err, user) => {
            if (!user) return res.status(400).json({ error: "User not found" });

            const match = await bcrypt.compare(password, user.password_hash);
            if (!match) return res.status(400).json({ error: "Wrong password" });

            const token = jwt.sign({ id: user.id }, "SECRET123", { expiresIn: "1h" });

            res.json({ token });
        }
    );

};

exports.changePassword = async (req, res) => {
    const { email, oldPassword, newPassword } = req.body;

    console.log("--- PASSWORT-CHECK START ---");
    console.log("Suche User mit Email:", email);
    console.log("Eingegebenes altes Passwort:", oldPassword);

    db.get("SELECT * FROM users WHERE username = ?", [email], async (err, user) => {
        if (err) {
            console.error("Datenbankfehler:", err);
            return res.status(500).json({ error: "DB Error" });
        }

        if (!user) {
            console.log("FEHLER: Kein User mit dieser Email in der DB gefunden.");
            return res.status(404).json({ error: "Benutzer nicht gefunden" });
        }

        console.log("User in DB gefunden. Vergleiche jetzt mit Bcrypt...");

        const match = await bcrypt.compare(oldPassword, user.password_hash);
        console.log("Stimmt das Passwort überein?:", match);

        if (!match) {
            return res.status(400).json({ error: "DAS AKTUELLE PASSWORT IST FALSCH." });
        }

        // ... ab hier kommt dein UPDATE Befehl
        const newHash = await bcrypt.hash(newPassword, 10);
        db.run("UPDATE users SET password_hash = ? WHERE username = ?", [newHash, email], (err) => {
            res.json({ message: "Erfolg!" });
        });
    });
};
