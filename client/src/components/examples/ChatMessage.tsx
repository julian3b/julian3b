import { ChatMessage } from "../ChatMessage";

export default function ChatMessageExample() {
  const userMessage = {
    id: "1",
    role: "user" as const,
    content: "Hello! How are you?",
    timestamp: new Date(),
  };

  const aiMessage = {
    id: "2",
    role: "assistant" as const,
    content: "I'm doing great! How can I help you today?",
    timestamp: new Date(),
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <ChatMessage message={userMessage} />
      <ChatMessage message={aiMessage} />
    </div>
  );
}
