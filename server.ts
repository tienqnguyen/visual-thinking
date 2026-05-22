import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// In-memory store for shared chats
const sharedChats = new Map<string, any>();

// API routes FIRST
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/share", (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Invalid messages format" });
    }
    
    // Generate a simple unique ID
    const shareId = crypto.randomBytes(4).toString("hex");
    sharedChats.set(shareId, messages);
    
    res.json({ shareId });
  } catch (err) {
    console.error("Error sharing chat:", err);
    res.status(500).json({ error: "Failed to share chat" });
  }
});

app.get("/api/share/:id", (req, res) => {
  const { id } = req.params;
  const messages = sharedChats.get(id);
  
  if (!messages) {
    return res.status(404).json({ error: "Shared chat not found" });
  }
  
  res.json({ messages });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
