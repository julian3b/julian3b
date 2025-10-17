import { ChatInput } from "../ChatInput";

export default function ChatInputExample() {
  const handleSend = (message: string) => {
    console.log("Message sent:", message);
  };

  return (
    <div className="h-[200px]">
      <ChatInput onSendMessage={handleSend} />
    </div>
  );
}
