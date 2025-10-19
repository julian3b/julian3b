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
      const azureFunctionUrl =
        process.env.AZURE_FUNCTION_URL ||
        "https://functionapp120251016224732.azurewebsites.net/api/echo?name=Julian&age=41&code=0wlJAx1iZwfkO1oLeJDdvP1S6d6DZNtoUBKZ0y0Bk9UhAzFuFqaWLA==";
      const azureFunctionKey = process.env.AZURE_FUNCTION_KEY;

      console.log("Calling Azure Function:", azureFunctionUrl);
      console.log("Request body:", { message });

      const response = await fetch(azureFunctionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(azureFunctionKey && { "x-functions-key": azureFunctionKey }),
        },
        body: JSON.stringify({ message }),
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Azure Function error response:", errorText);
        throw new Error(`Azure Function error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log("Azure Function response data:", data);
      res.json(data);
    } catch (error) {
      console.error("Error calling Azure Function:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
