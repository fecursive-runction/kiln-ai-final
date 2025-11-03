'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useData } from '@/context/DataProvider';
import { Sparkles, Loader2 } from 'lucide-react';

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
  liveMetrics?: {
    kilnTemperature?: number;
    feedRate?: number;
    lsf?: number;
    cao?: number;
    sio2?: number;
    al2o3?: number;
    fe2o3?: number;
  };
  onOptimized?: () => void;
} // <--- This closing brace was missing!

export function OptimizationForm({ initialMetrics, liveMetrics, onOptimized }: OptimizationFormProps) {
  const { pendingOptimization, startOptimization, clearOptimization } = useData();
  const formRef = useRef<HTMLFormElement>(null);

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
    if (initialMetrics?.trigger && formRef.current && !pendingOptimization.isGenerating && !pendingOptimization.recommendation) {
      setTimeout(() => {
        handleSubmit(new Event('submit') as any);
      }, 100);
    }
  }, [initialMetrics?.trigger]);

  const [shouldScroll, setShouldScroll] = useState(false);

  useEffect(() => {
    if (pendingOptimization.recommendation && onOptimized && shouldScroll) {
      onOptimized();
      setShouldScroll(false);
    }
  }, [pendingOptimization.recommendation, onOptimized, shouldScroll]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setShouldScroll(true);

    const formData = new FormData();
    if (liveMetrics) {
      Object.entries(liveMetrics).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const form = e.currentTarget;
    const constraints = form.elements.namedItem('constraints') as HTMLTextAreaElement;
    formData.append('constraints', constraints.value);

    await startOptimization(formData);
  };

  const handleCancel = () => {
    clearOptimization();
  };

  return (
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
                disabled={pendingOptimization.isGenerating}
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
                disabled={pendingOptimization.isGenerating}
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
                disabled={pendingOptimization.isGenerating}
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
              disabled={pendingOptimization.isGenerating}
              className="resize-none font-mono text-xs"
              defaultValue={
                initialMetrics?.trigger
                  ? `Target LSF: ${initialMetrics?.lsf ?? ''}%, Keep temperature below 1480°C`
                  : ''
              }
            />
          </div>

          <div className="w-full">
            {pendingOptimization.isGenerating ? (
              <div className="flex gap-3">
                <Button
                  type="button"
                  disabled
                  size="lg"
                  className="flex-1 min-w-0 font-mono"
                >
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Optimizing...
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCancel}
                  size="lg"
                  className="font-mono flex-shrink-0"
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                type="submit"
                size="lg"
                className="w-full font-mono"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Optimize
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}