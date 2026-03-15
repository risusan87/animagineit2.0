import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Health check endpoint
  app.get("/api/v1/status", (req, res) => {
    res.json({ status: "available", version: "1.0.0" });
  });

  // Image Generation Endpoint (Proxy to Hugging Face or similar)
  app.post("/api/v1/generate", async (req, res) => {
    const { prompt, negative_prompt, guidance_scale, num_inference_steps, seed, aspect_ratio } = req.body;

    const apiKey = process.env.HUGGING_FACE_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ 
        error: "HUGGING_FACE_API_KEY is not configured on the server." 
      });
    }

    // Map aspect ratio to dimensions for SDXL
    const dimensions: Record<string, { width: number, height: number }> = {
      "1:1": { width: 1024, height: 1024 },
      "3:4": { width: 896, height: 1152 },
      "4:3": { width: 1152, height: 896 },
      "9:16": { width: 768, height: 1344 },
      "16:9": { width: 1344, height: 768 },
    };

    const { width, height } = dimensions[aspect_ratio] || dimensions["1:1"];

    try {
      // Using Animagine XL 3.1 from Hugging Face
      const response = await fetch(
        "https://api-inference.huggingface.co/models/cagliostrolab/animagine-xl-3.1",
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              negative_prompt,
              guidance_scale: parseFloat(guidance_scale) || 7.0,
              num_inference_steps: parseInt(num_inference_steps) || 28,
              seed: parseInt(seed) || Math.floor(Math.random() * 1000000),
              width,
              height,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Hugging Face API Error:", errorText);
        return res.status(response.status).json({ error: "Failed to generate image from backend." });
      }

      const blob = await response.arrayBuffer();
      const base64Image = Buffer.from(blob).toString("base64");
      
      res.json({ image: `data:image/png;base64,${base64Image}` });
    } catch (error) {
      console.error("Server Error:", error);
      res.status(500).json({ error: "Internal server error during image generation." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
