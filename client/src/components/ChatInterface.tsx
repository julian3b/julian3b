import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { World } from "@shared/schema";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  azureMessageId?: string; // Row key from Azure for deletion
};

type ChatInterfaceProps = {
  onSendMessage: (message: string, history: Message[], worldSettings?: any) => Promise<any>;
  initialMessages?: Message[];
  userId: string;
  userEmail: string;
  world?: World; // Optional preset world for dedicated world chats
};

export function ChatInterface({
  onSendMessage,
  initialMessages = [],
  userId,
  userEmail,
  world,
}: ChatInterfaceProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWorldId, setSelectedWorldId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  
  // Pagination state for infinite scroll
  const [continuationToken, setContinuationToken] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Only fetch worlds if this is the main chat (not a dedicated world chat)
  const { data: worldsData } = useQuery<{ ok: boolean; worlds: World[] }>({
    queryKey: ["/api/worlds", userId, userEmail],
    queryFn: async () => {
      if (!userEmail || !userId) {
        throw new Error("User email and ID required");
      }
      const response = await fetch(`/api/worlds?userId=${userId}&email=${encodeURIComponent(userEmail)}`);
      if (!response.ok) throw new Error("Failed to fetch worlds");
      return response.json();
    },
    enabled: !world && !!userEmail && !!userId, // Only fetch if not a dedicated world chat and have credentials
  });

  const worlds = worldsData?.worlds || [];
  // Use preset world if provided, otherwise use selected world from dropdown
  const selectedWorld = world || worlds.find((w) => w.id === selectedWorldId);
  
  // Determine the active world ID (either from preset world prop or selected dropdown)
  const activeWorldId = world?.id || selectedWorldId;

  // Function to load initial world chat history (newest 10 messages)
  const loadInitialWorldHistory = async (worldId: string) => {
    if (!userEmail || !worldId) return;
    
    try {
      setIsInitialLoad(true);
      const response = await fetch("/api/chat/world-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userEmail,
          worldId: worldId,
          take: 10, // Load 10 messages at a time
        }),
      });
      
      if (!response.ok) throw new Error("Failed to fetch world history");
      
      const data = await response.json();
      
      // Convert Azure items to messages and ensure chronological order (oldest first, newest last)
      const historyMessages: Message[] = [];
      if (data.items) {
        data.items.forEach((item: any, index: number) => {
          const uniqueId = item.id || `${Date.now()}-${index}`;
          if (item.input) {
            historyMessages.push({
              id: `user-${uniqueId}`,
              role: "user",
              content: item.input,
              timestamp: new Date(item.createdUtc || Date.now()),
              azureMessageId: item.id,
            });
          }
          if (item.aiReply) {
            historyMessages.push({
              id: `ai-${uniqueId}`,
              role: "assistant",
              content: item.aiReply,
              timestamp: new Date(item.createdUtc || Date.now()),
              azureMessageId: item.id,
            });
          }
        });
      }
      
      // Sort messages by timestamp to ensure newest are at the bottom (chronological order)
      historyMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      setMessages(historyMessages);
      setContinuationToken(data.continuationToken || null);
      setHasMoreMessages(!!data.continuationToken);
      
      console.log(`[WORLD-HISTORY] Loaded ${historyMessages.length} initial messages, has more: ${!!data.continuationToken}`);
      
      // Scroll to bottom on initial load
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 100);
    } catch (error) {
      console.error("Error loading initial world history:", error);
    } finally {
      setIsInitialLoad(false);
    }
  };

  // Function to load older messages (when scrolling to top)
  const loadOlderMessages = useCallback(async () => {
    if (!activeWorldId || !userEmail || !continuationToken || isLoadingMore || !hasMoreMessages) {
      return;
    }
    
    try {
      setIsLoadingMore(true);
      
      // Save scroll position before loading
      const container = messagesContainerRef.current;
      if (!container) return;
      
      const oldScrollHeight = container.scrollHeight;
      const oldScrollTop = container.scrollTop;
      
      const response = await fetch("/api/chat/world-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userEmail,
          worldId: activeWorldId,
          take: 10, // Load 10 messages at a time
          continuationToken: continuationToken,
        }),
      });
      
      if (!response.ok) throw new Error("Failed to fetch older messages");
      
      const data = await response.json();
      
      // Convert Azure items to messages and ensure chronological order
      const olderMessages: Message[] = [];
      if (data.items) {
        data.items.forEach((item: any, index: number) => {
          const uniqueId = item.id || `${Date.now()}-${index}`;
          if (item.input) {
            olderMessages.push({
              id: `user-${uniqueId}`,
              role: "user",
              content: item.input,
              timestamp: new Date(item.createdUtc || Date.now()),
              azureMessageId: item.id,
            });
          }
          if (item.aiReply) {
            olderMessages.push({
              id: `ai-${uniqueId}`,
              role: "assistant",
              content: item.aiReply,
              timestamp: new Date(item.createdUtc || Date.now()),
              azureMessageId: item.id,
            });
          }
        });
      }
      
      // Sort older messages by timestamp (oldest first)
      olderMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      
      // Prepend older messages to the beginning, filtering out duplicates, then re-sort entire array
      setMessages((prev) => {
        const existingIds = new Set(prev.map(m => m.azureMessageId));
        const newMessages = olderMessages.filter(m => !existingIds.has(m.azureMessageId));
        const combined = [...newMessages, ...prev];
        // Re-sort entire array by timestamp to ensure chronological order (oldest to newest)
        return combined.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      });
      setContinuationToken(data.continuationToken || null);
      setHasMoreMessages(!!data.continuationToken);
      
      console.log(`[WORLD-HISTORY] Loaded ${olderMessages.length} older messages, has more: ${!!data.continuationToken}`);
      
      // Restore scroll position after prepending
      setTimeout(() => {
        if (container) {
          const newScrollHeight = container.scrollHeight;
          container.scrollTop = newScrollHeight - oldScrollHeight + oldScrollTop;
        }
      }, 0);
    } catch (error) {
      console.error("Error loading older messages:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeWorldId, userEmail, continuationToken, isLoadingMore, hasMoreMessages]);

  // Load initial history when world changes
  useEffect(() => {
    if (activeWorldId && userEmail) {
      loadInitialWorldHistory(activeWorldId);
    }
  }, [activeWorldId, userEmail]);

  // Update messages when switching back to default/global chat (no world selected)
  useEffect(() => {
    if (!world && !selectedWorldId) {
      setMessages(initialMessages);
      setIsInitialLoad(false); // Mark initial load as complete for main chat
    }
  }, [world, selectedWorldId, initialMessages]);

  // Scroll listener to detect when user scrolls to top
  useEffect(() => {
    const container = messagesContainerRef.current;
    
    if (!container || !activeWorldId || isInitialLoad) {
      return;
    }

    const handleScroll = () => {
      // Only trigger if scrolled near the top (within 200px) and has more messages
      if (container.scrollTop < 200 && hasMoreMessages && !isLoadingMore) {
        console.log('[SCROLL-TRIGGER] Loading older messages...', { scrollTop: container.scrollTop });
        loadOlderMessages();
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeWorldId, isInitialLoad, hasMoreMessages, isLoadingMore, loadOlderMessages]);

  const scrollToBottom = (behavior: "smooth" | "auto" = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Auto-scroll to bottom when switching worlds or sending new messages
  useEffect(() => {
    if (!isLoadingMore && messages.length > 0) {
      // Scroll to bottom when world changes (initial load complete)
      if (!isInitialLoad && activeWorldId) {
        scrollToBottom("auto");
      }
    }
  }, [activeWorldId]); // Only trigger when switching worlds

  const handleSend = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    // Add user message to state first
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);
    
    // Scroll to bottom after user message is added
    setTimeout(() => scrollToBottom("smooth"), 100);

    try {
      // Prepare world-specific settings if a world is selected
      const worldSettings = selectedWorld ? {
        worldId: selectedWorld.id,
        model: selectedWorld.model,
        temperature: selectedWorld.temperature,
        maxTokens: selectedWorld.maxTokens,
        responseStyle: selectedWorld.responseStyle,
        conversationStyle: selectedWorld.conversationStyle,
        customPersonality: selectedWorld.customPersonality,
        characters: selectedWorld.characters,
        events: selectedWorld.events,
        scenario: selectedWorld.scenario,
        places: selectedWorld.places,
        additionalSettings: selectedWorld.additionalSettings,
      } : undefined;

      // Send message with full conversation history (including the user's new message) and optional world settings
      const response = await onSendMessage(content, updatedMessages, worldSettings);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.ai?.reply || response.reply || "No reply received",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      
      // Scroll to bottom after AI response is added
      setTimeout(() => scrollToBottom("smooth"), 100);
      
      // Reload initial world history after sending message to get latest from Azure
      if (activeWorldId && userEmail) {
        setTimeout(() => loadInitialWorldHistory(activeWorldId), 500); // Small delay to allow Azure to process
      }
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      
      // Scroll to bottom after error message is added
      setTimeout(() => scrollToBottom("smooth"), 100);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* World Selector - only show in main chat, not in dedicated world chats */}
      {!world && worlds.length > 0 && (
        <div className="border-b border-border bg-background p-4">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <Globe className="w-5 h-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">World:</span>
            <Select
              value={selectedWorldId || "default"}
              onValueChange={(value) => setSelectedWorldId(value === "default" ? null : value)}
            >
              <SelectTrigger className="w-[300px]" data-testid="select-world">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default (Global Settings)</SelectItem>
                {worlds.map((world) => (
                  <SelectItem key={world.id} value={world.id}>
                    {world.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedWorld && (
              <span className="text-sm text-muted-foreground">
                {selectedWorld.model} • {selectedWorld.conversationStyle}
              </span>
            )}
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto" ref={messagesContainerRef}>
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {hasMoreMessages && !isLoadingMore && !isInitialLoad && activeWorldId && (
            <div className="flex items-center justify-center py-2">
              <div className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                ↑ Scroll up to load older messages
              </div>
            </div>
          )}
          
          {isLoadingMore && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 text-primary animate-spin mr-2" />
              <span className="text-sm text-muted-foreground">{t('chat.loadingMore')}</span>
            </div>
          )}
          
          {isInitialLoad && (
            <div className="flex items-center justify-center h-[400px]">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">{t('chat.loadingHistory')}</p>
              </div>
            </div>
          )}
          
          {!isInitialLoad && messages.length === 0 && (
            <div className="flex items-center justify-center h-[400px]">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {world ? `${t('chat.welcomeTo')} ${world.name}` : t('landing.title')}
                </h3>
                <p className="text-muted-foreground">
                  {t('chat.startConversation')}
                </p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <ChatMessage 
              key={message.id} 
              message={message}
              worldId={activeWorldId || undefined}
              userEmail={userEmail}
              onDelete={activeWorldId ? async (messageId: string) => {
                // Delete the message from Azure
                try {
                  const response = await fetch("/api/chat/world-message", {
                    method: "DELETE",
                    headers: {
                      "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                      email: userEmail,
                      worldId: activeWorldId,
                      messageId: messageId,
                    }),
                  });
                  if (response.ok && activeWorldId) {
                    // Reload world history to update the UI
                    loadInitialWorldHistory(activeWorldId);
                  }
                } catch (error) {
                  console.error("Error deleting message:", error);
                }
              } : undefined}
            />
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-card flex items-center justify-center">
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              </div>
              <div className="bg-card rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse" />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse delay-75" />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-pulse delay-150" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <ChatInput onSendMessage={handleSend} disabled={isLoading} />
    </div>
  );
}
