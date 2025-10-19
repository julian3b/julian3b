import { useState, useEffect } from "react";
import { TabNavigation } from "@/components/TabNavigation";
import { ChatInterface } from "@/components/ChatInterface";
import { PlaceholderTab } from "@/components/PlaceholderTab";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserPanel } from "@/components/UserPanel";
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

  const tabs = [
    { id: "chat", label: "Chat" },
    { id: "custom", label: "Custom Tab" },
  ];

  useEffect(() => {
    setUserId(getUserId());
  }, []);

  const handleSendMessage = async (message: string) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, userId })
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
        <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
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
        {activeTab === "chat" && <ChatInterface onSendMessage={handleSendMessage} />}
        {activeTab === "custom" && <PlaceholderTab />}
      </main>
    </div>
  );
}
