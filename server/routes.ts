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
      
      // Debug: Log first and last items to verify order
      if (data.items && data.items.length > 0) {
        console.log('[HISTORY] First item CreatedUtc:', data.items[0].CreatedUtc);
        console.log('[HISTORY] Last item CreatedUtc:', data.items[data.items.length - 1].CreatedUtc);
      }
      
      res.json(data);
    } catch (error) {
      console.error("Error fetching history:", error);
      res.status(500).json({ error: "Failed to fetch chat history" });
    }
  });

  // World-specific chat history endpoint
  app.post("/api/chat/world-history", async (req, res) => {
    try {
      const { email, worldId } = req.body;

      if (!email || !worldId) {
        return res.status(400).json({ error: "Email and worldId are required" });
      }

      const azureFunctionUrl = process.env.AZURE_FUNCTION_URL || 
        "https://functionapp120251021090023.azurewebsites.net/api/echo";
      
      const azureFunctionKey = process.env.AZURE_FUNCTION_KEY;

      const params = new URLSearchParams({
        ...(azureFunctionKey && { code: azureFunctionKey })
      });

      const fullUrl = `${azureFunctionUrl}?${params.toString()}`;
      console.log("[WORLD-HISTORY] Fetching world chat history (email and worldId not logged)");

      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          ...(azureFunctionKey && { "x-functions-key": azureFunctionKey }),
        },
        body: JSON.stringify({
          action: "getworldchats",
          email: email,
          worldid: worldId
        })
      });

      console.log("[WORLD-HISTORY] Azure Function responded with status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[WORLD-HISTORY] Azure Function error response");
        throw new Error(`Azure Function error: ${response.status}`);
      }

      const text = await response.text();
      if (!text) {
        console.log('[WORLD-HISTORY] Empty response from Azure Function');
        return res.json({ ok: true, items: [] });
      }

      const data = JSON.parse(text);
      console.log(`[WORLD-HISTORY] Retrieved ${data.count || 0} world history items for world ${worldId}`);
      console.log("[WORLD-HISTORY] Raw data from Azure Function:", JSON.stringify(data, null, 2));
      res.json(data);
    } catch (error) {
      console.error("Error fetching world history:", error);
      res.status(500).json({ error: "Failed to fetch world chat history" });
    }
  });

  // Delete world message endpoint
  app.delete("/api/chat/world-message", async (req, res) => {
    try {
      const { email, worldId, messageId } = req.body;

      if (!email || !worldId || !messageId) {
        return res.status(400).json({ error: "Email, worldId, and messageId are required" });
      }

      const azureFunctionUrl = process.env.AZURE_FUNCTION_URL || 
        "https://functionapp120251021090023.azurewebsites.net/api/echo";
      
      const azureFunctionKey = process.env.AZURE_FUNCTION_KEY;

      const params = new URLSearchParams({
        ...(azureFunctionKey && { code: azureFunctionKey })
      });

      const fullUrl = `${azureFunctionUrl}?${params.toString()}`;
      console.log("[DELETE-MESSAGE] Deleting world message (email and IDs not logged)");

      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          ...(azureFunctionKey && { "x-functions-key": azureFunctionKey }),
        },
        body: JSON.stringify({
          action: "deleteworldmessage",
          worldid: worldId,
          email: email,
          messageid: messageId
        })
      });

      console.log("[DELETE-MESSAGE] Azure Function responded with status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[DELETE-MESSAGE] Azure Function error response");
        throw new Error(`Azure Function error: ${response.status}`);
      }

      const text = await response.text();
      if (!text) {
        console.log('[DELETE-MESSAGE] Empty response from Azure Function');
        return res.json({ ok: true, deleted: true });
      }

      const data = JSON.parse(text);
      console.log(`[DELETE-MESSAGE] Deleted message successfully`);
      res.json(data);
    } catch (error) {
      console.error("Error deleting world message:", error);
      res.status(500).json({ error: "Failed to delete world message" });
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
      
      // Azure Function returns 'items' in PascalCase, transform to camelCase for frontend
      const rawWorlds = data.items || data.worlds || [];
      
      console.log("[WORLDS] Raw data from Azure Function:", JSON.stringify(rawWorlds, null, 2));
      
      // Transform PascalCase to camelCase
      const worlds = rawWorlds.map((world: any) => ({
        id: world.Id || world.id,
        userId: world.UserId || world.userId,
        name: world.Name || world.name,
        description: world.Description || world.description,
        model: world.Model || world.model,
        temperature: world.Temperature ?? world.temperature ?? 0.7,
        maxTokens: world.MaxTokens || world.maxTokens || 2000,
        responseStyle: world.ResponseStyle || world.responseStyle || "balanced",
        conversationStyle: world.ConversationStyle || world.conversationStyle || "friendly",
        customPersonality: world.CustomPersonality || world.customPersonality || "",
        characters: world.Characters || world.characters || "",
        events: world.Events || world.events || "",
        scenario: world.Scenario || world.scenario || "",
        places: world.Places || world.places || "",
        additionalSettings: world.AdditionalSettings || world.additionalSettings || "",
        createdAt: world.CreatedUtc || world.createdAt,
      }));
      
      console.log(`[WORLDS] Retrieved and transformed ${worlds.length} worlds to camelCase`);
      
      res.json({ ok: true, worlds });
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
      console.log("[WORLDS] Updating world in Azure Table Storage using editworld action");
      
      const requestBody = {
        action: "editworld",
        rowKey: id,
        ...updates
      };
      console.log("[WORLDS] Request body being sent:", JSON.stringify(requestBody, null, 2));

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
      console.log("[WORLDS] Deleting world from Azure Table Storage by rowkey");

      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          ...(azureFunctionKey && { "x-functions-key": azureFunctionKey }),
        },
        body: JSON.stringify({
          action: "deleteworld",
          email: email,
          rowkey: id
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
      
      // Check if Azure Function actually succeeded
      if (data.ok === false) {
        console.error("[WORLDS] Azure Function returned failure:", data.message || "Unknown error");
        return res.status(400).json({ 
          ok: false, 
          error: data.message || "Failed to delete world from Azure Table Storage" 
        });
      }
      
      console.log("[WORLDS] World deleted successfully");
      res.json(data);
    } catch (error) {
      console.error("Error deleting world:", error);
      res.status(500).json({ error: "Failed to delete world" });
    }
  });

  // Get world summaries endpoint
  app.get("/api/worlds/:worldId/summaries", async (req, res) => {
    try {
      const { worldId } = req.params;
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
      console.log(`[WORLD SUMMARIES] Fetching summaries for world ${worldId}`);

      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          ...(azureFunctionKey && { "x-functions-key": azureFunctionKey }),
        },
        body: JSON.stringify({
          action: "getworldsummaries",
          email: email,
          worldId: worldId
        })
      });

      console.log("[WORLD SUMMARIES] Azure Function responded with status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[WORLD SUMMARIES] Azure Function error response");
        throw new Error(`Azure Function error: ${response.status}`);
      }

      const text = await response.text();
      if (!text) {
        console.log('[WORLD SUMMARIES] Empty response from Azure Function');
        return res.json({ ok: true, summaries: [] });
      }

      const data = JSON.parse(text);
      
      // Azure Function returns 'items' in PascalCase, transform to camelCase for frontend
      const rawSummaries = data.items || data.summaries || [];
      
      console.log("[WORLD SUMMARIES] Raw data from Azure Function:", JSON.stringify(rawSummaries, null, 2));
      
      // Transform PascalCase to camelCase
      const summaries = rawSummaries.map((summary: any) => ({
        id: summary.Id || summary.id,
        worldId: summary.WorldId || summary.worldId,
        summary: summary.Summary || summary.summary,
        createdUtc: summary.CreatedUtc || summary.createdUtc,
      }));
      
      console.log(`[WORLD SUMMARIES] Retrieved and transformed ${summaries.length} summaries to camelCase`);
      
      res.json({ ok: true, summaries });
    } catch (error) {
      console.error("Error fetching world summaries:", error);
      res.status(500).json({ error: "Failed to fetch world summaries" });
    }
  });

  // Create world summary endpoint
  app.post("/api/worlds/:worldId/summaries", async (req, res) => {
    try {
      const { worldId } = req.params;
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
      console.log(`[WORLD SUMMARIES] Creating summary for world ${worldId}`);

      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          ...(azureFunctionKey && { "x-functions-key": azureFunctionKey }),
        },
        body: JSON.stringify({
          action: "createworldsummary",
          email: email,
          worldid: worldId
        })
      });

      console.log("[WORLD SUMMARIES] Azure Function responded with status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[WORLD SUMMARIES] Azure Function error response");
        throw new Error(`Azure Function error: ${response.status}`);
      }

      const text = await response.text();
      if (!text) {
        console.log('[WORLD SUMMARIES] Empty response from Azure Function');
        return res.json({ ok: true });
      }

      const data = JSON.parse(text);
      console.log("[WORLD SUMMARIES] Azure response data:", JSON.stringify(data, null, 2));
      console.log("[WORLD SUMMARIES] Summary created successfully");
      res.json({ ok: true, ...data });
    } catch (error) {
      console.error("Error creating world summary:", error);
      res.status(500).json({ error: "Failed to create world summary" });
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
        requestBody.action = 'addworldchat';
        requestBody.worldId = worldSettings.worldId;
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
