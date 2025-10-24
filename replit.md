# AI Chatbot Application

## Overview

This is a full-stack AI chatbot web application designed to provide a modern, interactive conversational experience with an AI assistant. Built with React, Express, and TypeScript, the application focuses on user authentication, personalized AI interactions, and a unique "Worlds" feature for creating distinct AI personalities and contexts. The project aims to offer a highly customizable and engaging platform for diverse conversational needs, from productivity to creative roleplay.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Technology Stack:** React 18 with TypeScript, Vite, Wouter (routing), TanStack Query (server state), Tailwind CSS, shadcn/ui.

**Design System:** Modern, conversation-first interface inspired by productivity tools like Linear, Slack, and Discord. Features a custom color palette, Inter and JetBrains Mono typography, and dual theme support (dark mode primary).

**Key Components & Features:**
- `ChatInterface`: Manages chat state, auto-scrolling, history.
- `ChatMessage`: Displays individual messages.
- `ChatInput`: Textarea with send functionality.
- `TabNavigation`: For multiple views and world-specific chats.
- `UserPanel` & `UserSettings`: Authentication, profile, and comprehensive AI customization (model, temperature, response/conversation styles, custom personality).
- `Worlds`: Interface for managing separate chat contexts, each with unique AI settings and dedicated conversation history. This feature enables varied use cases like "Coding Assistant" or "Creative Writer" personalities.
- `LandingPage`: Pre-authentication entry point.
- `ThemeProvider`: Context-based theme management.

**State Management:** User authentication, persistent user ID, and theme preferences are stored in `localStorage`. React Query handles API data fetching and caching.

### Backend Architecture

**Technology Stack:** Express.js with TypeScript, Node.js.

**Core Functionality:**
- Serves as an API gateway, proxying requests to Azure Functions.
- Handles authentication and chat interactions.
- Manages CRUD operations for user settings and "Worlds."

**API Endpoints:**
- `/api/auth/login`, `/api/auth/signup`: Proxies to Azure Functions for authentication.
- `/api/chat`: Proxies chat messages to Azure Functions, supporting global settings or world-specific overrides including detailed world context (characters, events, scenario, etc.).
- `/api/chat/history`, `/api/chat/world-history`: Retrieves global and world-specific chat histories from Azure.
- `/api/settings/get`, `/api/settings/save`: Manages user AI preferences.
- `/api/worlds` (GET, POST, PUT, DELETE): Manages "Worlds" creation, retrieval, updates, and deletion in Azure.

**Authentication Proxy Pattern:** Express server forwards authentication requests to Azure Functions, centralizing authentication logic.

**Storage Layer:** Uses an `IStorage` interface with an in-memory `MemStorage` implementation for users and worlds, designed for easy transition to database-backed storage (e.g., PostgreSQL via Drizzle ORM).

### Database Schema

**ORM:** Drizzle ORM configured for PostgreSQL.

**Schema Definitions (via Zod and drizzle-zod):**
- `users`: Stores user credentials.
- `userSettingsSchema`: Defines AI customization preferences including model, temperature, max tokens, response style, conversation style, and custom personality. Supports a wide range of AI models (e.g., GPT-5 Nano, GPT-4o, o1-Pro).
- `worldSchema`: Defines structure for "Worlds," each with its own AI settings, name, description, and rich context fields (characters, events, scenario, places, additional settings) up to 5,000 characters each.

**Note:** Database integration is prepared with Drizzle ORM and schema definitions, but the application currently utilizes in-memory storage.

## External Dependencies

**Azure Functions:**
- Primary backend for authentication (`AZURE_AUTH_URL`), chat, history, and settings storage (`AZURE_FUNCTION_URL`).
- All communication is via REST API with JSON payloads over HTTPS.
- Supports actions for login, account creation, global chat, world-specific chat (`addworldchat`), history retrieval (`history`, `getworldchats`), setting management (`getSettings`, `saveSettings`), and world CRUD operations (`createworld`, `getworlds`, `editworld`, `deleteworld`).

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