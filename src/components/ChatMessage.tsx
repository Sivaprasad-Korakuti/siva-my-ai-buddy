import { Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ChatMessageProps {
  role: 'user' | 'assistant';
  content: string;
  onSpeak?: () => void;
  isSpeaking?: boolean;
}

export const ChatMessage = ({ role, content, onSpeak, isSpeaking }: ChatMessageProps) => {
  const isUser = role === 'user';

  return (
    <div className={cn(
      "flex gap-3 mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300",
      isUser ? "justify-end" : "justify-start"
    )}>
      <div className={cn(
        "flex flex-col gap-2 max-w-[80%]",
        isUser && "items-end"
      )}>
        <div className={cn(
          "px-4 py-3 rounded-2xl",
          isUser 
            ? "bg-primary text-primary-foreground rounded-br-sm" 
            : "bg-card text-card-foreground rounded-bl-sm border border-border"
        )}>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
        {!isUser && onSpeak && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSpeak}
            disabled={isSpeaking}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Volume2 className={cn("w-3 h-3 mr-1", isSpeaking && "animate-pulse")} />
            {isSpeaking ? 'Speaking...' : 'Speak'}
          </Button>
        )}
      </div>
    </div>
  );
};
