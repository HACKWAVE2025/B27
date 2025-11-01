// Make sure to import your new Note model
const Note = require("../models/Note");
// Import your admin authentication middleware
const { adminAuthMiddleware } = require("../middleware/auth"); // Or whatever your auth is

// --- 1. GET: To fetch all notes for a child ---
// This is what fires when you open the "Notes" tab
router.get(
  "/child/:childId/notes",
  adminAuthMiddleware, // Protect the route
  async (req, res) => {
    try {
      const notes = await Note.find({ childId: req.params.childId })
        .sort({ createdAt: -1 }); // Sort newest first

      res.status(200).json(notes);
    } catch (error) {
      console.error("Error fetching notes:", error);
      res.status(500).json({ message: "Server error while fetching notes." });
    }
  }
);

// --- 2. POST: To save a new note ---
// This is what fires when you click "Save Note"
router.post(
  "/child/:childId/notes",
  adminAuthMiddleware, // Protect the route
  async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ message: "Note text is required." });
      }

      const newNote = new Note({
        text,
        childId: req.params.childId,
        adminId: req.admin.id, // Get this from your auth middleware
        adminName: req.admin.name, // Get this from your auth middleware
      });

      await newNote.save();

      // Send the newly created note back to the frontend
      res.status(201).json(newNote);
    } catch (error) {
      console.error("Error saving note:", error);
      res.status(500).json({ message: "Server error while saving note." });
    }
  }
);