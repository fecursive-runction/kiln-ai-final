'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useData } from '@/context/DataProvider';
import { OptimizationForm } from '@/components/optimize/optimization-form';
import { RecommendationCard } from '@/components/optimize/recommendation-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Activity } from 'lucide-react';
import { formatNumber } from '@/lib/formatters';

// src/app/optimize/page.tsx
function OptimizationPageContent() {
  const searchParams = useSearchParams();
  const { liveMetrics, loading } = useData();

  const initialMetrics = {
    kilnTemperature: searchParams.get('kilnTemperature')
      ? Number(searchParams.get('kilnTemperature'))
      : undefined,
    feedRate: searchParams.get('feedRate')
      ? Number(searchParams.get('feedRate'))
      : undefined,
    lsf: searchParams.get('lsf') ? Number(searchParams.get('lsf')) : undefined,
    cao: searchParams.get('cao') ? Number(searchParams.get('cao')) : undefined,
    sio2: searchParams.get('sio2')
      ? Number(searchParams.get('sio2'))
      : undefined,
    al2o3: searchParams.get('al2o3')
      ? Number(searchParams.get('al2o3'))
      : undefined,
    fe2o3: searchParams.get('fe2o3')
      ? Number(searchParams.get('fe2o3'))
      : undefined,
    trigger: searchParams.get('trigger') === 'true',
  };

  // State for optimization result and error
  const [recommendation, setRecommendation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);

  // Progress simulation
  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 10;
        });
      }, 500);
      return () => clearInterval(interval);
    } else {
      setProgress(0);
    }
  }, [isGenerating]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="bg-primary/10 p-3 rounded-lg border border-primary/30">
          <Sparkles className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold font-mono uppercase tracking-wider text-foreground">
            AI Process Optimizer
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Get AI-powered recommendations for optimal production
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN - Live Plant State */}
        <div>
          <Card className="h-full">
            <CardHeader className="border-b border-border">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Activity className="w-4 h-4 text-primary" />
                Live Plant State
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {liveMetrics ? (
                <div className="space-y-3">
                  <MetricRow 
                    label="Kiln Temperature" 
                    value={liveMetrics.kilnTemperature} 
                    unit="°C"
                    decimals={1}
                  />
                  <MetricRow 
                    label="Feed Rate" 
                    value={liveMetrics.feedRate} 
                    unit="TPH"
                    decimals={1}
                  />
                  <MetricRow 
                    label="LSF" 
                    value={liveMetrics.lsf} 
                    unit="%"
                    decimals={1}
                  />
                  
                  <div className="border-t border-border pt-3 mt-3">
                    <p className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground mb-2">
                      Raw Mix
                    </p>
                    <MetricRow 
                      label="CaO" 
                      value={liveMetrics.cao} 
                      unit="%"
                      decimals={2}
                    />
                    <MetricRow 
                      label="SiO₂" 
                      value={liveMetrics.sio2} 
                      unit="%"
                      decimals={2}
                    />
                    <MetricRow 
                      label="Al₂O₃" 
                      value={liveMetrics.al2o3} 
                      unit="%"
                      decimals={2}
                    />
                    <MetricRow 
                      label="Fe₂O₃" 
                      value={liveMetrics.fe2o3} 
                      unit="%"
                      decimals={2}
                    />
                  </div>

                  <div className="border-t border-border pt-3 mt-3">
                    <p className="text-xs font-bold font-mono uppercase tracking-wider text-muted-foreground mb-2">
                      Clinker Phases
                    </p>
                    <MetricRow 
                      label="C₃S (Alite)" 
                      value={liveMetrics.c3s} 
                      unit="%"
                      decimals={1}
                    />
                    <MetricRow 
                      label="C₂S (Belite)" 
                      value={liveMetrics.c2s} 
                      unit="%"
                      decimals={1}
                    />
                    <MetricRow 
                      label="C₃A" 
                      value={liveMetrics.c3a} 
                      unit="%"
                      decimals={1}
                    />
                    <MetricRow 
                      label="C₄AF" 
                      value={liveMetrics.c4af} 
                      unit="%"
                      decimals={1}
                    />
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No live data available
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* MIDDLE COLUMN - Optimization Form */}
        <div>
          <OptimizationForm
            initialMetrics={
              Object.values(initialMetrics).some((v) => v !== undefined)
                ? initialMetrics
                : undefined
            }
            onRecommendation={setRecommendation}
            onError={setError}
            isGenerating={isGenerating}
            setIsGenerating={setIsGenerating}
            setProgress={setProgress}
          />
          {/* Progress and error now handled in RecommendationCard/result area */}
        </div>

        {/* RIGHT COLUMN - AI Results */}
        <div>
          <Card className="h-full bg-secondary/20 border-dashed">
            <CardContent className="p-8 flex items-center justify-center h-full">
              <div className="w-full">
                <RecommendationCard
                  recommendation={recommendation}
                  isGenerating={isGenerating}
                  progress={progress}
                  error={error}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="bg-secondary/30">
        <CardHeader>
          <CardTitle className="text-sm">How It Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div className="space-y-2">
              <div className="bg-primary/10 w-10 h-10 rounded-full flex items-center justify-center mb-3 border border-primary/30">
                <span className="font-bold font-mono text-primary">1</span>
              </div>
              <h4 className="font-bold text-foreground font-mono uppercase tracking-wider text-xs">
                Analyze Current State
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                AI analyzes your current production metrics including temperature, LSF, and chemical composition.
              </p>
            </div>

            <div className="space-y-2">
              <div className="bg-primary/10 w-10 h-10 rounded-full flex items-center justify-center mb-3 border border-primary/30">
                <span className="font-bold font-mono text-primary">2</span>
              </div>
              <h4 className="font-bold text-foreground font-mono uppercase tracking-wider text-xs">
                Generate Recommendations
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Google Gemini AI generates optimized adjustments for limestone, clay, and feed rate based on your constraints.
              </p>
            </div>

            <div className="space-y-2">
              <div className="bg-primary/10 w-10 h-10 rounded-full flex items-center justify-center mb-3 border border-primary/30">
                <span className="font-bold font-mono text-primary">3</span>
              </div>
              <h4 className="font-bold text-foreground font-mono uppercase tracking-wider text-xs">
                Apply & Monitor
              </h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Review the detailed explanation, apply the recommendation, and monitor the results in real-time.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricRow({ 
  label, 
  value, 
  unit, 
  decimals = 2 
}: { 
  label: string; 
  value: number; 
  unit: string;
  decimals?: number;
}) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground font-medium">
        {label}
      </span>
      <span className="text-xs font-bold font-mono text-foreground">
        {formatNumber(value, { decimals })} {unit}
      </span>
    </div>
  );
}

export default function OptimizePage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <Skeleton className="lg:col-span-3 h-96" />
            <Skeleton className="lg:col-span-6 h-96" />
            <Skeleton className="lg:col-span-3 h-96" />
          </div>
        </div>
      }
    >
      <OptimizationPageContent />
    </Suspense>
  );
}