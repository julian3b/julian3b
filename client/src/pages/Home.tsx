import { useState } from "react";
import { TabNavigation } from "@/components/TabNavigation";
import { ChatInterface } from "@/components/ChatInterface";
import { PlaceholderTab } from "@/components/PlaceholderTab";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  const [activeTab, setActiveTab] = useState("chat");

  const tabs = [
    { id: "chat", label: "Chat" },
    { id: "custom", label: "Custom Tab" },
  ];

  const handleSendMessage = async (message: string) => {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message })
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
        <div className="px-4">
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {activeTab === "chat" && <ChatInterface onSendMessage={handleSendMessage} />}
        {activeTab === "custom" && <PlaceholderTab />}
      </main>
    </div>
  );
}
