import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  ArrowRight, 
  PlayCircle, 
  CheckCircle, 
  Star,
  Brain,
  Users,
  FileText,
  Sparkles,
  BookOpen,
  Home,
  Zap
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useUserGuideProgress } from "@/hooks/useUserGuideProgress";
import mascotImage from "@/assets/retro-wizard-mascot.jpg";

interface GuideStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  route?: string;
  interactive: boolean;
  tasks: string[];
  tips: string[];
}

const guideSteps: GuideStep[] = [
  {
    id: "welcome",
    title: "Welcome to StudyWizard",
    description: "Your AI-powered learning companion that transforms messy notes into organized study materials!",
    icon: Sparkles,
    interactive: false,
    tasks: ["Click 'Start Interactive Tour' to begin your journey"],
    tips: ["This guide will teach you everything about StudyWizard", "You can navigate at your own pace"]
  },
  {
    id: "dashboard",
    title: "Your Dashboard",
    description: "This is your command center - access all features from here.",
    icon: Home,
    route: "/",
    interactive: true,
    tasks: [
      "Explore the navigation menu",
      "Notice the retro cyberpunk design theme",
      "Check out the feature cards"
    ],
    tips: ["Each card represents a major feature", "The design is inspired by retro computing"]
  },
  {
    id: "note-wizard",
    title: "Transform Notes with AI",
    description: "Turn your messy notes into organized summaries, flashcards, and Q&A sets using AI magic!",
    icon: Brain,
    route: "/note-wizard",
    interactive: true,
    tasks: [
      "Click 'Go to Note Wizard' to visit the feature",
      "Try adding some sample text or an image",
      "Enable 'Enhance with Internet Research' for better results",
      "Click 'TRANSFORM NOTES' to see AI in action"
    ],
    tips: [
      "You can process text, images, or both together",
      "Internet enhancement adds research context",
      "The AI creates summaries, key points, flashcards, and Q&A"
    ]
  },
  {
    id: "notes-management",
    title: "Manage Your Notes",
    description: "View, organize, and manage all your transformed notes in one place.",
    icon: FileText,
    route: "/notes",
    interactive: true,
    tasks: [
      "Visit your Notes library",
      "Browse through your processed notes",
      "Try the search and filter options",
      "Open a note to see the full study materials"
    ],
    tips: [
      "Notes are automatically saved after processing",
      "You can export notes for offline study",
      "Each note includes generated study materials"
    ]
  },
  {
    id: "learn-mode",
    title: "Interactive Learning",
    description: "Explore topics deeply with AI-powered research, videos, and community discussions.",
    icon: BookOpen,
    route: "/learn",
    interactive: true,
    tasks: [
      "Go to Learn mode",
      "Enter a topic you want to explore",
      "Browse the generated Wikipedia resources",
      "Check out recommended YouTube videos",
      "Explore Reddit community discussions"
    ],
    tips: [
      "Perfect for discovering new topics",
      "Combines multiple learning resources",
      "Great for research and exploration"
    ]
  },
  {
    id: "quizzes",
    title: "Test Your Knowledge",
    description: "Generate AI-powered quizzes based on any topic to test your understanding.",
    icon: Zap,
    route: "/quizzes",
    interactive: true,
    tasks: [
      "Navigate to the Quizzes section",
      "Enter a topic for quiz generation",
      "Take the generated quiz",
      "Review your score and explanations"
    ],
    tips: [
      "Quizzes adapt to your chosen topic",
      "Each question includes detailed explanations",
      "Great for self-assessment and exam prep"
    ]
  },
  {
    id: "work-rooms",
    title: "Collaborative Study Rooms",
    description: "Create or join study rooms to collaborate with others and share notes.",
    icon: Users,
    route: "/work-rooms",
    interactive: true,
    tasks: [
      "Explore the Work Rooms feature",
      "Try creating a new study room",
      "Learn about sharing notes with room members",
      "Understand room privacy settings"
    ],
    tips: [
      "Perfect for group study sessions",
      "Share processed notes instantly",
      "Collaborate on learning projects"
    ]
  },
  {
    id: "mastery",
    title: "You're Now a StudyWizard Master!",
    description: "Congratulations! You've learned all the key features. Ready to transform your learning?",
    icon: Star,
    interactive: false,
    tasks: [
      "Start using StudyWizard for your real studies",
      "Experiment with different note types",
      "Share your experience with others"
    ],
    tips: [
      "The more you use it, the better your results",
      "Don't forget to enable internet research",
      "Combine features for maximum learning efficiency"
    ]
  }
];

const UserGuide = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    currentStep,
    completedSteps,
    isLoading,
    goToStep,
    nextStep,
    prevStep,
    markStepComplete,
    forceSave,
  } = useUserGuideProgress();

  const currentGuideStep = guideSteps[currentStep];
  const progress = (currentStep / (guideSteps.length - 1)) * 100;

  const goToFeature = async () => {
    if (currentGuideStep.route) {
      await forceSave(); // Save before navigating
      navigate(currentGuideStep.route);
    }
  };

  const handleBackHome = async () => {
    await forceSave(); // Save before going home
    navigate('/');
  };

  const jumpToStep = (stepIndex: number) => {
    goToStep(stepIndex);
  };

  // Save progress when component unmounts
  useEffect(() => {
    return () => {
      forceSave();
    };
  }, [forceSave]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-terminal p-4 scanlines flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-retro text-primary">Loading your progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-terminal p-4 scanlines">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackHome}
              className="font-retro"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              BACK HOME
            </Button>
            
            <div className="flex items-center gap-3">
              <img 
                src={mascotImage} 
                alt="Guide Mascot" 
                className="w-12 h-12 rounded-full border-2 border-primary shadow-neon"
              />
              <div>
                <h1 className="text-2xl font-retro font-bold glow-text">INTERACTIVE USER GUIDE</h1>
                <p className="text-sm text-muted-foreground font-retro">Master every feature step by step</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-retro text-muted-foreground">Progress</p>
              <p className="text-lg font-retro glow-text">
                {completedSteps.size}/{guideSteps.length} Complete
              </p>
            </div>
            <Progress value={progress} className="w-32" />
          </div>
        </header>

        {/* Step Navigator */}
        <Card className="p-4 bg-card border-2 border-primary scanlines">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-retro glow-text">GUIDE STEPS</h2>
            <Badge variant="outline" className="font-retro">
              Step {currentStep + 1} of {guideSteps.length}
            </Badge>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {guideSteps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = completedSteps.has(index);
              const isCurrent = index === currentStep;
              
              return (
                <Button
                  key={step.id}
                  variant={isCurrent ? "neon" : isCompleted ? "cyber" : "outline"}
                  size="sm"
                  onClick={() => jumpToStep(index)}
                  className="flex flex-col items-center gap-1 h-auto p-3 font-retro text-xs"
                >
                  <div className="relative">
                    <Icon className="w-4 h-4" />
                    {isCompleted && (
                      <CheckCircle className="w-3 h-3 absolute -top-1 -right-1 text-green-400" />
                    )}
                  </div>
                  <span className="truncate max-w-full">{step.title}</span>
                </Button>
              );
            })}
          </div>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Step Content */}
          <div className="lg:col-span-2">
            <Card className="p-6 bg-card border-2 border-primary scanlines">
              <div className="space-y-6">
                {/* Step Header */}
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/20 rounded-lg border border-primary">
                    <currentGuideStep.icon className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-retro font-bold glow-text mb-2">
                      {currentGuideStep.title}
                    </h2>
                    <p className="text-muted-foreground font-retro">
                      {currentGuideStep.description}
                    </p>
                  </div>
                </div>

                {/* Tasks */}
                <div className="space-y-3">
                  <h3 className="text-lg font-retro text-primary">Tasks to Complete:</h3>
                  <div className="space-y-2">
                    {currentGuideStep.tasks.map((task, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-secondary">
                        <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-xs font-retro text-primary">
                          {index + 1}
                        </div>
                        <span className="font-retro text-sm">{task}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Interactive Actions */}
                {currentGuideStep.interactive && currentGuideStep.route && (
                  <div className="flex gap-3">
                    <Button variant="wizard" onClick={goToFeature} className="flex-1">
                      <PlayCircle className="w-4 h-4 mr-2" />
                      Go to {currentGuideStep.title}
                    </Button>
                    <Button variant="cyber" onClick={markStepComplete}>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark Complete
                    </Button>
                  </div>
                )}

                {!currentGuideStep.interactive && (
                  <Button variant="cyber" onClick={markStepComplete} className="w-full">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Complete
                  </Button>
                )}
              </div>
            </Card>
          </div>

          {/* Tips Sidebar */}
          <div className="space-y-4">
            <Card className="p-4 bg-card border-2 border-secondary scanlines">
              <h3 className="text-lg font-retro text-secondary mb-3">💡 PRO TIPS</h3>
              <div className="space-y-3">
                {currentGuideStep.tips.map((tip, index) => (
                  <div key={index} className="p-3 bg-secondary/10 rounded border border-secondary/30">
                    <p className="text-sm font-retro">{tip}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* User Status */}
            {user && (
              <Card className="p-4 bg-card border-2 border-accent scanlines">
                <h3 className="text-lg font-retro text-accent mb-3">👤 YOUR PROGRESS</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-retro">Completed Steps:</span>
                    <Badge variant="outline">{completedSteps.size}/{guideSteps.length}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-retro">Current Step:</span>
                    <Badge variant="secondary">{currentStep + 1}</Badge>
                  </div>
                  <Progress value={progress} className="mt-2" />
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Navigation */}
        <Card className="p-4 bg-card border-2 border-primary scanlines">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
              className="font-retro"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous Step
            </Button>

            <div className="text-center">
              <p className="font-retro text-sm text-muted-foreground">
                Step {currentStep + 1} of {guideSteps.length}
              </p>
              <p className="font-retro text-lg glow-text">{currentGuideStep.title}</p>
            </div>

            <Button
              variant={currentStep === guideSteps.length - 1 ? "wizard" : "outline"}
              onClick={nextStep}
              disabled={currentStep === guideSteps.length - 1}
              className="font-retro"
            >
              {currentStep === guideSteps.length - 1 ? "Finish Guide" : "Next Step"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default UserGuide;