import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication endpoints - proxy to Azure Function
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ ok: false, error: "Email and password are required" });
      }

      // Use the same Azure Function URL as signup
      const azureFunctionUrl = process.env.AZURE_AUTH_URL || process.env.AZURE_FUNCTION_URL;
      
      if (!azureFunctionUrl) {
        return res.status(400).json({ 
          ok: false, 
          error: "Azure Function URL not configured. Please set AZURE_AUTH_URL in your environment secrets." 
        });
      }

      const azureFunctionKey = process.env.AZURE_FUNCTION_KEY;

      // Build query parameters for login - include code parameter for Azure Function auth
      const params = new URLSearchParams({
        action: 'login',
        email: email,
        password: password,
        ...(azureFunctionKey && { code: azureFunctionKey })
      });

      const fullUrl = `${azureFunctionUrl}?${params.toString()}`;
      console.log(`[LOGIN] Calling Azure Function: ${fullUrl.replace(azureFunctionKey || '', 'KEY_HIDDEN')}`);
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          ...(azureFunctionKey && { 'x-functions-key': azureFunctionKey }),
        },
      });

      console.log(`[LOGIN] Azure Function responded with status: ${response.status}`);
      
      // Handle non-OK responses
      if (!response.ok) {
        return res.status(response.status).json({ 
          ok: false, 
          error: `Azure Function returned ${response.status}: ${response.statusText}` 
        });
      }

      // Try to parse JSON, handle empty or invalid responses
      const text = await response.text();
      console.log(`[LOGIN] Azure Function response: ${text.substring(0, 200)}`);
      if (!text) {
        return res.status(500).json({ 
          ok: false, 
          error: 'Azure Function returned empty response' 
        });
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Failed to parse Azure Function response:', text);
        return res.status(500).json({ 
          ok: false, 
          error: 'Azure Function returned invalid JSON' 
        });
      }

      res.json(data);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ ok: false, error: 'Failed to connect to Azure Function. Please check your configuration.' });
    }
  });

  app.get("/api/auth/signup", async (req, res) => {
    try {
      const { action, email, password, name } = req.query;

      if (!email || !password) {
        return res.status(400).json({ ok: false, error: "Email and password are required" });
      }

      // Use the same Azure Function URL as login
      const azureFunctionUrl = process.env.AZURE_AUTH_URL || process.env.AZURE_FUNCTION_URL;
      
      if (!azureFunctionUrl) {
        return res.status(400).json({ 
          ok: false, 
          error: "Azure Function URL not configured. Please set AZURE_AUTH_URL in your environment secrets." 
        });
      }

      const azureFunctionKey = process.env.AZURE_FUNCTION_KEY;

      // Build query parameters - include code parameter for Azure Function auth
      const params = new URLSearchParams({
        action: action as string || 'create account',
        email: email as string,
        password: password as string,
        name: name as string || '',
        ...(azureFunctionKey && { code: azureFunctionKey })
      });

      const fullUrl = `${azureFunctionUrl}?${params.toString()}`;
      console.log(`[SIGNUP] Calling Azure Function: ${fullUrl.replace(azureFunctionKey || '', 'KEY_HIDDEN')}`);
      
      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          ...(azureFunctionKey && { 'x-functions-key': azureFunctionKey }),
        },
      });

      console.log(`[SIGNUP] Azure Function responded with status: ${response.status}`);
      
      // Handle non-OK responses
      if (!response.ok) {
        return res.status(response.status).json({ 
          ok: false, 
          error: `Azure Function returned ${response.status}: ${response.statusText}` 
        });
      }

      // Try to parse JSON, handle empty or invalid responses
      const text = await response.text();
      console.log(`[SIGNUP] Azure Function response: ${text.substring(0, 200)}`);
      if (!text) {
        return res.status(500).json({ 
          ok: false, 
          error: 'Azure Function returned empty response' 
        });
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('Failed to parse Azure Function response:', text);
        return res.status(500).json({ 
          ok: false, 
          error: 'Azure Function returned invalid JSON' 
        });
      }

      res.json(data);
    } catch (error) {
      console.error('Signup error:', error);
      res.status(500).json({ ok: false, error: 'Failed to connect to Azure Function. Please check your configuration.' });
    }
  });

  // Chat endpoint - proxies to Azure Function (avoids CORS)
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, userId } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Use the same Azure Function URL as login/signup
      const azureFunctionUrl = process.env.AZURE_AUTH_URL || 
        "https://functionapp120251021090023.azurewebsites.net/api/echo";
      
      const azureFunctionKey = process.env.AZURE_FUNCTION_KEY;

      // Build query parameters - include code for authentication
      const params = new URLSearchParams({
        text: message,
        ...(userId && { userId: userId }),
        ...(azureFunctionKey && { code: azureFunctionKey })
      });

      const fullUrl = `${azureFunctionUrl}?${params.toString()}`;
      console.log("[CHAT] Calling Azure Function:", fullUrl.replace(azureFunctionKey || '', 'KEY_HIDDEN'));
      console.log("[CHAT] Message:", message);
      console.log("[CHAT] User ID:", userId || "Not provided");

      const response = await fetch(fullUrl, {
        method: "GET",
        headers: {
          ...(azureFunctionKey && { "x-functions-key": azureFunctionKey }),
        },
      });
      
      console.log("[CHAT] Azure Function responded with status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[CHAT] Azure Function error response:", errorText);
        throw new Error(`Azure Function error: ${response.status} - ${errorText}`);
      }

      const text = await response.text();
      console.log("[CHAT] Azure Function response:", text.substring(0, 200));
      
      if (!text) {
        throw new Error('Azure Function returned empty response');
      }

      const data = JSON.parse(text);
      res.json(data);
    } catch (error) {
      console.error("Error calling Azure Function:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
