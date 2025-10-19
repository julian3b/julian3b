# Azure Function Authentication Setup

Your chatbot now requires authentication! Here's how to set up your Azure Functions to handle login and signup.

## How It Works

1. **User visits** → Sees landing page (can't access chat)
2. **User clicks "Get Started"** → Login/Signup panel opens
3. **User enters credentials** → Sent to your Azure Function for verification
4. **Azure Function validates** → Returns success or error
5. **Success** → User logged in, can now use chatbot

## Environment Variables Needed

Add these to your Replit Secrets (or `.env` file locally):

```bash
AZURE_AUTH_URL=https://your-function-app.azurewebsites.net/api/auth
AZURE_FUNCTION_KEY=your-api-key-here
```

Note: Both login and signup use the same Azure Function URL. The `action` query parameter determines which operation to perform.

## Azure Function Requirements

### 1. Login (`action=login`)

**Request (GET with Query Parameters):**
```
GET /api/auth?action=login&email=user@example.com&password=password123
```

**Success Response (200):**
```json
{
  "success": true,
  "email": "user@example.com",
  "name": "John Doe",
  "token": "optional-auth-token-here"
}
```

**Error Response (401/400):**
```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

### 2. Signup (`action=create account`)

**Request (GET with Query Parameters):**
```
GET /api/auth?action=create%20account&email=alice@example.com&password=Sup3rSecret!&name=Alice
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

## Example Azure Function Code (Node.js)

### Single Azure Function for Both Login and Signup

```javascript
module.exports = async function (context, req) {
    const { action, email, password, name } = req.query;

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

1. **Hash passwords** - Never store plain text passwords
   - Use bcrypt or similar: `bcrypt.hash(password, 10)`

2. **Use tokens** - Return a JWT or session token
   - Frontend stores it in localStorage
   - Send it with every chat request

3. **Validate inputs** - Check email format, password strength

4. **Rate limiting** - Prevent brute force attacks

5. **HTTPS only** - Azure Functions use HTTPS by default ✅

## Testing Your Setup

### Test Login:
```bash
curl "https://your-function-app.azurewebsites.net/api/auth?action=login&email=test@example.com&password=test123" \
  -H "x-functions-key: YOUR_KEY"
```

### Test Signup:
```bash
curl "https://your-function-app.azurewebsites.net/api/auth?action=create%20account&email=alice@example.com&password=Sup3rSecret!&name=Alice" \
  -H "x-functions-key: YOUR_KEY"
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
