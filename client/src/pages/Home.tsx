import { useState, useEffect } from "react";
import { TabNavigation } from "@/components/TabNavigation";
import { ChatInterface } from "@/components/ChatInterface";
import { PlaceholderTab } from "@/components/PlaceholderTab";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserPanel } from "@/components/UserPanel";
import { LandingPage } from "@/components/LandingPage";
import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

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

export default function Home() {
  const [activeTab, setActiveTab] = useState("chat");
  const [userId, setUserId] = useState<string>("");
  const [isUserPanelOpen, setIsUserPanelOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const tabs = [
    { id: "chat", label: "Chat" },
    { id: "custom", label: "Custom Tab" },
  ];

  useEffect(() => {
    setUserId(getUserId());
    
    // Check if user is authenticated
    const userDataStr = localStorage.getItem('user_data');
    setIsAuthenticated(!!userDataStr);
  }, []);

  const handleSendMessage = async (message: string) => {
    try {
      // Get user's email from localStorage
      const userDataStr = localStorage.getItem('user_data');
      const userData = userDataStr ? JSON.parse(userDataStr) : null;
      const userEmail = userData?.email || 'user@example.com';

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message, 
          userId,
          name: userEmail 
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
            {activeTab === "chat" && <ChatInterface onSendMessage={handleSendMessage} />}
            {activeTab === "custom" && <PlaceholderTab />}
          </>
        )}
      </main>
    </div>
  );
}
