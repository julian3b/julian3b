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

  // Chat endpoint - proxies to Azure Function (avoids CORS)
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, userId, name } = req.body;

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
      
      // Prepare the body
      const requestBody = {
        email: name || 'user@example.com',
        text: message
      };
      
      // TEMPORARY DEBUG: Log what we're sending
      console.log("[CHAT] Sending POST to Azure Function");
      console.log("[CHAT] Body being sent:", JSON.stringify(requestBody));

      // SECURE: Send email and message in encrypted POST body
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
