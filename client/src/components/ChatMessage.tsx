import { Bot, User, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  azureMessageId?: string;
};

type ChatMessageProps = {
  message: Message;
  worldId?: string;
  userEmail?: string;
  onDelete?: (messageId: string) => Promise<void>;
};

function formatTimestamp(date: Date): string {
  // Format: MM/DD/YYYY hh:MM tt (12-hour with AM/PM)
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();

  let hours = date.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // Convert 0 to 12
  const hoursStr = String(hours).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${month}/${day}/${year} ${hoursStr}:${minutes} ${ampm}`;
}

export function ChatMessage({ message, worldId, userEmail, onDelete }: ChatMessageProps) {
  const { t } = useTranslation();
  const isUser = message.role === "user";
  const time = formatTimestamp(message.timestamp);
  const canDelete = worldId && message.azureMessageId && onDelete;

  const handleDelete = async () => {
    if (!canDelete || !message.azureMessageId) return;
    
    if (confirm(t('chat.deleteConfirm'))) {
      await onDelete(message.azureMessageId);
    }
  };

  return (
    <div
      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"}`}
      data-testid={`message-${message.role}-${message.id}`}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-card flex items-center justify-center">
          <Bot className="w-4 h-4 text-primary" />
        </div>
      )}

      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-3xl`}>
        <div
          className={`rounded-2xl px-4 py-3 ${isUser
              ? "bg-primary text-primary-foreground"
              : "bg-card text-card-foreground"
            }`}
        >
          <div
            style={window.innerWidth < 500 ? { fontSize: "12px" } : {}}
            className="text-base whitespace-pre-wrap break-words"
            dangerouslySetInnerHTML={{ __html: message.content }}
          />
        </div>
        <div className="flex items-center gap-2 mt-1 px-2">
          <span className="text-xs text-muted-foreground opacity-70">
            {time}
          </span>
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 opacity-50 hover:opacity-100 hover:text-destructive"
              onClick={handleDelete}
              data-testid={`button-delete-message-${message.id}`}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
          <User className="w-4 h-4 text-primary-foreground" />
        </div>
      )}
    </div>
  );
}
