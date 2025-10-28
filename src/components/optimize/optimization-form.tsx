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
    <div className="space-y-6">
      {initialMetrics && (
        <Card className="bg-primary/5 border-primary/30">
          <CardHeader>
            <CardTitle className="text-sm">Current Plant State</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              {initialMetrics.kilnTemperature && (
                <div>
                  <span className="text-muted-foreground">Temperature:</span>
                  <span className="ml-2 font-mono font-bold text-primary">
                    {formatNumber(initialMetrics.kilnTemperature, { decimals: 1 })}°C
                  </span>
                </div>
              )}
              {initialMetrics.feedRate && (
                <div>
                  <span className="text-muted-foreground">Feed Rate:</span>
                  <span className="ml-2 font-mono font-bold text-foreground">
                    {formatNumber(initialMetrics.feedRate, { decimals: 1 })} TPH
                  </span>
                </div>
              )}
              {initialMetrics.lsf && (
                <div>
                  <span className="text-muted-foreground">LSF:</span>
                  <span className="ml-2 font-mono font-bold text-foreground">
                    {formatNumber(initialMetrics.lsf, { decimals: 1 })}%
                  </span>
                </div>
              )}
              {initialMetrics.cao && (
                <div>
                  <span className="text-muted-foreground">CaO:</span>
                  <span className="ml-2 font-mono font-bold text-foreground">
                    {formatNumber(initialMetrics.cao, { decimals: 2 })}%
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-sm">Target Parameters (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form ref={formRef} action={formAction} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            <div className="bg-secondary/50 rounded-lg p-4 border border-border">
              <p className="font-bold text-xs mb-2 font-mono uppercase tracking-wider">
                💡 Example Constraints:
              </p>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>• "LSF must be between 94% and 98%"</li>
                <li>• "Keep kiln temperature below 1470°C"</li>
                <li>• "Maximize C₃S content for early strength"</li>
                <li>• "Reduce Fe₂O₃ content to improve whiteness"</li>
              </ul>
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