
"use client";

import { useState, useEffect } from 'react';
import { Bot, CornerDownLeft, Loader2, User } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Avatar, AvatarFallback } from './ui/avatar';
import { cn } from '@/lib/utils';
import type { ChatInput, ChatOutput } from '@/app/api/chat/route';
import type { HealthFormData } from '@/lib/types';

interface ChatbotProps {
  reportContext: string;
  formData: HealthFormData;
}

interface Message {
  id: string;
  type: 'user' | 'bot';
  text: string;
}

export function Chatbot({ reportContext, formData }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    const getInitialAnalysis = async () => {
        setIsLoading(true);
        try {
            const chatInput: ChatInput = { question: 'INITIAL_ANALYSIS', reportContext, formData };
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(chatInput),
            });
            if (!response.ok) {
              throw new Error(await response.text());
            }
            const responseData: ChatOutput = await response.json();
            const botMessage: Message = { id: 'initial-analysis', type: 'bot', text: responseData.answer };
            setMessages([botMessage]);
        } catch (error: any) {
             console.error('Initial analysis error:', error);
             const errorMessage = error.message || "";
             if (errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
                toast({
                    variant: "default",
                    title: "AI Assistant Busy",
                    description: "The initial summary could not be generated right now. The chat is still active.",
                });
            }
             // Fallback to a generic greeting if the initial analysis fails
             const fallbackMessage: Message = { 
                id: 'initial-fallback', 
                type: 'bot', 
                text: "Hello! I'm here to help. You can ask me to explain your report, or for general health tips." 
             };
             setMessages([fallbackMessage]);
        } finally {
            setIsLoading(false);
        }
    }
    
    if (reportContext && formData) {
      getInitialAnalysis();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportContext, formData]);

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[1][0]}`;
    }
    return names[0][0];
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = inputValue.trim();
    if (!question || isLoading) return;

    setIsLoading(true);
    const userMessage: Message = { id: Date.now().toString(), type: 'user', text: question };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');

    try {
      const chatInput: ChatInput = { question, reportContext, formData };

      const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chatInput),
      });

      if (!response.ok) {
        const errorBody = await response.json();
        // Handle specific safety error from the consolidated API
        if (errorBody.error === 'Inappropriate content detected') {
          toast({
            variant: "destructive",
            title: "Inappropriate Content",
            description: "Your message was blocked for safety reasons. Please rephrase it.",
          });
          setMessages((prev) => prev.filter((m) => m.id !== userMessage.id)); // Remove user message
          setIsLoading(false);
          return;
        }
        throw new Error(errorBody.message || 'An unknown error occurred');
      }
      
      const responseData: ChatOutput = await response.json();
      const botMessage: Message = { id: (Date.now() + 1).toString(), type: 'bot', text: responseData.answer };
      setMessages((prev) => [...prev, botMessage]);

    } catch (error: any) {
      console.error('Chatbot error:', error);
      const errorMessage = error.message || "";
       if (errorMessage.includes("429")) {
            toast({
                variant: "destructive",
                title: "AI Service Rate Limited",
                description: "You've exceeded the daily usage limit for the AI service. Please try again tomorrow. For more information, visit ai.google.dev/gemini-api/docs/rate-limits.",
            });
       } else if (errorMessage.includes("503") || errorMessage.toLowerCase().includes("overloaded")) {
            toast({
                variant: "destructive",
                title: "AI Service Busy",
                description: "The AI assistant is currently experiencing high demand. Please try again in a moment.",
            });
       } else {
            toast({
                variant: 'destructive',
                title: 'Chatbot Error',
                description: 'Sorry, I had trouble getting a response. Please try again.',
            });
       }
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 pt-8">
      <h4 className="text-xl font-semibold flex items-center gap-2"><Bot className="text-primary"/> Chat with your AI Assistant</h4>
      <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
        <ScrollArea className="h-72 pr-4">
          <div className="space-y-6">
            {messages.length === 0 && !isLoading ? (
                <div className="flex items-start gap-4 p-2">
                    <Avatar className="w-9 h-9 border-2 border-primary">
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-background">
                            <Bot className="w-5 h-5 text-primary" />
                        </div>
                    </Avatar>
                    <div className="flex-1 rounded-lg bg-secondary p-4 text-sm shadow-sm">
                       <p className="font-medium">No report loaded.</p>
                       <p className="text-muted-foreground mt-1">Please complete a new assessment to activate the chatbot.</p>
                    </div>
                </div>
            ) : (
                 messages.map((message) => (
                    <div
                        key={message.id}
                        className={cn(
                        'flex items-start gap-4',
                        message.type === 'user' && 'justify-end'
                        )}
                    >
                        {message.type === 'bot' && (
                           <Avatar className="w-9 h-9 border-2 border-primary">
                                <div className="flex h-full w-full items-center justify-center rounded-full bg-background">
                                    <Bot className="w-5 h-5 text-primary" />
                                </div>
                            </Avatar>
                        )}
                        <div
                        className={cn(
                            'flex-1 max-w-[85%] rounded-xl p-4 text-sm shadow-md',
                            message.type === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background'
                        )}
                        >
                            <p className="leading-relaxed">{message.text}</p>
                        </div>
                        {message.type === 'user' && (
                            <Avatar className="w-9 h-9">
                                <AvatarFallback className="bg-primary/20 text-primary font-bold">{getInitials(user?.displayName || user?.email)}</AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                ))
            )}
             {isLoading && (
                <div className="flex items-start gap-4 p-2">
                    <Avatar className="w-9 h-9 border-2 border-primary">
                        <div className="flex h-full w-full items-center justify-center rounded-full bg-background">
                           <Loader2 className="w-5 h-5 text-primary animate-spin" />
                        </div>
                    </Avatar>
                    <div className="flex-1 rounded-lg bg-secondary p-4 text-sm shadow-sm">
                       <p className="font-medium">DiaHelper is thinking...</p>
                    </div>
                </div>
            )}
          </div>
        </ScrollArea>
        <form onSubmit={handleSendMessage} className="relative">
          <Input
            placeholder="Ask a question..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="pr-12 h-12 rounded-lg"
            disabled={isLoading || messages.length === 0}
          />
          <Button
            type="submit"
            size="icon"
            className="absolute right-2 top-2 h-8 w-8 rounded-md"
            disabled={isLoading || !inputValue}
          >
            <CornerDownLeft className="h-5 w-5" />
            <span className="sr-only">Send</span>
          </Button>
        </form>
      </div>
    </div>
  );
}

