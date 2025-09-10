import { useState } from "react";
import { NotesInput } from "@/components/NotesInput";
import { AIProcessor } from "@/components/AIProcessor";
import { StudyResults } from "@/components/StudyResults";
import mascotImage from "@/assets/retro-wizard-mascot.jpg";
import { Sparkles, Zap, Brain } from "lucide-react";

const Index = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleProcessNotes = (notes: string) => {
    console.log("Processing notes:", notes);
    setIsProcessing(true);
    setShowResults(false);
  };

  const handleProcessingComplete = () => {
    setIsProcessing(false);
    setShowResults(true);
  };

  const handleReset = () => {
    setIsProcessing(false);
    setShowResults(false);
  };

  return (
    <div className="min-h-screen bg-gradient-terminal p-4 scanlines">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center py-8">
          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="relative">
              <img 
                src={mascotImage} 
                alt="Retro Wizard Mascot" 
                className="w-24 h-24 rounded-full border-4 border-primary shadow-neon"
              />
              <div className="absolute -top-2 -right-2">
                <Sparkles className="w-8 h-8 text-accent animate-pulse" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl md:text-6xl font-retro font-bold glow-text mb-2">
                RETRO NOTE WIZARD
              </h1>
              <div className="flex items-center justify-center gap-4 text-lg font-retro text-secondary">
                <Brain className="w-5 h-5" />
                <span>TRANSFORM</span>
                <Zap className="w-5 h-5 text-accent" />
                <span className="glow-pink">STUDY</span>
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="glow-blue">SUCCEED</span>
              </div>
            </div>
          </div>
          
          <p className="text-lg font-retro text-muted-foreground max-w-2xl mx-auto">
            Turn your messy notes into organized summaries, flashcards, and Q&A sets with the power of AI magic ✨
          </p>
        </header>

        {/* Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-card border-2 border-primary p-4 text-center scanlines">
            <div className="text-2xl font-retro font-bold glow-text">1,337</div>
            <div className="text-sm font-retro text-muted-foreground">Notes Transformed</div>
          </div>
          <div className="bg-card border-2 border-secondary p-4 text-center scanlines">
            <div className="text-2xl font-retro font-bold glow-blue">42,069</div>
            <div className="text-sm font-retro text-muted-foreground">Flashcards Created</div>
          </div>
          <div className="bg-card border-2 border-accent p-4 text-center scanlines">
            <div className="text-2xl font-retro font-bold glow-pink">98.5%</div>
            <div className="text-sm font-retro text-muted-foreground">Success Rate</div>
          </div>
        </div>

        {/* Main Interface */}
        <div className="space-y-6">
          {!isProcessing && !showResults && (
            <NotesInput 
              onProcessNotes={handleProcessNotes}
              isProcessing={isProcessing}
            />
          )}

          <AIProcessor 
            isProcessing={isProcessing}
            onComplete={handleProcessingComplete}
          />

          <StudyResults 
            isVisible={showResults}
            onReset={handleReset}
          />
        </div>

        {/* Footer */}
        <footer className="text-center pt-8 border-t border-primary">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="font-retro text-sm text-muted-foreground">
              Powered by AI Magic & 80s Nostalgia
            </span>
            <Sparkles className="w-4 h-4 text-accent" />
          </div>
          <div className="text-xs font-retro text-muted-foreground cursor-blink">
            Ready to make studying retroactively awesome
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Index;