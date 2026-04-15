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
