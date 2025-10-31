// src/components/optimize/optimization-form.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { runOptimization } from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot, Sparkles, Loader2 } from 'lucide-react';
import { RecommendationCard } from './recommendation-card';

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
  onRecommendation?: (rec: any) => void;
  onError?: (err: string | null) => void;
  isGenerating: boolean;
  setIsGenerating: (val: boolean) => void;
  setProgress: (val: number) => void;
}

export function OptimizationForm({ initialMetrics, onRecommendation, onError, isGenerating, setIsGenerating, setProgress }: OptimizationFormProps) {
  // recommendation and error are now managed by parent
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const [targetValues, setTargetValues] = useState({
    kilnTemp: '',
    feedRate: '',
    lsf: '',
    cao: '',
    sio2: '',
    al2o3: '',
    fe2o3: '',
  });

  // Progress simulation is now managed by parent

  // Auto-trigger if needed
  useEffect(() => {
    if (initialMetrics?.trigger && formRef.current && !isGenerating && !onRecommendation) {
      setTimeout(() => {
        handleSubmit(new Event('submit') as any);
      }, 100);
    }
  }, [initialMetrics?.trigger]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Allow navigation while generating
  setIsGenerating(true);
  if (onError) onError(null);
  if (onRecommendation) onRecommendation(null);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    const formData = new FormData(e.currentTarget);

    try {
      toast({
        title: 'Generating optimization...',
        description: 'This may take 10-15 seconds. Feel free to navigate away.',
      });

      // Non-blocking async call
      const result = await runOptimization({ error: null, recommendation: null }, formData);

      if (result.error) {
        if (onError) onError(result.error);
        toast({
          variant: 'destructive',
          title: 'Optimization Error',
          description: result.error,
        });
      } else if (result.recommendation) {
        if (onRecommendation) onRecommendation(result.recommendation);
        setProgress(100);
        toast({
          title: 'Optimization Complete',
          description: 'Recommendation generated successfully.',
        });
      }
    } catch (err: any) {
      console.error('Optimization error:', err);
  if (onError) onError(err.message || 'An unexpected error occurred.');
      toast({
        variant: 'destructive',
        title: 'Optimization Failed',
        description: err.message || 'Please try again.',
      });
    } finally {
  setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
  setIsGenerating(false);
  setProgress(0);
      toast({
        title: 'Optimization Cancelled',
        description: 'Generation stopped.',
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-sm">Target Parameters</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
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
                  disabled={isGenerating}
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
                  disabled={isGenerating}
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
                  disabled={isGenerating}
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
                disabled={isGenerating}
                className="resize-none font-mono text-xs"
                defaultValue={
                  initialMetrics?.trigger
                    ? `Target LSF: ${initialMetrics.lsf}%, Keep temperature below 1480°C`
                    : ''
                }
              />
            </div>

            <div className="flex flex-row gap-3 items-center">
              <div className="flex-1">
                <Button
                  type="submit"
                  disabled={isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      <span className="font-mono">Generating...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      <span className="font-mono">Generate Optimization</span>
                    </>
                  )}
                </Button>
              </div>
              {isGenerating && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  size="lg"
                  className="font-mono"
                >
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Progress, error, and recommendation are now rendered in parent */}
    </div>
  );
}