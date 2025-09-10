import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Brain, Zap, Sparkles, CheckCircle } from "lucide-react";

interface AIProcessorProps {
  isProcessing: boolean;
  onComplete: () => void;
}

const processingSteps = [
  { id: 1, label: "PARSING INPUT", description: "Analyzing text structure...", icon: Brain },
  { id: 2, label: "CLEANING DATA", description: "Removing noise & organizing...", icon: Zap },
  { id: 3, label: "EXTRACTING CONCEPTS", description: "Identifying key topics...", icon: Sparkles },
  { id: 4, label: "GENERATING MATERIALS", description: "Creating study resources...", icon: CheckCircle },
];

export const AIProcessor = ({ isProcessing, onComplete }: AIProcessorProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isProcessing) {
      setCurrentStep(0);
      setProgress(0);
      return;
    }

    const stepDuration = 1500; // 1.5 seconds per step
    let stepTimer: NodeJS.Timeout;
    let progressTimer: NodeJS.Timeout;

    const nextStep = () => {
      setCurrentStep(prev => {
        const next = prev + 1;
        if (next >= processingSteps.length) {
          setTimeout(onComplete, 500);
          return prev;
        }
        return next;
      });
    };

    const updateProgress = () => {
      const stepProgress = ((currentStep + 1) / processingSteps.length) * 100;
      setProgress(stepProgress);
      
      if (currentStep < processingSteps.length - 1) {
        stepTimer = setTimeout(nextStep, stepDuration);
      }
    };

    progressTimer = setTimeout(updateProgress, 100);
    
    return () => {
      clearTimeout(stepTimer);
      clearTimeout(progressTimer);
    };
  }, [currentStep, isProcessing, onComplete]);

  if (!isProcessing) return null;

  return (
    <Card className="p-6 bg-card border-2 border-secondary scanlines">
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-xl font-retro glow-blue mb-2">AI WIZARD AT WORK</h3>
          <p className="text-sm text-muted-foreground font-retro">
            Transforming chaos into clarity...
          </p>
        </div>

        <div className="space-y-4">
          {processingSteps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index === currentStep;
            const isComplete = index < currentStep;
            
            return (
              <div 
                key={step.id}
                className={`flex items-center gap-4 p-3 rounded border transition-all duration-300 ${
                  isActive 
                    ? 'border-primary bg-primary/10 shadow-neon' 
                    : isComplete 
                      ? 'border-success bg-success/10' 
                      : 'border-muted bg-muted/20'
                }`}
              >
                <div className={`p-2 rounded-full border ${
                  isActive 
                    ? 'border-primary text-primary animate-pulse' 
                    : isComplete 
                      ? 'border-success text-success' 
                      : 'border-muted-foreground text-muted-foreground'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className={`font-retro text-sm font-bold ${
                    isActive ? 'glow-text' : isComplete ? 'text-success' : 'text-muted-foreground'
                  }`}>
                    {step.label}
                  </div>
                  <div className="text-xs text-muted-foreground font-retro">
                    {step.description}
                  </div>
                </div>
                {isActive && (
                  <div className="text-primary font-retro text-xs cursor-blink">
                    PROCESSING
                  </div>
                )}
                {isComplete && (
                  <CheckCircle className="w-5 h-5 text-success" />
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          <Progress value={progress} className="h-3 bg-muted" />
          <div className="text-center">
            <span className="text-xs font-retro text-muted-foreground">
              {Math.round(progress)}% COMPLETE
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};