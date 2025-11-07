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

  // Send verification code endpoint
  app.post("/api/auth/sendcode", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ ok: false, error: "Email is required" });
      }

      const azureFunctionUrl = process.env.AZURE_AUTH_URL;
      
      if (!azureFunctionUrl) {
        return res.status(500).json({ 
          ok: false, 
          error: "AZURE_AUTH_URL not configured. Please set a dedicated authentication endpoint in your environment secrets." 
        });
      }

      const azureFunctionKey = process.env.AZURE_FUNCTION_KEY;

      const params = new URLSearchParams({
        ...(azureFunctionKey && { code: azureFunctionKey })
      });

      const fullUrl = `${azureFunctionUrl}?${params.toString()}`;
      console.log(`[SENDCODE] Sending verification code (email not logged for security)`);
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(azureFunctionKey && { 'x-functions-key': azureFunctionKey }),
        },
        body: JSON.stringify({
          action: 'sendcode',
          email: email
        })
      });

      console.log(`[SENDCODE] Azure Function responded with status: ${response.status}`);
      
      if (!response.ok) {
        return res.status(response.status).json({ 
          ok: false, 
          error: `Azure Function returned ${response.status}: ${response.statusText}` 
        });
      }

      const text = await response.text();
      if (!text) {
        console.log('[SENDCODE] Empty response from Azure Function');
        return res.status(500).json({ 
          ok: false, 
          error: 'Azure Function returned empty response' 
        });
      }

      let data;
      try {
        data = JSON.parse(text);
        console.log(`[SENDCODE] Verification code ${data.ok ? 'sent successfully' : 'send failed'}`);
      } catch (parseError) {
        console.error('[SENDCODE] Failed to parse Azure Function response');
        return res.status(500).json({ 
          ok: false, 
          error: 'Azure Function returned invalid JSON' 
        });
      }

      res.json(data);
    } catch (error) {
      console.error('Send code error:', error);
      res.status(500).json({ ok: false, error: 'Failed to send verification code. Please try again.' });
    }
  });

  // Verify code endpoint
  app.post("/api/auth/verifycode", async (req, res) => {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({ ok: false, error: "Email and code are required" });
      }

      console.log(`[VERIFYCODE] 🔐 CODE RECEIVED FROM FRONTEND: "${code}"`);
      console.log(`[VERIFYCODE] 📧 EMAIL: "${email}"`);

      const azureFunctionUrl = process.env.AZURE_AUTH_URL;
      
      if (!azureFunctionUrl) {
        return res.status(500).json({ 
          ok: false, 
          error: "AZURE_AUTH_URL not configured. Please set a dedicated authentication endpoint in your environment secrets." 
        });
      }

      const azureFunctionKey = process.env.AZURE_FUNCTION_KEY;

      const params = new URLSearchParams({
        ...(azureFunctionKey && { code: azureFunctionKey })
      });

      const fullUrl = `${azureFunctionUrl}?${params.toString()}`;
      
      const azurePayload = {
        action: 'verifycode',
        email: email,
        codeverify: code
      };
      console.log(`[VERIFYCODE] 📤 SENDING TO AZURE:`, JSON.stringify(azurePayload));
      
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(azureFunctionKey && { 'x-functions-key': azureFunctionKey }),
        },
        body: JSON.stringify(azurePayload)
      });

      console.log(`[VERIFYCODE] Azure Function responded with status: ${response.status}`);
      
      if (!response.ok) {
        return res.status(response.status).json({ 
          ok: false, 
          error: `Azure Function returned ${response.status}: ${response.statusText}` 
        });
      }

      const text = await response.text();
      if (!text) {
        console.log('[VERIFYCODE] Empty response from Azure Function');
        return res.status(500).json({ 
          ok: false, 
          error: 'Azure Function returned empty response' 
        });
      }

      let data;
      try {
        data = JSON.parse(text);
        console.log(`[VERIFYCODE] Code verification ${data.ok ? 'successful' : 'failed'}`);
      } catch (parseError) {
        console.error('[VERIFYCODE] Failed to parse Azure Function response');
        return res.status(500).json({ 
          ok: false, 
          error: 'Azure Function returned invalid JSON' 
        });
      }

      res.json(data);
    } catch (error) {
      console.error('Verify code error:', error);
      res.status(500).json({ ok: false, error: 'Failed to verify code. Please try again.' });
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
      
      // Sort messages in chronological order (oldest first, newest last)
      if (data.items && Array.isArray(data.items)) {
        data.items.sort((a: any, b: any) => {
          const dateA = new Date(a.CreatedUtc || a.createdUtc || 0).getTime();
          const dateB = new Date(b.CreatedUtc || b.createdUtc || 0).getTime();
          return dateA - dateB; // Ascending order (oldest first)
        });
      }
      
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

  // World-specific chat history endpoint with pagination support
  app.post("/api/chat/world-history", async (req, res) => {
    try {
      const { email, worldId, take, continuationToken } = req.body;

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
      
      const pageSize = take || 10; // Default to 10 messages per page
      console.log(`[WORLD-HISTORY] Fetching world chat history (email and worldId not logged) - page size: ${pageSize}, has token: ${!!continuationToken}`);

      const requestBody: any = {
        action: "getworldchats",
        email: email,
        worldid: worldId,
        take: pageSize
      };

      // Only include continuationToken if it's provided (not on first load)
      if (continuationToken) {
        requestBody.continuationToken = continuationToken;
      }

      console.log("[WORLD-HISTORY] 📤 REQUEST BODY SENT TO AZURE:", JSON.stringify(requestBody, null, 2));

      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          ...(azureFunctionKey && { "x-functions-key": azureFunctionKey }),
        },
        body: JSON.stringify(requestBody)
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
      
      // Transform Azure's new format (text/ai) to our expected format (input/aiReply)
      if (data.items && Array.isArray(data.items)) {
        data.items = data.items.map((item: any) => ({
          ...item,
          input: item.text || item.input,     // Support both old and new format
          aiReply: item.ai || item.aiReply,   // Support both old and new format
        }));
        
        // Sort messages in chronological order (oldest first, newest last)
        data.items.sort((a: any, b: any) => {
          const dateA = new Date(a.createdUtc || 0).getTime();
          const dateB = new Date(b.createdUtc || 0).getTime();
          return dateA - dateB; // Ascending order (oldest first)
        });
      }
      
      // Calculate count if not provided
      if (!data.count && data.items) {
        data.count = data.items.length;
      }
      
      console.log(`[WORLD-HISTORY] Retrieved ${data.count || 0} world history items for world ${worldId}`);
      console.log("[WORLD-HISTORY] Transformed data being sent to frontend:", JSON.stringify(data, null, 2));
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
        ...(azureFunctionKey && { code: azureFunctionKey }),
        worldId: id  // Azure expects worldId as URL parameter, not in body
      });

      const fullUrl = `${azureFunctionUrl}?${params.toString()}`;
      console.log("[WORLDS] Updating world in Azure Table Storage using editworld action");
      
      const requestBody = {
        action: "editworld",
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
      console.log("[WORLDS] Azure response:", JSON.stringify(data, null, 2));
      
      if (data.ok === false) {
        console.error("[WORLDS] Azure returned ok:false, error:", data.error);
      } else {
        console.log("[WORLDS] World updated successfully");
      }
      
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
        return res.json({ ok: true, summaries: [] });
      }

      const data = JSON.parse(text);
      
      console.log("[WORLD SUMMARIES] Full Azure response:", JSON.stringify(data, null, 2));
      
      // Azure Function returns 'slices' array
      const rawSlices = data.slices || [];
      
      console.log("[WORLD SUMMARIES] Extracted slices array:", JSON.stringify(rawSlices, null, 2));
      
      // Transform to camelCase for frontend
      const summaries = rawSlices.map((slice: any) => ({
        fromUtc: slice.fromUtc,
        toUtc: slice.toUtc,
        createdUtc: slice.createdUtc,
        summary: slice.summary,
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
        requestBody.stream = 'false';  // Force non-streaming mode for Replit compatibility
        requestBody.model = worldSettings.model;
        requestBody.temperature = worldSettings.temperature;
        requestBody.maxTokens = worldSettings.maxTokens;
        requestBody.responseStyle = worldSettings.responseStyle;
        requestBody.conversationStyle = worldSettings.conversationStyle;
        requestBody.customPersonality = worldSettings.customPersonality;
        // Only include non-empty strings for optional fields
        requestBody.characters = worldSettings.characters || undefined;
        requestBody.events = worldSettings.events || undefined;
        requestBody.scenario = worldSettings.scenario || undefined;
        requestBody.places = worldSettings.places || undefined;
        requestBody.additionalSettings = worldSettings.additionalSettings || undefined;
        
        console.log("[CHAT] 🔍 DEBUG: worldSettings received:", worldSettings ? "YES" : "NO");
        console.log("[CHAT] 🔍 DEBUG: requestBody.action =", requestBody.action);
        console.log("[CHAT] 🔍 DEBUG: Full requestBody keys:", Object.keys(requestBody));
        console.log("[CHAT] Sending world chat with worldId:", requestBody.worldId, "model:", requestBody.model);
      } else {
        console.log("[CHAT] ⚠️  NO worldSettings - sending to GLOBAL chat");
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
      console.log("[CHAT] Response Content-Type:", response.headers.get('content-type'));

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[CHAT] Azure Function error response:", errorText);
        throw new Error(`Azure Function error: ${response.status} - ${errorText}`);
      }

      // Check if response is streaming (SSE) or regular JSON
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('text/event-stream')) {
        // Handle streaming response
        console.log('[CHAT] Detected streaming response, reading full stream...');
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        
        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fullText += decoder.decode(value, { stream: true });
          }
        }
        
        console.log('[CHAT] Full stream length:', fullText.length);
        console.log('[CHAT] First 200 chars of stream:', fullText.substring(0, 200));
        
        // Try to extract JSON from SSE format (data: {...})
        const lines = fullText.split('\n');
        let jsonData = null;
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              jsonData = JSON.parse(line.substring(6));
              if (jsonData.ok !== undefined || jsonData.ai || jsonData.reply) {
                break; // Found the main response
              }
            } catch (e) {
              // Not valid JSON, continue
            }
          }
        }
        
        if (!jsonData) {
          console.error('[CHAT] Failed to extract JSON from stream');
          throw new Error('Could not parse streaming response from Azure Function');
        }
        
        const data = jsonData;
        // SECURITY: Only log success/failure, NOT message content or AI response
        if (data.ok) {
          console.log('[CHAT] Response received successfully from stream');
        } else {
          console.error('[CHAT] Azure Function returned error in stream:', data.error || data.message || 'No error message provided');
        }
        res.json(data);
        return;
      }

      // Regular JSON response
      const text = await response.text();
      
      console.log('[CHAT] Response text length:', text.length);
      console.log('[CHAT] First 500 chars of response:', text.substring(0, 500));
      
      if (!text) {
        console.log('[CHAT] Empty response from Azure Function');
        throw new Error('Azure Function returned empty response');
      }

      const data = JSON.parse(text);
      // SECURITY: Only log success/failure, NOT message content or AI response
      if (data.ok) {
        console.log('[CHAT] Response received successfully');
      } else {
        console.error('[CHAT] Azure Function returned error response:');
        console.error('[CHAT] Error message:', data.error || data.message || 'No error message provided');
        console.error('[CHAT] Full response keys:', Object.keys(data));
        console.error('[CHAT] Full response (sanitized):', JSON.stringify(data, null, 2));
      }
      res.json(data);
    } catch (error) {
      console.error("Error calling Azure Function:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
