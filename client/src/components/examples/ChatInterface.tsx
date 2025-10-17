import { ChatInterface } from "../ChatInterface";

export default function ChatInterfaceExample() {
  const handleSendMessage = async (message: string) => {
    console.log("Sending message:", message);
    await new Promise(resolve => setTimeout(resolve, 1000));
  };

  return (
    <div className="h-[600px]">
      <ChatInterface onSendMessage={handleSendMessage} />
    </div>
  );
}
