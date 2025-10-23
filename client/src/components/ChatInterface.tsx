import { useEffect, useRef, useState } from "react";
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
import type { World } from "@shared/schema";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
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
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWorldId, setSelectedWorldId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  // Load world-specific chat history when in a dedicated world chat
  const { data: worldHistoryData, isLoading: isLoadingWorldHistory } = useQuery({
    queryKey: ["/api/chat/world-history", world?.id, userEmail],
    queryFn: async () => {
      if (!userEmail || !world?.id) {
        throw new Error("User email and world ID required");
      }
      const response = await fetch("/api/chat/world-history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: userEmail,
          worldId: world.id,
        }),
      });
      if (!response.ok) throw new Error("Failed to fetch world history");
      return response.json();
    },
    enabled: !!world && !!userEmail && !!world.id, // Only fetch if this is a dedicated world chat
  });

  // Update messages when world history is loaded
  useEffect(() => {
    if (world && worldHistoryData?.items) {
      // Azure returns items in descending order (newest first), so reverse to get oldest first
      const reversedItems = [...worldHistoryData.items].reverse();
      
      // Each item has both input (user) and aiReply (assistant), so we need to create 2 messages per item
      const historyMessages: Message[] = [];
      reversedItems.forEach((item: any, index: number) => {
        // Add user message
        if (item.input) {
          historyMessages.push({
            id: `history-user-${index}`,
            role: "user",
            content: item.input,
            timestamp: new Date(item.createdUtc || Date.now()),
          });
        }
        // Add AI reply
        if (item.aiReply) {
          historyMessages.push({
            id: `history-ai-${index}`,
            role: "assistant",
            content: item.aiReply,
            timestamp: new Date(item.createdUtc || Date.now()),
          });
        }
      });
      setMessages(historyMessages);
      console.log(`Loaded ${historyMessages.length} world history items for world ${world.id}`);
    }
  }, [world, worldHistoryData]);

  // Update messages when initialMessages changes (for default/global chat)
  useEffect(() => {
    if (!world && initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [world, initialMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
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
      
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {isLoadingWorldHistory && (
            <div className="flex items-center justify-center h-[400px]">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading world chat history...</p>
              </div>
            </div>
          )}
          
          {!isLoadingWorldHistory && messages.length === 0 && (
            <div className="flex items-center justify-center h-[400px]">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {world ? `Welcome to ${world.name}` : "Welcome to AI Chat"}
                </h3>
                <p className="text-muted-foreground">
                  Start a conversation by typing a message below
                </p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
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
