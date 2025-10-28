'use client';

import { Card, CardContent } from '@/components/ui/card';
import { MessageSquare, Sparkles } from 'lucide-react';

export default function PlantGPTPage() {
  return (
    <div className="p-6 h-[calc(100vh-80px)] flex items-center justify-center">
      <Card className="max-w-2xl w-full bg-secondary/20 border-dashed">
        <CardContent className="p-12 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/30 neon-glow">
            <MessageSquare className="w-12 h-12 text-primary" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold font-mono uppercase tracking-wider text-foreground">
              PlantGPT
            </h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              AI-powered conversational assistant for cement plant operations
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full border border-primary/30">
            <Sparkles className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-xs font-bold font-mono uppercase tracking-wider text-primary">
              Coming Soon
            </span>
          </div>

          <div className="pt-6 text-xs text-muted-foreground space-y-2">
            <p>This feature is under development.</p>
            <p>Chat with AI to get instant insights about your plant operations.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}