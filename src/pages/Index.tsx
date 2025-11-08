import { useState, useRef, useEffect } from 'react';
import { Mic, Send, Loader2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatMessage } from '@/components/ChatMessage';
import { VoiceVisualizer } from '@/components/VoiceVisualizer';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useTextToSpeech } from '@/hooks/useTextToSpeech';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const Index = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hey! I\'m Siva, your AI assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [lastVoiceResponse, setLastVoiceResponse] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { 
    isListening, 
    transcript, 
    startListening, 
    stopListening, 
    isSupported: voiceSupported,
    isWakeWordMode,
    startWakeWordMode,
    stopWakeWordMode
  } = useVoiceInput();
  const { speak, stop: stopSpeaking, isSpeaking } = useTextToSpeech();

  // Auto-start wake word detection on mount
  useEffect(() => {
    if (voiceSupported) {
      startWakeWordMode();
    }
    return () => {
      if (voiceSupported) {
        stopWakeWordMode();
      }
    };
  }, [voiceSupported, startWakeWordMode, stopWakeWordMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Wake word detection
  useEffect(() => {
    if (isWakeWordMode && transcript.toLowerCase().includes('hey siva')) {
      setVoiceMode(true);
      stopWakeWordMode();
      startListening();
      speak('Yes, I\'m listening!');
    }
  }, [transcript, isWakeWordMode, startListening, stopWakeWordMode, speak]);

  // Handle voice input completion
  useEffect(() => {
    if (voiceMode && transcript && !isListening && !isWakeWordMode) {
      const cleanTranscript = transcript.toLowerCase().replace('hey siva', '').trim();
      if (cleanTranscript) {
        streamChat(cleanTranscript, true);
      }
    }
  }, [transcript, isListening, voiceMode, isWakeWordMode]);

  const streamChat = async (userMessage: string, fromVoice = false) => {
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
    if (!fromVoice) {
      setMessages(newMessages);
    }
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            messages: newMessages.map(m => ({ role: m.role, content: m.content })),
            userName: userName || 'there',
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get response');
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let textBuffer = '';

      if (!fromVoice) {
        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantMessage += content;
              if (!fromVoice) {
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: assistantMessage,
                  };
                  return updated;
                });
              }
            }
          } catch (e) {
            // Ignore parsing errors for incomplete JSON
          }
        }
      }

      // Auto-speak response in voice mode
      if (fromVoice && assistantMessage) {
        setLastVoiceResponse(assistantMessage);
        speak(assistantMessage);
        // Wait for speech to finish, then restart wake word detection
        setTimeout(() => {
          setVoiceMode(false);
          startWakeWordMode();
        }, assistantMessage.length * 50); // Rough estimate of speech duration
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send message',
        variant: 'destructive',
      });
      if (!fromVoice) {
        setMessages(prev => prev.slice(0, -1));
      }
      if (fromVoice) {
        setVoiceMode(false);
        startWakeWordMode();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    streamChat(input, false);
  };

  const handleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleSpeak = (text: string) => {
    if (isSpeaking) {
      stopSpeaking();
    } else {
      speak(text);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-ai flex items-center justify-center">
              <span className="text-lg font-bold text-primary-foreground">S</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold">Siva</h1>
              <p className="text-xs text-muted-foreground">Your AI Assistant</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="border-b border-border bg-card/80 backdrop-blur-sm animate-in slide-in-from-top duration-200">
          <div className="container mx-auto px-4 py-4">
            <div className="max-w-md">
              <label className="text-sm font-medium mb-2 block">Your Name</label>
              <Input
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name (optional)"
                className="bg-background/50"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Personalize your experience by telling me your name!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {voiceMode ? (
            <div className="flex flex-col items-center justify-center h-full space-y-8">
              <div className="w-32 h-32 rounded-full bg-gradient-ai flex items-center justify-center animate-pulse-slow">
                <Mic className="w-16 h-16 text-primary-foreground" />
              </div>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-semibold">
                  {isListening ? 'Listening...' : isSpeaking ? 'Speaking...' : 'Processing...'}
                </h2>
                <p className="text-muted-foreground">
                  {isListening ? 'Say "Hey Siva" to activate' : lastVoiceResponse ? 'Voice response playing' : 'Ready for your command'}
                </p>
              </div>
              {isListening && <VoiceVisualizer isActive={isListening} className="scale-150" />}
            </div>
          ) : (
            <>
              {messages.map((message, index) => (
                <ChatMessage
                  key={index}
                  role={message.role}
                  content={message.content}
                  onSpeak={message.role === 'assistant' ? () => handleSpeak(message.content) : undefined}
                  isSpeaking={isSpeaking}
                />
              ))}
              {isLoading && (
                <div className="flex items-center gap-2 text-muted-foreground mb-4">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Siva is thinking...</span>
                </div>
              )}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 max-w-4xl">
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <div className="flex-1 relative">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isListening ? "Listening..." : "Type your message..."}
                disabled={isLoading || isListening}
                className={cn(
                  "pr-12 bg-background/50",
                  isListening && "ring-2 ring-primary"
                )}
              />
              {isListening && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <VoiceVisualizer isActive={isListening} />
                </div>
              )}
            </div>
            {voiceSupported && (
              <Button
                type="button"
                variant={isListening ? "default" : "secondary"}
                size="icon"
                onClick={handleVoiceInput}
                disabled={isLoading}
                className={cn(
                  isListening && "bg-primary animate-pulse-slow"
                )}
              >
                <Mic className="w-5 h-5" />
              </Button>
            )}
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              size="icon"
              className="bg-gradient-ai hover:opacity-90"
            >
              <Send className="w-5 h-5" />
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {voiceSupported 
              ? isWakeWordMode 
                ? "Say 'Hey Siva' to activate voice mode" 
                : "Type or click the mic to speak with Siva"
              : "Type your message to chat with Siva"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
