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
};

export function ChatInterface({
  onSendMessage,
  initialMessages = [],
  userId,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWorldId, setSelectedWorldId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch worlds for the user
  const { data: worldsData } = useQuery<{ ok: boolean; worlds: World[] }>({
    queryKey: ["/api/worlds", userId],
    queryFn: async () => {
      const response = await fetch(`/api/worlds?userId=${userId}`);
      if (!response.ok) throw new Error("Failed to fetch worlds");
      return response.json();
    },
  });

  const worlds = worldsData?.worlds || [];
  const selectedWorld = worlds.find((w) => w.id === selectedWorldId);

  // Update messages when initialMessages changes
  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(initialMessages);
    }
  }, [initialMessages]);

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
        model: selectedWorld.model,
        temperature: selectedWorld.temperature,
        maxTokens: selectedWorld.maxTokens,
        responseStyle: selectedWorld.responseStyle,
        conversationStyle: selectedWorld.conversationStyle,
        customPersonality: selectedWorld.customPersonality,
      } : undefined;

      // Send message with full conversation history and optional world settings
      const response = await onSendMessage(content, messages, worldSettings);

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
      {/* World Selector */}
      {worlds.length > 0 && (
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
          {messages.length === 0 && (
            <div className="flex items-center justify-center h-[400px]">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Welcome to AI Chat
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
