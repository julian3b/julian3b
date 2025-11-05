# AI Chatbot Application

## Overview

This is a full-stack AI chatbot web application designed to provide a modern, interactive conversational experience with an AI assistant. Built with React, Express, and TypeScript, the application focuses on user authentication, personalized AI interactions, and a unique "Worlds" feature for creating distinct AI personalities and contexts. The project aims to offer a highly customizable and engaging platform for diverse conversational needs, from productivity to creative roleplay.

## Recent Changes

- **October 31, 2025**: Fixed main chat perpetual loading state - set isInitialLoad to false when on main chat with no world selected, resolving infinite loading spinner issue
- **October 30, 2025**: Added auto-scroll to bottom on message send - page automatically scrolls to bottom when user sends message and when AI response arrives, ensuring newest messages are always visible
- **October 30, 2025**: Fixed message ordering to display chronologically - added both server-side and client-side sorting to ensure all chat messages always display in chronological order (oldest at top, newest at bottom); Azure was returning messages in inconsistent order, now sorted by createdUtc timestamp in ascending order for both global and world chats with double-layer sorting for reliability
- **October 30, 2025**: Fixed chat 500 errors for world messages - changed backend to omit empty optional fields (characters, events, scenario, places, additionalSettings) instead of sending empty strings to Azure Function
- **November 5, 2025**: Fixed world settings persistence - disabled React Query auto-refetching (refetchOnMount, refetchOnWindowFocus) to prevent stale Azure data from overwriting optimistic updates; world edits now persist throughout the session even though Azure has a bug where editworld returns 200 OK without actually saving changes
- **November 5, 2025**: Increased character field limits from 5,000 to 10,000 characters for all world context fields (characters, events, scenario, places, additionalSettings) and customPersonality
- **October 30, 2025**: Fixed world settings save issue - implemented permanent optimistic updates without refetch; Azure Function has bug where editworld returns 200 OK but doesn't persist changes (UpdatedUtc never updates), so changes only persist in browser cache until Azure backend is fixed
- **October 28, 2025**: Implemented infinite scroll pagination for world chat messages - displays 10 newest messages initially, automatically loads next 10 older messages when scrolling to top; maintains scroll position when prepending history using continuationToken from Azure
- **October 28, 2025**: Fixed email verification parameter name - changed from `code` to `codeverify` in verifycode endpoint to match Azure Function expectations
- **October 26, 2025**: Added email verification to signup flow - new users receive verification code via email (sendcode action), enter 6-digit code in OTP input, system verifies code (verifycode action with codeverify parameter) before granting access; includes resend functionality with 60-second cooldown timer
- **October 26, 2025**: Implemented full internationalization (i18n) - application now supports English and Spanish with automatic language detection based on browser locale; Spanish-speaking regions get Spanish by default, with manual language switcher in user settings
- **October 26, 2025**: Fixed ChatInput send button positioning - button now properly displays inside the textarea on the right side instead of outside on the left
- **October 25, 2025**: Fixed world summary date display - corrected backend to extract `slices` array from Azure response instead of `items`/`summaries`, properly displaying "Last Summary" dates in World Settings
- **October 25, 2025**: Fixed Azure Function parameter naming - changed `worldId` to `worldid` (lowercase) in GET summaries request to match Azure Function expectations
- **October 25, 2025**: Added world summary feature - new "Summarize" button in World Settings creates AI-generated summaries of world chat history, with "Last Summary" date displayed below Conversation Style
- **October 25, 2025**: Added delete message functionality for world chats - each message in world chats now has a trash icon button that allows users to delete individual messages from Azure storage
- **October 25, 2025**: Fixed message display to include full Azure message IDs - ensures all message data from Azure is properly stored and accessible for operations like deletion
- **October 24, 2025**: Moved World Settings to icon-based navigation - replaced tab with globe icon button next to user menu, hidden when not logged in for cleaner interface
- **October 24, 2025**: Made world headers clickable in World Settings - clicking a world card header navigates directly to that world's chat tab for faster access

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:** React 18 with TypeScript, Vite, Wouter (routing), TanStack Query (server state), Tailwind CSS, shadcn/ui.

**Design System:** Modern, conversation-first interface inspired by productivity tools like Linear, Slack, and Discord. Features a custom color palette, Inter and JetBrains Mono typography, and dual theme support (dark mode primary).

**Key Components & Features:**
- `ChatInterface`: Manages chat state, auto-scrolling, history.
- `ChatMessage`: Displays individual messages with delete functionality for world chats.
- `ChatInput`: Textarea with send button positioned inside the input field on the right.
- `TabNavigation`: For multiple views and world-specific chats.
- `UserPanel` & `UserSettings`: Authentication, profile, comprehensive AI customization (model, temperature, response/conversation styles, custom personality), and language selection.
- `Worlds`: Interface for managing separate chat contexts, each with unique AI settings and dedicated conversation history. This feature enables varied use cases like "Coding Assistant" or "Creative Writer" personalities.
- `LandingPage`: Pre-authentication entry point.
- `ThemeProvider`: Context-based theme management.
- **Internationalization (i18n)**: Full multi-language support with automatic detection and manual override.

**State Management:** User authentication, persistent user ID, theme preferences, and language preference are stored in `localStorage`. React Query handles API data fetching and caching.

**Internationalization (i18n):** Implemented using i18next and react-i18next with automatic language detection via i18next-browser-languagedetector. Supports English (default) and Spanish, with automatic detection based on browser locale. Spanish-speaking countries (es-*, es-MX, es-ES, etc.) automatically display Spanish UI. Users can manually override language selection via language switcher in user settings. Translation files located at `client/src/i18n/locales/en.json` and `client/src/i18n/locales/es.json` contain 100+ translation keys covering all UI text, labels, buttons, and messages. User-generated content (world names, chat messages, AI responses) remains in original language.

### Backend Architecture

**Technology Stack:** Express.js with TypeScript, Node.js.

**Core Functionality:**
- Serves as an API gateway, proxying requests to Azure Functions.
- Handles authentication and chat interactions.
- Manages CRUD operations for user settings and "Worlds."

**API Endpoints:**
- `/api/auth/login`, `/api/auth/signup`: Proxies to Azure Functions for authentication.
- `/api/auth/sendcode`: Sends email verification code to user (action: 'sendcode', email: user email).
- `/api/auth/verifycode`: Verifies email verification code (action: 'verifycode', email: user email, codeverify: 6-digit code user typed).
- `/api/chat`: Proxies chat messages to Azure Functions, supporting global settings or world-specific overrides including detailed world context (characters, events, scenario, etc.).
- `/api/chat/history`: Retrieves global chat history from Azure.
- `/api/chat/world-history`: Retrieves world-specific chat history with pagination support (take: page size default 10, continuationToken: optional token for loading older messages).
- `/api/chat/world-message` (DELETE): Deletes individual messages from world chats.
- `/api/settings/get`, `/api/settings/save`: Manages user AI preferences.
- `/api/worlds` (GET, POST, PUT, DELETE): Manages "Worlds" creation, retrieval, updates, and deletion in Azure.
- `/api/worlds/:worldId/summaries` (GET, POST): Retrieves world summaries and creates new AI-generated summaries of world chat history.

**Authentication Proxy Pattern:** Express server forwards authentication requests to Azure Functions, centralizing authentication logic.

**Storage Layer:** Uses an `IStorage` interface with an in-memory `MemStorage` implementation for users and worlds, designed for easy transition to database-backed storage (e.g., PostgreSQL via Drizzle ORM).

### Database Schema

**ORM:** Drizzle ORM configured for PostgreSQL.

**Schema Definitions (via Zod and drizzle-zod):**
- `users`: Stores user credentials.
- `userSettingsSchema`: Defines AI customization preferences including model, temperature, max tokens, response style, conversation style, and custom personality. Supports a wide range of AI models (e.g., GPT-5 Nano, GPT-4o, o1-Pro).
- `worldSchema`: Defines structure for "Worlds," each with its own AI settings, name, description, and rich context fields (characters, events, scenario, places, additional settings) up to 10,000 characters each.

**Note:** Database integration is prepared with Drizzle ORM and schema definitions, but the application currently utilizes in-memory storage.

## External Dependencies

**Azure Functions:**
- Primary backend for authentication (`AZURE_AUTH_URL`), chat, history, and settings storage (`AZURE_FUNCTION_URL`).
- All communication is via REST API with JSON payloads over HTTPS.
- Supports actions for login, account creation, global chat, world-specific chat (`addworldchat`), history retrieval (`history`, `getworldchats`), setting management (`getSettings`, `saveSettings`), world CRUD operations (`createworld`, `getworlds`, `editworld`, `deleteworld`), message deletion (`deleteworldmessage`), and world summaries (`getworldsummaries`, `createworldsummary`).

**Database (Configured but Not Active):**
- Neon Serverless PostgreSQL via `@neondatabase/serverless`.

**UI Component Libraries:**
- Radix UI: Provides accessible, unstyled primitives.
- shadcn/ui: Styled component variants built on Radix UI.

**Build and Development Tools:**
- Vite: For fast development and bundling.
- TypeScript: For type safety.
- PostCSS with Tailwind CSS: For styling.

**Third-Party Utilities:**
- `nanoid`: For unique ID generation.
- `date-fns`: For date formatting.
- `clsx`, `tailwind-merge`, `class-variance-authority`: For robust className management.