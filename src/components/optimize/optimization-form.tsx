'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { runOptimization } from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot, Sparkles, FileText, Download } from 'lucide-react';
import { RecommendationCard } from './recommendation-card';
import { formatNumber } from '@/lib/formatters';

interface OptimizationFormProps {
  initialMetrics?: {
    kilnTemperature?: number;
    feedRate?: number;
    lsf?: number;
    cao?: number;
    sio2?: number;
    al2o3?: number;
    fe2o3?: number;
    trigger?: boolean;
  };
}

const initialState = { error: null, recommendation: null };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full" size="lg">
      {pending ? (
        <>
          <Bot className="w-4 h-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4" />
          Generate Optimization
        </>
      )}
    </Button>
  );
}

export function OptimizationForm({ initialMetrics }: OptimizationFormProps) {
  const [state, formAction] = useActionState(runOptimization, initialState);
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const { pending } = useFormStatus();
  const [targetValues, setTargetValues] = useState({
    kilnTemp: '',
    feedRate: '',
    lsf: '',
    cao: '',
    sio2: '',
    al2o3: '',
    fe2o3: '',
  });

  useEffect(() => {
    if (state.error) {
      toast({
        variant: 'destructive',
        title: 'Optimization Error',
        description: state.error,
      });
    }
  }, [state.error, toast]);

  useEffect(() => {
    if (initialMetrics?.trigger && formRef.current) {
      setTimeout(() => {
        const submitButton = formRef.current?.querySelector(
          'button[type="submit"]'
        ) as HTMLButtonElement;
        submitButton?.click();
      }, 100);
    }
  }, [initialMetrics?.trigger]);

  return (
    // src/components/optimize/optimization-form.tsx
    <div className="space-y-4">
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-sm">Target Parameters</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form ref={formRef} action={formAction} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="kilnTemp" className="text-xs font-mono uppercase">
                  Kiln Temperature (°C)
                </Label>
                <Input
                  id="kilnTemp"
                  type="number"
                  step="0.1"
                  placeholder="1450"
                  value={targetValues.kilnTemp}
                  onChange={(e) => setTargetValues({ ...targetValues, kilnTemp: e.target.value })}
                  disabled={pending}
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="feedRate" className="text-xs font-mono uppercase">
                  Feed Rate (TPH)
                </Label>
                <Input
                  id="feedRate"
                  type="number"
                  step="0.1"
                  placeholder="220"
                  value={targetValues.feedRate}
                  onChange={(e) => setTargetValues({ ...targetValues, feedRate: e.target.value })}
                  disabled={pending}
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lsf" className="text-xs font-mono uppercase">
                  LSF Target (%)
                </Label>
                <Input
                  id="lsf"
                  type="number"
                  step="0.1"
                  placeholder="96"
                  value={targetValues.lsf}
                  onChange={(e) => setTargetValues({ ...targetValues, lsf: e.target.value })}
                  disabled={pending}
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="constraints" className="text-xs font-mono uppercase">
                Additional Constraints
              </Label>
              <Textarea
                id="constraints"
                name="constraints"
                placeholder="e.g., Keep kiln temp below 1480°C, LSF target is 96%, Minimize C₃A content"
                rows={3}
                disabled={pending}
                className="resize-none font-mono text-xs"
                defaultValue={
                  initialMetrics?.trigger
                    ? `Target LSF: ${initialMetrics.lsf}%, Keep temperature below 1480°C`
                    : ''
                }
              />
            </div>

            <SubmitButton />
          </form>
        </CardContent>
      </Card>

      {pending && (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="grid grid-cols-2 gap-4 mt-6">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
              <Skeleton className="h-32 mt-4" />
            </div>
          </CardContent>
        </Card>
      )}

      {!pending && state.recommendation && (
        <div>
          <RecommendationCard recommendation={state.recommendation} />

          <Card className="mt-4 bg-secondary/30">
            <CardContent className="p-4">
              <Button variant="outline" className="w-full" size="sm">
                <Download className="w-4 h-4" />
                Export as PDF
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
