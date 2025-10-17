import { useState } from "react";
import { TabNavigation } from "../TabNavigation";

export default function TabNavigationExample() {
  const [activeTab, setActiveTab] = useState("chat");

  const tabs = [
    { id: "chat", label: "Chat" },
    { id: "custom", label: "Custom Tab" },
  ];

  return <TabNavigation tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />;
}
