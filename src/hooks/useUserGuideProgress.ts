import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface UserGuideProgress {
  current_step: number;
  completed_steps: number[];
}

export const useUserGuideProgress = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load progress from database
  const loadProgress = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_guide_progress')
        .select('current_step, completed_steps')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCurrentStep(data.current_step);
        // Ensure completed_steps is an array of numbers
        const steps = Array.isArray(data.completed_steps) 
          ? data.completed_steps.filter((step: any): step is number => typeof step === 'number')
          : [];
        setCompletedSteps(new Set(steps));
      }
    } catch (error) {
      console.error('Error loading guide progress:', error);
      toast({
        title: "Error",
        description: "Failed to load your guide progress",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  // Save progress to database
  const saveProgress = useCallback(async (step: number, completed: Set<number>) => {
    if (!user || isSaving) return;

    setIsSaving(true);
    try {
      const progressData = {
        user_id: user.id,
        current_step: step,
        completed_steps: Array.from(completed),
      };

      const { error } = await supabase
        .from('user_guide_progress')
        .upsert(progressData, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving guide progress:', error);
      toast({
        title: "Warning",
        description: "Failed to save your progress",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [user, toast, isSaving]);

  // Auto-save whenever progress changes
  useEffect(() => {
    if (!isLoading && user) {
      const timeoutId = setTimeout(() => {
        saveProgress(currentStep, completedSteps);
      }, 500); // Debounce saves by 500ms

      return () => clearTimeout(timeoutId);
    }
  }, [currentStep, completedSteps, isLoading, user, saveProgress]);

  // Load progress on mount
  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  // Navigation functions that trigger auto-save
  const goToStep = useCallback((stepIndex: number) => {
    setCurrentStep(stepIndex);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => {
      const newStep = Math.min(prev + 1, 7); // Max 8 steps (0-7)
      return newStep;
    });
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);

  const markStepComplete = useCallback(() => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
  }, [currentStep]);

  const resetProgress = useCallback(() => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
  }, []);

  // Force save function for immediate saving (e.g., when leaving page)
  const forceSave = useCallback(async () => {
    if (user && !isSaving) {
      await saveProgress(currentStep, completedSteps);
    }
  }, [user, currentStep, completedSteps, saveProgress, isSaving]);

  return {
    currentStep,
    completedSteps,
    isLoading,
    isSaving,
    goToStep,
    nextStep,
    prevStep,
    markStepComplete,
    resetProgress,
    forceSave,
  };
};