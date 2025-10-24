# AI Chatbot Application

## Overview

This is a full-stack AI chatbot web application built with React, Express, and TypeScript. The application features a modern chat interface with authentication, allowing users to have conversations with an AI assistant. The frontend is built using React with Vite, styled with Tailwind CSS and shadcn/ui components, while the backend is an Express server that proxies authentication requests to Azure Functions and handles chat interactions.

## Recent Changes

- **October 24, 2025**: Updated AI model selection - Added 7 new models (GPT-5 Nano, GPT-4o Mini, GPT-5 Mini, GPT-5, GPT-4o, GPT-4.5, o1-Pro) ordered from cheapest to most expensive with pricing information (input/output tokens per 1M) displayed in both Settings and World Settings
- **October 24, 2025**: Fixed world chat history ordering - Azure returns world history in descending order (newest first), so we reverse the array to display messages chronologically (oldest to newest)
- **October 24, 2025**: Implemented always-fresh message loading - world and global chat history now refetch from Azure every time you switch tabs/worlds or send messages, ensuring you always see the latest conversations
- **October 23, 2025**: Enhanced message timestamps - all messages now display date in mm/dd/yyyy hh:mm format
- **October 23, 2025**: Implemented world-specific chat history loading - each world now automatically loads its previous conversations from Azure Table Storage using action=getworldchats
- **October 22, 2025**: Implemented world-specific chat messaging - messages sent from a world now include action=addworldchat with worldId and all world settings (model, temperature, maxTokens, responseStyle, conversationStyle, customPersonality, characters, events, scenario, places, additionalSettings)
- **October 22, 2025**: Increased character limits to 5,000 for all world-building fields (customPersonality, characters, events, scenario, places, additionalSettings)
- **October 22, 2025**: Integrated worlds with Azure Table Storage - all world CRUD operations now use Azure Function actions (createworld, getworlds, updateworld, deleteworld)
- **October 22, 2025**: Added world-building fields to World Settings - characters, events, scenario, places, and additional settings for rich context
- **October 22, 2025**: Redesigned interface - "World Settings" tab for configuration, dynamic tabs for each world's dedicated chat
- **October 22, 2025**: Implemented "Worlds" feature - users can create separate chat contexts with their own AI settings and personalities
- **October 22, 2025**: Expanded AI customization options - added 6 response styles and 9 conversation styles for enhanced personalization
- **October 21, 2025**: Added conversation history context to chat messages - AI now receives last 10 messages for conversation context
- **October 21, 2025**: Implemented comprehensive settings panel with AI customization options (model, temperature, response style, etc.)
- **October 21, 2025**: Added automatic chat history loading on user authentication

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:**
- React 18 with TypeScript
- Vite for build tooling and development server
- Wouter for client-side routing
- TanStack Query (React Query) for server state management
- Tailwind CSS with custom design system
- shadcn/ui component library (Radix UI primitives)

**Design System:**
- Inspiration drawn from Linear, Slack, Discord (modern productivity tools)
- Conversation-first approach with minimal distractions
- Dual theme support (dark mode primary, light mode optional)
- Custom color palette using HSL values with CSS variables
- Typography using Inter for UI and JetBrains Mono for code
- Consistent spacing system based on Tailwind units

**Key Components:**
- `ChatInterface`: Main chat container managing message state, auto-scrolling, history loading, and world selection
- `ChatMessage`: Individual message rendering with role-based styling (user vs AI)
- `ChatInput`: Textarea-based input with send functionality and auto-resize
- `TabNavigation`: Tab-based navigation system for multiple views
- `UserPanel`: Tabbed authentication panel with Profile and Settings sections
- `UserSettings`: Comprehensive AI customization panel with model selection, temperature control, and personality settings
- `Worlds`: World management interface for creating and configuring separate chat contexts
- `LandingPage`: Pre-authentication landing page with feature highlights
- `ThemeProvider`: Context-based theme management with localStorage persistence

**State Management:**
- User authentication state stored in localStorage
- Persistent user ID generation for tracking returning users
- Theme preference stored in localStorage
- React Query for API data fetching and caching

### Backend Architecture

**Technology Stack:**
- Express.js with TypeScript
- Node.js runtime
- Vite middleware for development HMR
- In-memory storage implementation (expandable to database)

**Server Structure:**
- Development and production modes with different build processes
- Custom logging middleware for API request tracking
- Error handling middleware with status code normalization
- Static file serving in production via compiled Vite build

**API Endpoints:**
- `/api/auth/login` - Proxies to Azure Function for user authentication
- `/api/auth/signup` - Proxies to Azure Function for user registration
- `/api/chat` - Proxies chat messages to Azure Function with user email, text, and history. When sending from a world context, includes action=addworldchat, worldId, and all world settings (model, temperature, maxTokens, responseStyle, conversationStyle, customPersonality, characters, events, scenario, places, additionalSettings). When sending from Default (Global Settings), sends message without action field.
- `/api/chat/history` - Retrieves global conversation history for authenticated users
- `/api/chat/world-history` - Retrieves world-specific conversation history using action=getworldchats with email and worldId parameters
- `/api/settings/get` - Fetches user's AI preferences from Azure Function
- `/api/settings/save` - Saves user's AI preferences to Azure Function
- `/api/worlds` (GET) - Proxies to Azure Function with "getworlds" action to retrieve all worlds from Azure Table Storage
- `/api/worlds` (POST) - Proxies to Azure Function with "createworld" action to create a new world in Azure Table Storage
- `/api/worlds/:id` (PUT) - Proxies to Azure Function with "updateworld" action to update an existing world in Azure Table Storage
- `/api/worlds/:id` (DELETE) - Proxies to Azure Function with "deleteworld" action to delete a world from Azure Table Storage

**Authentication Proxy Pattern:**
The application delegates authentication to Azure Functions rather than implementing auth directly. The Express server acts as a proxy, forwarding credentials to configured Azure Function endpoints and returning responses to the client. This allows for centralized authentication logic in Azure while keeping the web server lightweight.

**Storage Layer:**
- `IStorage` interface defining CRUD operations for users and worlds
- `MemStorage` implementation using in-memory Map structure for both users and worlds
- Designed for easy swapping to database-backed storage (PostgreSQL expected via Drizzle ORM)

**Worlds Feature:**
Worlds are separate chat contexts that allow users to create different AI personalities with unique settings. Each world maintains its own:
- Name and description
- AI model selection (GPT-3.5 Turbo, GPT-4, GPT-4 Turbo)
- Temperature, max tokens, response style, conversation style
- Custom personality instructions
- Characters, events, scenario, places, and additional settings (context fields for rich world-building)
- Independent conversation history stored in Azure Table Storage and loaded automatically when opening a world tab

When a user selects a world in the chat interface, all messages in that conversation use the world's specific AI settings instead of the global user settings. This enables use cases like:
- A "Coding Assistant" world with technical conversation style and step-by-step response format
- A "Creative Writer" world with higher temperature and enthusiastic conversation style
- A "Math Tutor" world with detailed responses and academic tone

World settings are sent as per-request overrides to the Azure Function, allowing the same Azure Function code to handle both global settings and world-specific settings.

### Database Schema

**ORM:** Drizzle ORM configured for PostgreSQL

**Schema Definition:**
- `users` table with UUID primary key, username, and password fields
- `userSettingsSchema` - Zod schema defining AI customization preferences:
  - `model`: AI model selection (gpt-3.5-turbo, gpt-4, gpt-4-turbo)
  - `temperature`: Creativity level (0-2, default 0.7)
  - `maxTokens`: Response length limit (100-4000, default 2000)
  - `responseStyle`: Response format (concise, balanced, detailed, comprehensive, bullet-points, step-by-step)
  - `conversationStyle`: Tone and personality (professional, casual, friendly, technical, enthusiastic, witty, empathetic, academic, socratic)
  - `customPersonality`: Custom system prompt (0-5000 characters)
- `worldSchema` - Zod schema for separate chat contexts with unique AI personalities:
  - `id`: Unique world identifier
  - `userId`: Owner of the world
  - `name`: Display name (1-100 characters)
  - `description`: Optional description (0-500 characters)
  - All AI settings fields from userSettingsSchema
  - `characters`: Character descriptions (0-5000 characters)
  - `events`: Event descriptions and timeline (0-5000 characters)
  - `scenario`: Scenario or context description (0-5000 characters)
  - `places`: Location and setting descriptions (0-5000 characters)
  - `additionalSettings`: Additional custom settings or notes (0-5000 characters)
  - `createdAt`: Timestamp of creation
- Schema validation using Zod via drizzle-zod
- Migration support configured in `drizzle.config.ts`

**Note:** While Drizzle is configured and schema is defined, the application currently uses in-memory storage. Database integration is prepared but not actively used in the current implementation.

### External Dependencies

**Azure Functions Integration:**
- Azure Functions handle authentication, chat, history, and settings storage
- Environment variables required:
  - `AZURE_AUTH_URL`: Azure Function endpoint for authentication (login/signup)
  - `AZURE_FUNCTION_URL`: Azure Function endpoint for chat and settings operations
  - `AZURE_FUNCTION_KEY`: Optional API key for Azure Function authentication
- Communication via REST API with JSON payloads over HTTPS
- All sensitive data (passwords, emails, messages, settings) sent in encrypted POST body

**Supported Azure Function Actions:**
- `login` - User authentication
- `create account` - User registration
- Chat (no action field) - Send message from Default (Global Settings) with conversation history using user's saved AI preferences
- `addworldchat` - Send message from a specific world context with worldId and all world settings (model, temperature, maxTokens, responseStyle, conversationStyle, customPersonality, characters, events, scenario, places, additionalSettings)
- `history` - Retrieve user's global conversation history
- `getworldchats` - Retrieve world-specific conversation history using email and worldid parameters
- `getSettings` - Fetch user's AI preferences
- `saveSettings` - Persist user's AI preferences
- `createworld` - Create a new world and store in Azure Table Storage
- `getworlds` - Retrieve all worlds for a user from Azure Table Storage
- `editworld` - Update an existing world in Azure Table Storage (takes email, rowKey, and all world parameters)
- `deleteworld` - Delete a world from Azure Table Storage

**Security Implementation:**
- All credentials, messages, and settings transmitted in POST request body (never in URL)
- No sensitive data logged on server or client
- HTTPS encryption for all API communication
- Dedicated authentication endpoint separate from chat endpoint

**Database (Configured but Not Active):**
- Neon Serverless PostgreSQL via `@neondatabase/serverless`
- Connection string stored in `DATABASE_URL` environment variable
- Drizzle ORM for schema management and queries

**UI Component Libraries:**
- Radix UI primitives for accessible, unstyled components
- Multiple Radix packages for dialogs, dropdowns, tabs, etc.
- shadcn/ui configuration for styled component variants

**Build and Development Tools:**
- Vite plugins for development experience (Replit-specific plugins for error overlay, cartographer, dev banner)
- TypeScript for type safety across client and server
- PostCSS with Tailwind CSS for styling
- esbuild for production server bundling

**Third-Party Utilities:**
- `nanoid` for unique ID generation
- `date-fns` for date formatting
- `clsx` and `tailwind-merge` for conditional className handling
- `class-variance-authority` for component variant management

**Session Management (Configured):**
- `connect-pg-simple` for PostgreSQL-backed session storage
- Prepared for future session-based authentication if needed