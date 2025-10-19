# AI Chatbot Application

## Overview

This is a full-stack AI chatbot web application built with React, Express, and TypeScript. The application features a modern chat interface with authentication, allowing users to have conversations with an AI assistant. The frontend is built using React with Vite, styled with Tailwind CSS and shadcn/ui components, while the backend is an Express server that proxies authentication requests to Azure Functions and handles chat interactions.

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
- `ChatInterface`: Main chat container managing message state and auto-scrolling
- `ChatMessage`: Individual message rendering with role-based styling (user vs AI)
- `ChatInput`: Textarea-based input with send functionality and auto-resize
- `TabNavigation`: Tab-based navigation system for multiple views
- `UserPanel`: Authentication panel as a side sheet with login/signup forms
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
- `/api/chat` - Handles chat message processing (implementation pending)

**Authentication Proxy Pattern:**
The application delegates authentication to Azure Functions rather than implementing auth directly. The Express server acts as a proxy, forwarding credentials to configured Azure Function endpoints and returning responses to the client. This allows for centralized authentication logic in Azure while keeping the web server lightweight.

**Storage Layer:**
- `IStorage` interface defining CRUD operations for users
- `MemStorage` implementation using in-memory Map structure
- Designed for easy swapping to database-backed storage (PostgreSQL expected via Drizzle ORM)

### Database Schema

**ORM:** Drizzle ORM configured for PostgreSQL

**Schema Definition:**
- `users` table with UUID primary key, username, and password fields
- Schema validation using Zod via drizzle-zod
- Migration support configured in `drizzle.config.ts`

**Note:** While Drizzle is configured and schema is defined, the application currently uses in-memory storage. Database integration is prepared but not actively used in the current implementation.

### External Dependencies

**Authentication Service:**
- Azure Functions for login and signup operations
- Environment variables required:
  - `AZURE_AUTH_LOGIN_URL`: Azure Function endpoint for login
  - `AZURE_AUTH_SIGNUP_URL`: Azure Function endpoint for signup
  - `AZURE_FUNCTION_KEY`: Optional API key for Azure Function authentication
- Communication via REST API with JSON payloads
- Expected response format includes success flag, user data, and optional auth token

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