import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Chat endpoint - proxies to Azure Function (avoids CORS)
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, userId } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Azure Function URL - extract code from URL if present
      let azureFunctionUrl =
        process.env.AZURE_FUNCTION_URL ||
        "https://functionapp120251016224732.azurewebsites.net/api/echo?";
      
      let azureFunctionKey = process.env.AZURE_FUNCTION_KEY;

      // Extract code from URL if present and move it to header
      const url = new URL(azureFunctionUrl);
      const codeParam = url.searchParams.get('code');
      if (codeParam) {
        azureFunctionKey = codeParam;
        url.searchParams.delete('code');
      }
      
      // Add the user's message as 'text' query parameter
      url.searchParams.set('text', message);
      
      // Add userId if provided
      if (userId) {
        url.searchParams.set('userId', userId);
      }
      
      azureFunctionUrl = url.toString();

      console.log("Calling Azure Function:", azureFunctionUrl);
      console.log("Using API key:", azureFunctionKey ? "Yes" : "No");
      console.log("Message sent as 'text' parameter:", message);
      console.log("User ID:", userId || "Not provided");

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
