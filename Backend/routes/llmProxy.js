const express = require("express");
const fetch = require("node-fetch");
const router = express.Router();

router.post("/", async (req, res) => {
    console.log("LLM Request Body:", req.body);
    console.log("LLM API KEY:", process.env.LLM_API_KEY);


    try {
        const response = await fetch("https://chat-ai.academiccloud.de/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${process.env.LLM_API_KEY}`
            },
            body: JSON.stringify(req.body)
        });

        const text = await response.text();
        res.status(response.status).send(text);
    } catch (err) {
        console.error("LLM Proxy Error:", err);
        res.status(500).send("LLM Proxy Error");
    }
});

module.exports = router;
