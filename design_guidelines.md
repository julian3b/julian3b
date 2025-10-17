# Design Guidelines: AI Chatbot Web Application

## Design Approach
**Selected Approach**: Design System - Modern Productivity Tool
**Inspiration**: Linear, Slack, Discord (clean communication interfaces)
**Rationale**: Chat applications require clarity, readability, and efficient information hierarchy. Following established productivity tool patterns ensures intuitive UX.

## Core Design Principles
- **Conversation-First**: Chat interface is the hero - everything supports the conversation flow
- **Minimal Distraction**: Clean UI that keeps focus on the dialogue
- **Scannable History**: Clear visual distinction between user and AI messages
- **Instant Clarity**: Tab states and active conversations immediately apparent

## Color Palette

**Dark Mode Primary** (default):
- Background: 222 15% 12% (deep charcoal)
- Surface: 222 14% 16% (elevated panels)
- Border: 222 10% 24% (subtle separation)
- Primary: 221 83% 53% (vibrant blue for CTAs)
- Text Primary: 0 0% 98%
- Text Secondary: 0 0% 71%
- AI Message Bg: 222 14% 19% (slightly elevated)
- User Message Bg: 221 83% 53% (primary blue)

**Light Mode** (optional toggle):
- Background: 0 0% 100%
- Surface: 0 0% 98%
- Border: 220 13% 91%
- Primary: 221 83% 53%
- Text Primary: 0 0% 9%
- Text Secondary: 0 0% 45%

## Typography

**Font Families**:
- Primary: 'Inter', system-ui, sans-serif (body, UI)
- Monospace: 'JetBrains Mono', monospace (code blocks)

**Scale**:
- Tab Labels: text-sm font-medium (14px, 500 weight)
- Chat Messages: text-base (16px) for readability
- Timestamps: text-xs text-secondary (12px)
- Input Field: text-base
- Headings: text-lg font-semibold for section titles

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12
- Consistent padding: p-4, p-6, p-8
- Message gaps: space-y-4
- Tab gaps: gap-2
- Container margins: mx-auto max-w-4xl

**Structure**:
```
Fixed Header (Tab Bar) - h-14
Main Content Area - flex-1 overflow-hidden
Chat Container - max-w-4xl mx-auto
Input Area - Fixed bottom or within flow
```

## Component Library

### Tab Navigation
- **Position**: Top of viewport, full-width bar
- **Style**: Borderless buttons with active indicator (bottom border 2px primary)
- **States**: 
  - Active: primary color text, bottom border
  - Inactive: secondary text, hover brightens
- **Layout**: flex gap-2, px-6 py-3

### Chat Interface
- **Message Bubbles**:
  - AI Messages: Left-aligned, surface background, rounded-2xl, p-4, max-w-3xl
  - User Messages: Right-aligned, primary background, white text, rounded-2xl, p-4, max-w-xl
  - Spacing: space-y-6 between messages
- **Avatar/Icons**: 
  - AI: Robot icon (Heroicons) or circle with "AI" text
  - User: User icon or initials circle
  - Size: w-8 h-8, positioned top of message

### Input Area
- **Container**: Sticky bottom, border-t, backdrop-blur, p-4
- **Text Input**: 
  - Large textarea, min-h-12, rounded-xl
  - Border: border-2 on focus (primary)
  - Placeholder: "Type your message..."
- **Send Button**: 
  - Icon button (paper airplane) or text "Send"
  - Primary background, hover:brightness-110
  - Positioned: absolute right-2 top-2 within input container

### Placeholder Tab Content
- **Layout**: Centered content, flex flex-col items-center justify-center
- **Style**: text-secondary, helpful prompt like "This tab is ready for your content"
- **Spacing**: p-12

## Visual Enhancements

**Message Timestamps**: 
- text-xs text-secondary, opacity-70
- Position: Below message, pl-12 (aligned with message start)

**Typing Indicator** (AI responding):
- Three animated dots (scale pulse)
- Surface background bubble, w-16 h-10
- Left-aligned like AI messages

**Scroll Behavior**:
- Chat auto-scrolls to bottom on new messages
- Smooth scroll: scroll-smooth class
- Show "New message" prompt if scrolled up

**Focus States**:
- Input: ring-2 ring-primary on focus
- Buttons: ring-offset-2 ring-2 on keyboard focus

## Interaction Patterns

- **Tab Switching**: Instant (no animation), content cross-fades
- **Message Send**: Optimistic UI - show user message immediately
- **Loading**: Simple spinner or pulsing dot for AI responses
- **Empty State**: Welcoming prompt in chat ("Hi! I'm your AI assistant...")

## Accessibility
- Tab navigation: Full keyboard support (arrow keys, Enter)
- Chat: Proper focus management, skip to input
- ARIA labels: "Chat tab", "AI message", "User message"
- Color contrast: WCAG AAA for text (7:1 minimum)

## No Images Required
This is a utility application - focus on clean typography and functional UI over decorative imagery.