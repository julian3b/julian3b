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
AZURE_AUTH_LOGIN_URL=https://your-function-app.azurewebsites.net/api/login
AZURE_AUTH_SIGNUP_URL=https://your-function-app.azurewebsites.net/api/signup
AZURE_FUNCTION_KEY=your-api-key-here
```

## Azure Function Requirements

### 1. Login Function (`/api/login`)

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
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

### 2. Signup Function (`/api/signup`)

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
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

**Error Response (400):**
```json
{
  "success": false,
  "message": "Email already exists"
}
```

## Example Azure Function Code (Node.js)

### Login Function Example

```javascript
module.exports = async function (context, req) {
    const { email, password } = req.body;

    // TODO: Check credentials against your database
    // This is just an example - implement your own logic
    if (email && password === "correctPassword") {
        context.res = {
            status: 200,
            body: {
                success: true,
                email: email,
                name: "User Name",
                token: "your-generated-token"
            }
        };
    } else {
        context.res = {
            status: 401,
            body: {
                success: false,
                message: "Invalid email or password"
            }
        };
    }
};
```

### Signup Function Example

```javascript
module.exports = async function (context, req) {
    const { email, password, name } = req.body;

    // TODO: Store user in your database
    // This is just an example - implement your own logic
    
    // Check if email already exists
    const userExists = false; // TODO: Check your database
    
    if (userExists) {
        context.res = {
            status: 400,
            body: {
                success: false,
                message: "Email already exists"
            }
        };
        return;
    }

    // Create new user
    context.res = {
        status: 200,
        body: {
            success: true,
            email: email,
            name: name,
            token: "your-generated-token"
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
curl -X POST https://your-function-app.azurewebsites.net/api/login \
  -H "Content-Type: application/json" \
  -H "x-functions-key: YOUR_KEY" \
  -d '{"email":"test@example.com","password":"test123"}'
```

### Test Signup:
```bash
curl -X POST https://your-function-app.azurewebsites.net/api/signup \
  -H "Content-Type: application/json" \
  -H "x-functions-key: YOUR_KEY" \
  -d '{"email":"new@example.com","password":"pass123","name":"New User"}'
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
