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

      // SECURITY: Require dedicated auth URL (no fallback to avoid reusing chat endpoint)
      const azureFunctionUrl = process.env.AZURE_AUTH_URL;
      
      if (!azureFunctionUrl) {
        return res.status(500).json({ 
          ok: false, 
          error: "AZURE_AUTH_URL not configured. Please set a dedicated authentication endpoint in your environment secrets." 
        });
      }

      const azureFunctionKey = process.env.AZURE_FUNCTION_KEY;

      // SECURE: Only include auth code in URL, NOT credentials
      const params = new URLSearchParams({
        ...(azureFunctionKey && { code: azureFunctionKey })
      });

      const fullUrl = `${azureFunctionUrl}?${params.toString()}`;
      console.log(`[LOGIN] Calling Azure Function (SECURE - credentials in encrypted POST body, not logged)`);
      
      // SECURE: Send credentials in encrypted POST body, not URL
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(azureFunctionKey && { 'x-functions-key': azureFunctionKey }),
        },
        body: JSON.stringify({
          action: 'login',
          email: email,
          password: password
        })
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
      if (!text) {
        console.log('[LOGIN] Empty response from Azure Function');
        return res.status(500).json({ 
          ok: false, 
          error: 'Azure Function returned empty response' 
        });
      }

      let data;
      try {
        data = JSON.parse(text);
        // SECURITY: Only log success/failure, NOT the response content (may contain tokens/user data)
        console.log(`[LOGIN] Authentication ${data.ok ? 'successful' : 'failed'}`);
      } catch (parseError) {
        console.error('[LOGIN] Failed to parse Azure Function response (content not logged)');
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

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { action, email, password, name } = req.body;

      if (!email || !password) {
        return res.status(400).json({ ok: false, error: "Email and password are required" });
      }

      // SECURITY: Require dedicated auth URL (no fallback to avoid reusing chat endpoint)
      const azureFunctionUrl = process.env.AZURE_AUTH_URL;
      
      if (!azureFunctionUrl) {
        return res.status(500).json({ 
          ok: false, 
          error: "AZURE_AUTH_URL not configured. Please set a dedicated authentication endpoint in your environment secrets." 
        });
      }

      const azureFunctionKey = process.env.AZURE_FUNCTION_KEY;

      // SECURE: Only include auth code in URL, NOT credentials
      const params = new URLSearchParams({
        ...(azureFunctionKey && { code: azureFunctionKey })
      });

      const fullUrl = `${azureFunctionUrl}?${params.toString()}`;
      console.log(`[SIGNUP] Calling Azure Function (SECURE - credentials in encrypted POST body, not logged)`);
      
      // SECURE: Send credentials in encrypted POST body, not URL
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(azureFunctionKey && { 'x-functions-key': azureFunctionKey }),
        },
        body: JSON.stringify({
          action: action || 'create account',
          email: email,
          password: password,
          name: name || ''
        })
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
      if (!text) {
        console.log('[SIGNUP] Empty response from Azure Function');
        return res.status(500).json({ 
          ok: false, 
          error: 'Azure Function returned empty response' 
        });
      }

      let data;
      try {
        data = JSON.parse(text);
        // SECURITY: Only log success/failure, NOT the response content (may contain tokens/user data)
        console.log(`[SIGNUP] Account creation ${data.ok ? 'successful' : 'failed'}`);
      } catch (parseError) {
        console.error('[SIGNUP] Failed to parse Azure Function response (content not logged)');
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

  // Chat history endpoint - fetches user's chat history
  app.post("/api/chat/history", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const azureFunctionUrl = process.env.AZURE_FUNCTION_URL || 
        "https://functionapp120251021090023.azurewebsites.net/api/echo";
      
      const azureFunctionKey = process.env.AZURE_FUNCTION_KEY;

      const params = new URLSearchParams({
        ...(azureFunctionKey && { code: azureFunctionKey })
      });

      const fullUrl = `${azureFunctionUrl}?${params.toString()}`;
      console.log("[HISTORY] Fetching chat history for user (email not logged)");

      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          ...(azureFunctionKey && { "x-functions-key": azureFunctionKey }),
        },
        body: JSON.stringify({
          email: email,
          action: "history"
        })
      });

      console.log("[HISTORY] Azure Function responded with status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[HISTORY] Azure Function error response");
        throw new Error(`Azure Function error: ${response.status}`);
      }

      const text = await response.text();
      if (!text) {
        console.log('[HISTORY] Empty response from Azure Function');
        return res.json({ ok: true, items: [] });
      }

      const data = JSON.parse(text);
      console.log(`[HISTORY] Retrieved ${data.count || 0} history items`);
      res.json(data);
    } catch (error) {
      console.error("Error fetching history:", error);
      res.status(500).json({ error: "Failed to fetch chat history" });
    }
  });

  // Get user settings endpoint
  app.post("/api/settings/get", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const azureFunctionUrl = process.env.AZURE_FUNCTION_URL || 
        "https://functionapp120251021090023.azurewebsites.net/api/echo";
      
      const azureFunctionKey = process.env.AZURE_FUNCTION_KEY;

      const params = new URLSearchParams({
        ...(azureFunctionKey && { code: azureFunctionKey })
      });

      const fullUrl = `${azureFunctionUrl}?${params.toString()}`;
      console.log("[SETTINGS] Fetching user settings (email not logged)");

      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          ...(azureFunctionKey && { "x-functions-key": azureFunctionKey }),
        },
        body: JSON.stringify({
          email: email,
          action: "getSettings"
        })
      });

      console.log("[SETTINGS] Azure Function responded with status:", response.status);

      if (!response.ok) {
        console.error("[SETTINGS] Azure Function error response");
        throw new Error(`Azure Function error: ${response.status}`);
      }

      const text = await response.text();
      if (!text) {
        console.log('[SETTINGS] Empty response, returning defaults');
        return res.json({ ok: true, settings: null });
      }

      const data = JSON.parse(text);
      console.log("[SETTINGS] Retrieved user settings successfully");
      res.json(data);
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ error: "Failed to fetch user settings" });
    }
  });

  // Save user settings endpoint
  app.post("/api/settings/save", async (req, res) => {
    try {
      const { email, settings } = req.body;

      if (!email || !settings) {
        return res.status(400).json({ error: "Email and settings are required" });
      }

      const azureFunctionUrl = process.env.AZURE_FUNCTION_URL || 
        "https://functionapp120251021090023.azurewebsites.net/api/echo";
      
      const azureFunctionKey = process.env.AZURE_FUNCTION_KEY;

      const params = new URLSearchParams({
        ...(azureFunctionKey && { code: azureFunctionKey })
      });

      const fullUrl = `${azureFunctionUrl}?${params.toString()}`;
      console.log("[SETTINGS] Saving user settings (email and settings not logged)");

      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          ...(azureFunctionKey && { "x-functions-key": azureFunctionKey }),
        },
        body: JSON.stringify({
          email: email,
          action: "saveSettings",
          model: settings.model,
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
          responseStyle: settings.responseStyle,
          conversationStyle: settings.conversationStyle,
          customPersonality: settings.customPersonality
        })
      });

      console.log("[SETTINGS] Azure Function responded with status:", response.status);

      if (!response.ok) {
        console.error("[SETTINGS] Azure Function error response");
        throw new Error(`Azure Function error: ${response.status}`);
      }

      const text = await response.text();
      if (!text) {
        console.log('[SETTINGS] Empty response');
        return res.json({ ok: true });
      }

      const data = JSON.parse(text);
      console.log("[SETTINGS] Saved user settings successfully");
      res.json(data);
    } catch (error) {
      console.error("Error saving settings:", error);
      res.status(500).json({ error: "Failed to save user settings" });
    }
  });

  // Worlds endpoints - manage separate chat contexts with their own AI settings
  // All world operations are sent to Azure Function and stored in Azure Table Storage
  app.get("/api/worlds", async (req, res) => {
    try {
      const { userId, email } = req.query;

      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: "User ID is required" });
      }

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: "Email is required" });
      }

      const azureFunctionUrl = process.env.AZURE_FUNCTION_URL || 
        "https://functionapp120251021090023.azurewebsites.net/api/echo";
      const azureFunctionKey = process.env.AZURE_FUNCTION_KEY;

      const params = new URLSearchParams({
        ...(azureFunctionKey && { code: azureFunctionKey })
      });

      const fullUrl = `${azureFunctionUrl}?${params.toString()}`;
      console.log("[WORLDS] Fetching worlds for user from Azure Table Storage");

      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          ...(azureFunctionKey && { "x-functions-key": azureFunctionKey }),
        },
        body: JSON.stringify({
          action: "getworlds",
          email: email,
          userId: userId
        })
      });

      console.log("[WORLDS] Azure Function responded with status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[WORLDS] Azure Function error response");
        throw new Error(`Azure Function error: ${response.status}`);
      }

      const text = await response.text();
      if (!text) {
        console.log('[WORLDS] Empty response from Azure Function');
        return res.json({ ok: true, worlds: [] });
      }

      const data = JSON.parse(text);
      console.log(`[WORLDS] Retrieved ${data.worlds?.length || 0} worlds`);
      res.json(data);
    } catch (error) {
      console.error("Error fetching worlds:", error);
      res.status(500).json({ error: "Failed to fetch worlds" });
    }
  });

  app.post("/api/worlds", async (req, res) => {
    try {
      const worldData = req.body;

      if (!worldData.userId || !worldData.name) {
        return res.status(400).json({ error: "User ID and name are required" });
      }

      if (!worldData.email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const azureFunctionUrl = process.env.AZURE_FUNCTION_URL || 
        "https://functionapp120251021090023.azurewebsites.net/api/echo";
      const azureFunctionKey = process.env.AZURE_FUNCTION_KEY;

      const params = new URLSearchParams({
        ...(azureFunctionKey && { code: azureFunctionKey })
      });

      const fullUrl = `${azureFunctionUrl}?${params.toString()}`;
      
      const requestBody = {
        action: "createworld",
        ...worldData
      };
      
      console.log("[WORLDS] Creating new world in Azure Table Storage");
      console.log("[WORLDS] REQUEST BODY:", JSON.stringify(requestBody, null, 2));

      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          ...(azureFunctionKey && { "x-functions-key": azureFunctionKey }),
        },
        body: JSON.stringify(requestBody)
      });

      console.log("[WORLDS] Azure Function responded with status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[WORLDS] Azure Function error response");
        throw new Error(`Azure Function error: ${response.status}`);
      }

      const text = await response.text();
      if (!text) {
        console.log('[WORLDS] Empty response from Azure Function');
        throw new Error('Azure Function returned empty response');
      }

      const data = JSON.parse(text);
      console.log("[WORLDS] World created successfully");
      res.json(data);
    } catch (error) {
      console.error("Error creating world:", error);
      res.status(500).json({ error: "Failed to create world" });
    }
  });

  app.put("/api/worlds/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (!updates.email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const azureFunctionUrl = process.env.AZURE_FUNCTION_URL || 
        "https://functionapp120251021090023.azurewebsites.net/api/echo";
      const azureFunctionKey = process.env.AZURE_FUNCTION_KEY;

      const params = new URLSearchParams({
        ...(azureFunctionKey && { code: azureFunctionKey })
      });

      const fullUrl = `${azureFunctionUrl}?${params.toString()}`;
      console.log("[WORLDS] Updating world in Azure Table Storage");

      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          ...(azureFunctionKey && { "x-functions-key": azureFunctionKey }),
        },
        body: JSON.stringify({
          action: "updateworld",
          id: id,
          ...updates
        })
      });

      console.log("[WORLDS] Azure Function responded with status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[WORLDS] Azure Function error response");
        throw new Error(`Azure Function error: ${response.status}`);
      }

      const text = await response.text();
      if (!text) {
        console.log('[WORLDS] Empty response from Azure Function');
        throw new Error('Azure Function returned empty response');
      }

      const data = JSON.parse(text);
      console.log("[WORLDS] World updated successfully");
      res.json(data);
    } catch (error) {
      console.error("Error updating world:", error);
      res.status(500).json({ error: "Failed to update world" });
    }
  });

  app.delete("/api/worlds/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { email } = req.query;

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: "Email is required" });
      }

      const azureFunctionUrl = process.env.AZURE_FUNCTION_URL || 
        "https://functionapp120251021090023.azurewebsites.net/api/echo";
      const azureFunctionKey = process.env.AZURE_FUNCTION_KEY;

      const params = new URLSearchParams({
        ...(azureFunctionKey && { code: azureFunctionKey })
      });

      const fullUrl = `${azureFunctionUrl}?${params.toString()}`;
      console.log("[WORLDS] Deleting world from Azure Table Storage");

      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          ...(azureFunctionKey && { "x-functions-key": azureFunctionKey }),
        },
        body: JSON.stringify({
          action: "deleteworld",
          id: id,
          email: email
        })
      });

      console.log("[WORLDS] Azure Function responded with status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[WORLDS] Azure Function error response");
        throw new Error(`Azure Function error: ${response.status}`);
      }

      const text = await response.text();
      if (!text) {
        console.log('[WORLDS] Empty response from Azure Function');
        return res.json({ ok: true });
      }

      const data = JSON.parse(text);
      console.log("[WORLDS] World deleted successfully");
      res.json(data);
    } catch (error) {
      console.error("Error deleting world:", error);
      res.status(500).json({ error: "Failed to delete world" });
    }
  });

  // Chat endpoint - proxies to Azure Function (avoids CORS)
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, userId, name, history, worldSettings } = req.body;

      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // Use dedicated chat endpoint (separate from auth endpoint for security)
      const azureFunctionUrl = process.env.AZURE_FUNCTION_URL || 
        "https://functionapp120251021090023.azurewebsites.net/api/echo";
      
      const azureFunctionKey = process.env.AZURE_FUNCTION_KEY;

      // SECURITY: Only include auth code in URL, send data in encrypted POST body
      const params = new URLSearchParams({
        ...(azureFunctionKey && { code: azureFunctionKey })
      });

      const fullUrl = `${azureFunctionUrl}?${params.toString()}`;
      
      // SECURITY: Email, message, history, and world settings sent in encrypted POST body (not logged for privacy)
      const logMsg = worldSettings 
        ? "[CHAT] Calling Azure Function with world settings (SECURE - data in encrypted POST body)"
        : "[CHAT] Calling Azure Function (SECURE - data in encrypted POST body)";
      console.log(logMsg);

      // Prepare request body with world settings if provided
      const requestBody: any = {
        email: name || 'user@example.com',
        text: message,
        history: history || []
      };

      // Add world-specific settings as per-request overrides if provided
      if (worldSettings) {
        requestBody.model = worldSettings.model;
        requestBody.temperature = worldSettings.temperature;
        requestBody.maxTokens = worldSettings.maxTokens;
        requestBody.responseStyle = worldSettings.responseStyle;
        requestBody.conversationStyle = worldSettings.conversationStyle;
        requestBody.customPersonality = worldSettings.customPersonality;
        requestBody.characters = worldSettings.characters;
        requestBody.events = worldSettings.events;
        requestBody.scenario = worldSettings.scenario;
        requestBody.places = worldSettings.places;
        requestBody.additionalSettings = worldSettings.additionalSettings;
      }

      // SECURE: Send email, message, conversation history, and settings in encrypted POST body
      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          ...(azureFunctionKey && { "x-functions-key": azureFunctionKey }),
        },
        body: JSON.stringify(requestBody)
      });
      
      console.log("[CHAT] Azure Function responded with status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[CHAT] Azure Function error response:", errorText);
        throw new Error(`Azure Function error: ${response.status} - ${errorText}`);
      }

      const text = await response.text();
      
      if (!text) {
        console.log('[CHAT] Empty response from Azure Function');
        throw new Error('Azure Function returned empty response');
      }

      const data = JSON.parse(text);
      // SECURITY: Only log success/failure, NOT message content or AI response
      console.log(`[CHAT] Response received ${data.ok ? 'successfully' : 'with error'}`);
      res.json(data);
    } catch (error) {
      console.error("Error calling Azure Function:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
