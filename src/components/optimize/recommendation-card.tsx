'use client';

import { useActionState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { applyOptimization } from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useData } from '@/context/DataProvider';
import {
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Beaker,
  ThermometerSun,
  FileText,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface OptimizationRecommendation {
  recommendationId: string;
  timestamp: string;
  feedRateSetpoint: number;
  limestoneAdjustment: string;
  clayAdjustment: string;
  predictedLSF: number;
  explanation: string;
  originalMetrics: {
    kilnTemperature: number;
    feedRate: number;
    lsf: number;
    cao: number;
    sio2: number;
    al2o3: number;
    fe2o3: number;
  };
}

interface RecommendationCardProps {
  recommendation: OptimizationRecommendation | null;
  isGenerating?: boolean;
  progress?: number;
  error?: string | null;
}

const initialApplyState = { success: false, message: '' };

function ApplyButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full" size="lg">
      {pending ? (
        <>
          <span className="animate-spin">⚙️</span>
          Applying...
        </>
      ) : (
        <>
          <CheckCircle2 className="w-4 h-4" />
          Apply Recommendation
        </>
      )}
    </Button>
  );
}

export function RecommendationCard(props: RecommendationCardProps) {
  const {
    recommendation,
    isGenerating = false,
    progress = 0,
    error = null,
  } = props;
  const [state, formAction] = useActionState(
    applyOptimization,
    initialApplyState
  );
  const { toast } = useToast();
  const { refreshData } = useData();

  useEffect(() => {
    if (state.message) {
      toast({
        title: state.success ? 'Success' : 'Error',
        description: state.message,
        variant: state.success ? 'default' : 'destructive',
      });

      if (state.success) {
        refreshData();
      }
    }
  }, [state, toast, refreshData]);

  const getAdjustmentIcon = (adjustment: string) => {
    if (adjustment.startsWith('+')) {
      return <TrendingUp className="w-4 h-4 text-success" />;
    }
    if (adjustment.startsWith('-')) {
      return <TrendingDown className="w-4 h-4 text-destructive" />;
    }
    return null;
  };

  const getAdjustmentColor = (adjustment: string) => {
    if (adjustment.startsWith('+')) return 'bg-success/20 border-success/50 text-success';
    if (adjustment.startsWith('-')) return 'bg-destructive/20 border-destructive/50 text-destructive';
    return 'bg-secondary border-border text-foreground';
  };

  // Show progress bar and status if generating
  if (isGenerating) {
    return (
      <Card className="border-primary/50">
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono font-bold text-foreground">
                AI Optimization in Progress
              </span>
              <span className="text-sm font-mono text-primary font-bold">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p className="flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                Analyzing current plant composition
              </p>
              <p className="flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                Calculating optimal raw mix adjustments
              </p>
              <p className="flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                Generating AI recommendations
              </p>
            </div>
            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground italic">
                💡 You can navigate to other pages while this generates
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !isGenerating) {
    return (
      <Card className="border-destructive/50 bg-destructive/5">
        <CardContent className="p-4">
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!recommendation) {
    return (
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 border border-primary/30">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold font-mono uppercase tracking-wider text-foreground mb-1">
            AI Optimization
          </p>
          <p className="text-xs text-muted-foreground">
            Results will appear here after generation
          </p>
        </div>
      </div>
    );
  }

  // ...existing code for showing recommendation...
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.36, ease: [0.22, 0.9, 0.36, 1] }}
    >
      <Card className="border-2 border-primary/30 neon-glow">
        <CardHeader className="border-b border-border">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="font-mono text-xs">
                  {recommendation.recommendationId}
                </Badge>
                <span className="text-xs text-muted-foreground font-mono">
                  {new Date(recommendation.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <CardTitle className="text-base">
                AI Optimization Recommendation
              </CardTitle>
            </div>
            <div className="bg-primary/10 p-3 rounded-lg border border-primary/30">
              <Beaker className="w-6 h-6 text-primary" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-border/50 bg-secondary/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <ThermometerSun className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground">
                    Feed Rate Setpoint
                  </span>
                </div>
                <p className="text-2xl font-bold font-mono text-primary">
                  {Number.isFinite(recommendation.feedRateSetpoint) ? recommendation.feedRateSetpoint.toFixed(1) : '-'}{' '}
                  <span className="text-base text-muted-foreground">TPH</span>
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-secondary/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Beaker className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground">
                    Predicted LSF
                  </span>
                </div>
                <p className="text-2xl font-bold font-mono text-chart-purple">
                  {Number.isFinite(recommendation.predictedLSF) ? recommendation.predictedLSF.toFixed(1) : '-'}{' '}
                  <span className="text-base text-muted-foreground">%</span>
                </p>
              </CardContent>
            </Card>

            <Card className={`border ${getAdjustmentColor(recommendation.limestoneAdjustment)}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold font-mono uppercase tracking-wider">
                    Limestone Adjustment
                  </span>
                  {getAdjustmentIcon(recommendation.limestoneAdjustment)}
                </div>
                <p className="text-2xl font-bold font-mono">
                  {recommendation.limestoneAdjustment}
                </p>
              </CardContent>
            </Card>

            <Card className={`border ${getAdjustmentColor(recommendation.clayAdjustment)}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold font-mono uppercase tracking-wider">
                    Clay Adjustment
                  </span>
                  {getAdjustmentIcon(recommendation.clayAdjustment)}
                </div>
                <p className="text-2xl font-bold font-mono">
                  {recommendation.clayAdjustment}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border/50 bg-secondary/20">
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-primary" />
                <h4 className="font-bold font-mono uppercase tracking-wider text-xs text-foreground">
                  Detailed Explanation
                </h4>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {recommendation.explanation}
              </p>
            </CardContent>
          </Card>

          <form action={formAction}>
            <input
              type="hidden"
              name="predictedLSF"
              value={recommendation.predictedLSF}
            />
            <input
              type="hidden"
              name="limestoneAdjustment"
              value={recommendation.limestoneAdjustment}
            />
            <input
              type="hidden"
              name="clayAdjustment"
              value={recommendation.clayAdjustment}
            />
            <input
              type="hidden"
              name="feedRateSetpoint"
              value={recommendation.feedRateSetpoint}
            />
            <input type="hidden" name="kilnTemperature" value={recommendation.originalMetrics.kilnTemperature} />
            <input type="hidden" name="feedRate" value={recommendation.originalMetrics.feedRate} />
            <input type="hidden" name="lsf" value={recommendation.originalMetrics.lsf} />
            <input type="hidden" name="cao" value={recommendation.originalMetrics.cao} />
            <input type="hidden" name="sio2" value={recommendation.originalMetrics.sio2} />
            <input type="hidden" name="al2o3" value={recommendation.originalMetrics.al2o3} />
            <input type="hidden" name="fe2o3" value={recommendation.originalMetrics.fe2o3} />

            {state.success ? (
              <div className="flex items-center justify-center gap-2 p-4 bg-success/20 rounded-lg border border-success/50">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span className="font-bold font-mono text-success text-sm uppercase tracking-wider">
                  Recommendation Applied Successfully!
                </span>
              </div>
            ) : (
              <ApplyButton />
            )}
          </form>

          <div className="p-4 bg-warning/10 rounded-lg border border-warning/30 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-xs text-warning font-medium">
              Applying this recommendation will create a new production metric
              entry with the adjusted parameters. This action cannot be undone.
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}