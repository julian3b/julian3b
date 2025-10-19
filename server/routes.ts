import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Chat endpoint - proxies to Azure Function (avoids CORS)
  app.post("/api/chat", async (req, res) => {
    try {
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Replace with your Azure Function URL
      const azureFunctionUrl = process.env.AZURE_FUNCTION_URL || 'https://your-function-app.azurewebsites.net/api/yourFunction';
      const azureFunctionKey = process.env.AZURE_FUNCTION_KEY;

      const response = await fetch(azureFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add API key if needed
          ...(azureFunctionKey && { 'x-functions-key': azureFunctionKey })
        },
        body: JSON.stringify({ message })
      });

      if (!response.ok) {
        throw new Error(`Azure Function error: ${response.status}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error('Error calling Azure Function:', error);
      res.status(500).json({ error: 'Failed to process message' });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
