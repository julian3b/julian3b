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
    console.log("Sending message to AI:", message);
    await new Promise(resolve => setTimeout(resolve, 1000));
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
