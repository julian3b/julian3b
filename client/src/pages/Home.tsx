import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { TabNavigation } from "@/components/TabNavigation";
import { ChatInterface } from "@/components/ChatInterface";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserPanel } from "@/components/UserPanel";
import { LandingPage } from "@/components/LandingPage";
import Worlds from "@/pages/Worlds";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";
import type { World } from "@shared/schema";

function getUserId(): string {
  const STORAGE_KEY = 'chatbot_user_id';
  
  let userId = localStorage.getItem(STORAGE_KEY);
  
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(STORAGE_KEY, userId);
    console.log('New user! Generated ID:', userId);
  } else {
    console.log('Returning user! ID:', userId);
  }
  
  return userId;
}

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

export default function Home() {
  const [activeTab, setActiveTab] = useState("chat");
  const [userId, setUserId] = useState<string>("");
  const [isUserPanelOpen, setIsUserPanelOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Fetch worlds for dynamic tabs
  const { data: worldsData } = useQuery<{ ok: boolean; worlds: World[] }>({
    queryKey: ["/api/worlds", userId],
    queryFn: async () => {
      if (!userId) return { ok: true, worlds: [] };
      
      const userDataStr = localStorage.getItem('user_data');
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      const userEmail = userData?.email;
      
      if (!userEmail) return { ok: true, worlds: [] };
      
      const response = await fetch(`/api/worlds?userId=${userId}&email=${encodeURIComponent(userEmail)}`);
      if (!response.ok) throw new Error("Failed to fetch worlds");
      return response.json();
    },
    enabled: !!userId && isAuthenticated,
  });

  const worlds = worldsData?.worlds || [];

  // Create dynamic tabs: Chat, World Settings, then one tab per world
  const tabs = [
    { id: "chat", label: "Chat" },
    { id: "world-settings", label: "World Settings" },
    ...worlds.map(world => ({
      id: `world-${world.id}`,
      label: world.name,
    })),
  ];

  useEffect(() => {
    setUserId(getUserId());
    
    // Check if user is authenticated
    const userDataStr = localStorage.getItem('user_data');
    const isAuth = !!userDataStr;
    setIsAuthenticated(isAuth);

    // Fetch chat history if authenticated
    if (isAuth) {
      fetchChatHistory();
    }
  }, []);

  const fetchChatHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const userDataStr = localStorage.getItem('user_data');
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      const userEmail = userData?.email;

      if (!userEmail) {
        console.log('No user email found, skipping history fetch');
        return;
      }

      const response = await fetch('/api/chat/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: userEmail })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.ok && data.items) {
        // Convert history items to Message format
        const historyMessages: Message[] = data.items.flatMap((item: any, index: number) => [
          {
            id: `history-user-${index}`,
            role: "user" as const,
            content: item.Input,
            timestamp: new Date(item.CreatedUtc || new Date())
          },
          {
            id: `history-ai-${index}`,
            role: "assistant" as const,
            content: item.Response,
            timestamp: new Date(item.CreatedUtc || new Date())
          }
        ]);
        
        setChatHistory(historyMessages);
        console.log(`Loaded ${data.count} history items`);
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleSendMessage = async (message: string, history: Message[], worldSettings?: any) => {
    try {
      // Get user's email from localStorage
      const userDataStr = localStorage.getItem('user_data');
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      const userEmail = userData?.email || 'user@example.com';

      // Format history for Azure Function (keep last 10 messages for context)
      const recentHistory = history.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message, 
          userId,
          name: userEmail,
          history: recentHistory,
          worldSettings: worldSettings || null
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center justify-between border-b border-border bg-background">
        {isAuthenticated && <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />}
        {!isAuthenticated && <div className="px-6 py-3"><h2 className="text-lg font-semibold">AI Chat</h2></div>}
        <div className="flex items-center gap-2 px-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsUserPanelOpen(true)}
            data-testid="button-user-menu"
          >
            <User className="w-5 h-5" />
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <UserPanel isOpen={isUserPanelOpen} onClose={() => setIsUserPanelOpen(false)} />

      <main className="flex-1 overflow-hidden">
        {!isAuthenticated ? (
          <LandingPage onOpenLogin={() => setIsUserPanelOpen(true)} />
        ) : (
          <>
            {activeTab === "chat" && (
              <ChatInterface 
                onSendMessage={handleSendMessage} 
                initialMessages={chatHistory}
                userId={userId}
              />
            )}
            {activeTab === "world-settings" && (
              (() => {
                const userDataStr = localStorage.getItem('user_data');
                const userData = userDataStr ? JSON.parse(userDataStr) : null;
                const userEmail = userData?.email || '';
                return <Worlds userId={userId} userEmail={userEmail} />;
              })()
            )}
            {activeTab.startsWith("world-") && activeTab !== "world-settings" && (() => {
              const worldId = activeTab.replace("world-", "");
              const world = worlds.find(w => w.id === worldId);
              if (!world) return null;
              
              return (
                <ChatInterface 
                  onSendMessage={(message, history) => handleSendMessage(message, history, {
                    model: world.model,
                    temperature: world.temperature,
                    maxTokens: world.maxTokens,
                    responseStyle: world.responseStyle,
                    conversationStyle: world.conversationStyle,
                    customPersonality: world.customPersonality,
                    characters: world.characters,
                    events: world.events,
                    scenario: world.scenario,
                    places: world.places,
                    additionalSettings: world.additionalSettings,
                  })}
                  initialMessages={[]}
                  userId={userId}
                  worldName={world.name}
                />
              );
            })()}
          </>
        )}
      </main>
    </div>
  );
}
