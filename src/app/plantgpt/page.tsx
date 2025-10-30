'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import TextareaAutosize from 'react-textarea-autosize';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Bot, User, Sparkles, Flame, Settings, TrendingUp } from 'lucide-react';
import { askPlantGuardian } from '../actions';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function PlantGPTPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '🔥 Welcome to PlantGPT! I\'m your cement plant optimization guardian. I can help you with kiln operations, raw mix chemistry, production analytics, and process optimization. What would you like to know?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const chatHistory = [...messages, userMessage].map(({ role, content }) => ({ role, content }));
      const response = await askPlantGuardian(chatHistory);

      if (response.status === 'success' && response.data) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: response.data,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          role: 'assistant',
          content: `I apologize, but I encountered an error: ${response.message || 'Unknown error'}. Please try again.`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'I apologize, but I encountered an unexpected error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQuestions = [
    { icon: Flame, text: 'What is the ideal LSF range for cement production?' },
    { icon: Settings, text: 'How does kiln temperature affect clinker quality?' },
    { icon: TrendingUp, text: 'Explain the role of C₃S in cement strength' },
    { icon: Sparkles, text: 'What causes high LSF values?' },
  ];

  const handleQuickAction = (text: string) => {
    setInput(text);
  };

  return (
    <div className="p-6 space-y-6 flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-3 rounded-lg border border-primary/30">
            <MessageSquare className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-mono uppercase tracking-wider text-foreground">
              PlantGPT
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              AI-powered assistant for cement plant operations
            </p>
          </div>
        </div>
        <Badge variant="success" className="gap-2">
          <Sparkles className="w-3 h-3" />
          Live
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Suggestions Panel */}
        <div className="lg:col-span-3">
          <Card className="flex flex-col">
            {/* MODIFICATION 1: Added p-4 for consistent header padding */}
            <CardHeader className="p-4 border-b border-border">
              <CardTitle className="text-sm flex items-center gap-2 font-mono uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {suggestedQuestions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickAction(action.text)}
                  className="w-full text-left p-3 rounded-lg bg-secondary/50 hover:bg-secondary border border-border hover:border-primary/50 transition-all text-xs text-foreground flex items-center gap-2"
                  disabled={isLoading}
                >
                  <action.icon className="w-4 h-4 text-primary flex-shrink-0" />
                  <span>{action.text}</span>
                </button>
              ))}

              <div className="pt-4 border-t border-border mt-4">
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground mb-3">
                  Capabilities
                </h4>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Process optimization advice</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Chemical composition analysis</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Troubleshooting guidance</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Quality control insights</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">•</span>
                    <span>Best practices recommendations</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Chat Area */}
        <div className="lg:col-span-9 flex flex-col">
          {/* MODIFICATION 2: Added h-full to make card stretch */}
          <Card className="flex flex-col h-full">
            <CardHeader className="p-4 border-b border-border flex-shrink-0">
              <CardTitle className="text-sm flex items-center gap-2 font-mono uppercase tracking-wider">
                <Bot className="w-4 h-4 text-primary" />
                Conversation
              </CardTitle>
            </CardHeader>
            {/* MODIFICATION 3: Replaced h-[70vh] with flex-1 to fill space */}
            <CardContent className="overflow-y-auto p-6 flex-1">
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg p-4 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary border border-border'
                      }`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-line">
                        {message.content}
                      </p>
                      <span className={`text-xs font-mono mt-2 block ${
                        message.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    {message.role === 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-chart-blue/10 border border-chart-blue/30 flex items-center justify-center">
                        <User className="w-4 h-4 text-chart-blue" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-3 justify-start">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-primary animate-pulse" />
                    </div>
                    <div className="max-w-[80%] rounded-lg p-4 bg-secondary border border-border">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </CardContent>
            
            <CardFooter className="p-3 border-t border-border flex-col items-start w-full">
              <form onSubmit={handleSubmit} className="flex gap-3 w-full">
                <TextareaAutosize
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about cement plant operations, LSF, kiln temperature, clinker phases..."
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  minRows={1}
                  maxRows={3}
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                />
                <Button
                  type="submit"
                  size="default"
                  disabled={!input.trim() || isLoading}
                  className="flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                Press Enter to send, Shift+Enter for new line
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}