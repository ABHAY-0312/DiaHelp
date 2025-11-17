
"use client";

import { useState } from 'react';
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
  isAnalysis?: boolean;
}

export function Chatbot({ reportContext, formData }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
        id: 'initial-greeting',
        type: 'bot',
        text: "Hello! I'm here to help. You can ask me to explain your report, or for general health tips."
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

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
    
    const isAnalysisRequest = question.toLowerCase().includes('report') || question.toLowerCase().includes('analyze');

    const thinkingMessage: Message = { 
        id: 'thinking', 
        type: 'bot', 
        text: isAnalysisRequest ? 'Analyzing your health report...' : 'DiaHelper is thinking...'
    };

    setMessages((prev) => [...prev, userMessage, thinkingMessage]);
    
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
        if (errorBody.message && (errorBody.message.includes('503') || errorBody.message.toLowerCase().includes('overloaded'))) {
            toast({
                variant: "destructive",
                title: "AI Service Busy",
                description: "The AI assistant is currently experiencing high demand. Please try again in a moment.",
            });
             setMessages((prev) => prev.filter((m) => m.id !== 'thinking'));
        } else if (errorBody.error === 'Inappropriate content detected') {
          toast({
            variant: "destructive",
            title: "Inappropriate Content",
            description: "Your message was blocked for safety reasons. Please rephrase it.",
          });
          setMessages((prev) => prev.filter((m) => m.id !== userMessage.id && m.id !== 'thinking'));
        } else {
            throw new Error(JSON.stringify(errorBody) || 'An unknown error occurred');
        }
        setIsLoading(false);
        return;
      }
      
      const responseData: ChatOutput = await response.json();
      const botMessage: Message = { id: (Date.now() + 1).toString(), type: 'bot', text: responseData.answer, isAnalysis: isAnalysisRequest };
      
      setMessages((prev) => {
          const newMessages = prev.filter(m => m.id !== 'thinking');
          return [...newMessages, botMessage];
      });

    } catch (error: any) {
      console.error('Chatbot error:', error);
      const errorMessage = error.message || "";
       if (errorMessage.includes("429")) {
            toast({
                variant: "destructive",
                title: "AI Service Rate Limited",
                description: "You've exceeded the daily usage limit for the AI service. Please try again tomorrow.",
            });
       } else {
            toast({
                variant: 'destructive',
                title: 'Chatbot Error',
                description: 'Sorry, I had trouble getting a response. Please try again.',
            });
       }
      setMessages((prev) => prev.filter((m) => m.id !== 'thinking'));
    } finally {
      setIsLoading(false);
    }
  };

  const formatAnalysisText = (text: string) => {
    // Convert **text** to <strong>text</strong>
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Check if the text is a list (contains '*' as a list item marker)
    if (formattedText.includes('* ')) {
        const listItems = formattedText.split('* ').filter(item => item.trim() !== '');
        const html = '<ul>' + listItems.map(item => `<li class="my-2">${item.trim()}</li>`).join('') + '</ul>';
        return html;
    }
    
    return formattedText;
  };

  return (
    <div className="space-y-4 pt-8">
      <h4 className="text-xl font-semibold flex items-center gap-2"><Bot className="text-primary"/> Chat with your AI Assistant</h4>
      <div className="rounded-xl border bg-card p-4 space-y-4 shadow-sm">
        <ScrollArea className="h-72 pr-4">
          <div className="space-y-6">
            {messages.map((message) => {
                if (message.id === 'thinking') {
                     return (
                        <div key={message.id} className="flex items-start gap-4 p-2">
                            <Avatar className="w-9 h-9 border-2 border-primary">
                                <div className="flex h-full w-full items-center justify-center rounded-full bg-background">
                                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                </div>
                            </Avatar>
                            <div className="flex-1 rounded-lg bg-secondary p-4 text-sm shadow-sm">
                                <p className="font-medium text-muted-foreground">{message.text}</p>
                            </div>
                        </div>
                    )
                }

                return (
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
                            {message.isAnalysis ? (
                                <div className="prose prose-sm max-w-none text-foreground prose-li:my-1" dangerouslySetInnerHTML={{ __html: formatAnalysisText(message.text) }} />
                            ) : (
                                <p className="leading-relaxed">{message.text}</p>
                            )}
                        </div>
                        {message.type === 'user' && (
                            <Avatar className="w-9 h-9">
                                <AvatarFallback className="bg-primary/20 text-primary font-bold">{getInitials(user?.displayName || user?.email)}</AvatarFallback>
                            </Avatar>
                        )}
                    </div>
                )
            })}
          </div>
        </ScrollArea>
        <form onSubmit={handleSendMessage} className="relative">
          <Input
            placeholder="Ask a question..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="pr-12 h-12 rounded-lg"
            disabled={isLoading || reportContext.length === 0}
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
