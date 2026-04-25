const express = require("express");
const router = express.Router();

const {
    createProject,
    updateProject,
    listProjects,
    getProject
} = require("../controllers/projectController");

// Neues Projekt anlegen
router.post("/create", createProject);

// Projekt aktualisieren
router.post("/update", updateProject);

// Alle Projekte eines Users abrufen
router.get("/list", listProjects);

// Einzelnes Projekt abrufen
router.get("/:id", getProject);

module.exports = router;
