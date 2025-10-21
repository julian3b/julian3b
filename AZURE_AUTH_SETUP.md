# Azure Function Authentication Setup - SECURE VERSION

Your chatbot now requires authentication with **SECURE credential handling**! Passwords are sent in encrypted POST bodies, not URL parameters.

## How It Works

1. **User visits** → Sees landing page (can't access chat)
2. **User clicks "Get Started"** → Login/Signup panel opens
3. **User enters credentials** → Sent **securely** via HTTPS POST body to your Azure Function
4. **Azure Function validates** → Returns success or error
5. **Success** → User logged in, can now use chatbot

## Environment Variables Needed

Add these to your Replit Secrets (or `.env` file locally):

```bash
# IMPORTANT: Use a DEDICATED auth endpoint, NOT your chat endpoint
AZURE_AUTH_URL=https://your-function-app.azurewebsites.net/api/auth
AZURE_FUNCTION_KEY=your-api-key-here
```

**SECURITY NOTE:** 
- The `AZURE_AUTH_URL` should be **separate** from any chat or message endpoints
- Credentials are sent in encrypted POST request body, **NOT** in URL query parameters
- This prevents passwords from appearing in server logs, browser history, or proxy logs

## Azure Function Requirements (SECURE POST-based)

### 1. Login (`action=login`)

**Request (SECURE POST with JSON body):**
```http
POST /api/auth?code=YOUR_FUNCTION_KEY
Content-Type: application/json

{
  "action": "login",
  "email": "user@example.com",
  "password": "password123"
}
```

**Success Response (200):**
```json
{
  "ok": true,
  "email": "user@example.com",
  "name": "John Doe",
  "token": "optional-auth-token-here"
}
```

**Error Response (401/400):**
```json
{
  "ok": false,
  "error": "Invalid credentials"
}
```

### 2. Signup (`action=create account`)

**Request (SECURE POST with JSON body):**
```http
POST /api/auth?code=YOUR_FUNCTION_KEY
Content-Type: application/json

{
  "action": "create account",
  "email": "alice@example.com",
  "password": "Sup3rSecret!",
  "name": "Alice"
}
```

**Success Response (200):**
```json
{
  "ok": true,
  "email": "alice@example.com",
  "name": "Alice",
  "token": "optional-auth-token-here"
}
```

**Error Response (400):**
```json
{
  "ok": false,
  "error": "User already exists."
}
```

## Example Azure Function Code (Node.js) - SECURE VERSION

### Single Azure Function for Both Login and Signup

```javascript
module.exports = async function (context, req) {
    // SECURE: Read credentials from POST body, not URL query parameters
    const { action, email, password, name } = req.body;

    // Handle signup (create account)
    if (action === "create account") {
        // TODO: Check if email already exists in your database
        const userExists = false; // TODO: Check your database
        
        if (userExists) {
            context.res = {
                status: 200,
                body: {
                    ok: false,
                    error: "User already exists."
                }
            };
            return;
        }

        // TODO: Store user in your database
        // Create new user
        context.res = {
            status: 200,
            body: {
                ok: true,
                email: email,
                name: name,
                token: "your-generated-token"
            }
        };
        return;
    }

    // Handle login
    if (action === "login") {
        // TODO: Check credentials against your database
        const isValid = false; // TODO: Validate credentials
        
        if (isValid) {
            context.res = {
                status: 200,
                body: {
                    ok: true,
                    email: email,
                    name: "User Name",
                    token: "your-generated-token"
                }
            };
        } else {
            context.res = {
                status: 200,
                body: {
                    ok: false,
                    error: "Invalid email or password"
                }
            };
        }
        return;
    }

    // Unknown action
    context.res = {
        status: 400,
        body: {
            ok: false,
            error: "Unknown action"
        }
    };
};
```

## Security Recommendations

1. **✅ IMPLEMENTED: POST with body** - Credentials sent in encrypted POST body, not URL
   - Prevents password exposure in server logs, browser history, and proxy logs
   - HTTPS encrypts the entire request body

2. **Hash passwords** - Never store plain text passwords
   - Use bcrypt or similar: `bcrypt.hash(password, 10)`

3. **Use tokens** - Return a JWT or session token
   - Frontend stores it in localStorage
   - Send it with every chat request

4. **Validate inputs** - Check email format, password strength

5. **Rate limiting** - Prevent brute force attacks

6. **Separate endpoints** - Use dedicated auth endpoint, not your chat endpoint

7. **HTTPS only** - Azure Functions use HTTPS by default ✅

## Testing Your Setup (SECURE POST method)

### Test Login:
```bash
curl -X POST "https://your-function-app.azurewebsites.net/api/auth?code=YOUR_KEY" \
  -H "Content-Type: application/json" \
  -H "x-functions-key: YOUR_KEY" \
  -d '{"action":"login","email":"test@example.com","password":"test123"}'
```

### Test Signup:
```bash
curl -X POST "https://your-function-app.azurewebsites.net/api/auth?code=YOUR_KEY" \
  -H "Content-Type: application/json" \
  -H "x-functions-key: YOUR_KEY" \
  -d '{"action":"create account","email":"alice@example.com","password":"Sup3rSecret!","name":"Alice"}'
```

## What's Already Implemented

✅ Landing page for non-authenticated users  
✅ Login/Signup UI panel  
✅ Backend proxy routes (`/api/auth/login` and `/api/auth/signup`)  
✅ localStorage for storing user session  
✅ Conditional rendering (chat only shows when logged in)  
✅ User profile panel with logout  

## Next Steps

1. Create your Azure Functions for `/api/login` and `/api/signup`
2. Add the Azure Function URLs to Replit Secrets
3. Test login/signup flow
4. (Optional) Add a database to store users (Cosmos DB, SQL, etc.)
5. (Optional) Implement proper JWT tokens for security

## Current Behavior (Without Azure Functions)

Right now, if you try to login/signup, you'll get an error because the Azure Function URLs aren't set. 

**To test the UI without Azure Functions:**
- Remove the fetch calls temporarily and just store dummy data
- Or set up mock Azure Functions that always return success

---

Need help? Let me know and I can help you set up the Azure Functions!
