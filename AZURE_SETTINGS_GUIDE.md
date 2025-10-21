# Azure Function Settings Implementation Guide

## Overview

Your application now has a comprehensive Settings panel where users can customize their AI chatbot experience. Your Azure Function needs to handle two new actions to save and retrieve these settings.

---

## Settings Structure

The settings object has the following structure:

```json
{
  "model": "gpt-3.5-turbo",           // AI model selection
  "temperature": 0.7,                 // Creativity level (0-2)
  "maxTokens": 2000,                  // Max response length (100-4000)
  "responseStyle": "balanced",        // concise | balanced | detailed
  "conversationStyle": "friendly",    // professional | casual | friendly | technical
  "customPersonality": ""             // Custom instructions (0-500 chars)
}
```

---

## Action 1: Get Settings

**Request Format:**
```json
{
  "email": "user@example.com",
  "action": "get_settings"
}
```

**Expected Response:**
```json
{
  "ok": true,
  "settings": {
    "model": "gpt-3.5-turbo",
    "temperature": 0.7,
    "maxTokens": 2000,
    "responseStyle": "balanced",
    "conversationStyle": "friendly",
    "customPersonality": "You are a helpful coding assistant..."
  }
}
```

**If user has no saved settings:**
```json
{
  "ok": true,
  "settings": null
}
```
*The frontend will use default values if settings is null.*

---

## Action 2: Save Settings

**Request Format:**
```json
{
  "email": "user@example.com",
  "action": "save_settings",
  "settings": {
    "model": "gpt-4",
    "temperature": 0.9,
    "maxTokens": 3000,
    "responseStyle": "detailed",
    "conversationStyle": "technical",
    "customPersonality": "You are an expert Python developer..."
  }
}
```

**Expected Response:**
```json
{
  "ok": true,
  "message": "Settings saved successfully"
}
```

---

## Using Settings in Chat

When a user sends a chat message, you should:

1. **Retrieve their settings** from your database
2. **Apply the settings** to the AI model call:
   - Use the selected `model` (gpt-3.5-turbo, gpt-4, gpt-4-turbo)
   - Set `temperature` parameter
   - Set `max_tokens` parameter
   - Build a system prompt based on `responseStyle`, `conversationStyle`, and `customPersonality`

**Example System Prompt Construction:**

```javascript
function buildSystemPrompt(settings) {
  let prompt = "You are a helpful AI assistant. ";
  
  // Apply conversation style
  if (settings.conversationStyle === "professional") {
    prompt += "Maintain a professional and formal tone. ";
  } else if (settings.conversationStyle === "casual") {
    prompt += "Be relaxed and conversational. ";
  } else if (settings.conversationStyle === "friendly") {
    prompt += "Be warm, approachable, and encouraging. ";
  } else if (settings.conversationStyle === "technical") {
    prompt += "Focus on technical accuracy and precision. ";
  }
  
  // Apply response style
  if (settings.responseStyle === "concise") {
    prompt += "Keep your responses brief and to the point. ";
  } else if (settings.responseStyle === "detailed") {
    prompt += "Provide thorough, comprehensive explanations. ";
  } else {
    prompt += "Provide balanced, clear responses. ";
  }
  
  // Add custom personality if provided
  if (settings.customPersonality) {
    prompt += settings.customPersonality;
  }
  
  return prompt;
}
```

---

## Implementation Example (Pseudo-code)

```javascript
module.exports = async function (context, req) {
  const { email, action, text, settings } = req.body;
  
  // Handle get_settings action
  if (action === "get_settings") {
    const userSettings = await database.getSettings(email);
    return {
      ok: true,
      settings: userSettings || null
    };
  }
  
  // Handle save_settings action
  if (action === "save_settings") {
    await database.saveSettings(email, settings);
    return {
      ok: true,
      message: "Settings saved successfully"
    };
  }
  
  // Handle regular chat (existing functionality)
  if (text) {
    // Get user's settings
    const userSettings = await database.getSettings(email) || getDefaultSettings();
    
    // Build system prompt
    const systemPrompt = buildSystemPrompt(userSettings);
    
    // Call OpenAI with user's preferences
    const response = await openai.chat.completions.create({
      model: userSettings.model,
      temperature: userSettings.temperature,
      max_tokens: userSettings.maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: text }
      ]
    });
    
    return {
      ok: true,
      ai: {
        reply: response.choices[0].message.content
      }
    };
  }
};
```

---

## Default Settings

If a user hasn't saved any settings, use these defaults:

```javascript
const DEFAULT_SETTINGS = {
  model: "gpt-3.5-turbo",
  temperature: 0.7,
  maxTokens: 2000,
  responseStyle: "balanced",
  conversationStyle: "friendly",
  customPersonality: ""
};
```

---

## Field Descriptions

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `model` | string | AI model to use | `gpt-3.5-turbo`, `gpt-4`, `gpt-4-turbo` |
| `temperature` | number | Creativity level | 0 to 2 |
| `maxTokens` | number | Max response length | 100 to 4000 |
| `responseStyle` | string | Verbosity level | `concise`, `balanced`, `detailed` |
| `conversationStyle` | string | Tone of responses | `professional`, `casual`, `friendly`, `technical` |
| `customPersonality` | string | Custom instructions | 0 to 500 characters |

---

## Testing

You can test the settings endpoints using curl:

```bash
# Get settings
curl -X POST "https://your-function.azurewebsites.net/api/echo?code=YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "action": "get_settings"
  }'

# Save settings
curl -X POST "https://your-function.azurewebsites.net/api/echo?code=YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "action": "save_settings",
    "settings": {
      "model": "gpt-4",
      "temperature": 0.9,
      "maxTokens": 3000,
      "responseStyle": "detailed",
      "conversationStyle": "technical",
      "customPersonality": "You are an expert developer"
    }
  }'
```

---

## Security Notes

- ✅ Email addresses are sent in POST body (secure)
- ✅ Settings are sent in POST body (secure)
- ✅ All data transmitted over HTTPS
- ✅ No sensitive data in URLs or logs

---

## Questions?

If you need help implementing these actions in your Azure Function, let me know!
