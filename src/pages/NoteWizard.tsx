import { useState, useEffect } from "react";
import { NotesInput } from "@/components/NotesInput";
import { AIProcessor } from "@/components/AIProcessor";
import { StudyResults } from "@/components/StudyResults";
import { useAuth } from "@/hooks/useAuth";
import { useNotes } from "@/hooks/useNotes";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import mascotImage from "@/assets/retro-wizard-mascot.jpg";
import { Sparkles, Zap, Brain, ArrowLeft, Wand2 } from "lucide-react";
import { AuthModal } from "@/components/AuthModal";

const NoteWizard = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [currentNote, setCurrentNote] = useState<any>(null);
  const [enhanceWithInternet, setEnhanceWithInternet] = useState(true);
  const { user } = useAuth();
  const { createNote } = useNotes();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleProcessNotes = async (notes: string, images?: Array<{data: string, mimeType: string}>) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to process notes",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log("Processing notes:", notes);
      setIsProcessing(true);
      setShowResults(false);
      setCurrentNote(null);

      // First, create the note in the database
      const newNote = await createNote({
        title: notes.slice(0, 50) + (notes.length > 50 ? '...' : ''),
        original_content: notes,
        processing_status: 'pending'
      });

      if (!newNote) {
        throw new Error('Failed to create note');
      }

      // Then call the edge function to process it
      const { data, error } = await supabase.functions.invoke('process-notes', {
        body: { 
          noteId: newNote.id, 
          content: notes, 
          enhanceWithInternet: enhanceWithInternet,
          images: images || []
        }
      });

      if (error) {
        throw error;
      }

      if (data.success) {
        setCurrentNote(data.note);
        toast({
          title: "Processing Complete!",
          description: data.enhancedWithInternet 
            ? "Your notes have been processed with internet research" 
            : "Your notes have been successfully processed",
        });
      } else {
        throw new Error(data.error || 'Processing failed');
      }
    } catch (error: any) {
      console.error('Error processing notes:', error);
      toast({
        title: "Processing Failed",
        description: error.message || "An error occurred while processing your notes",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProcessingComplete = () => {
    setIsProcessing(false);
    setShowResults(true);
  };

  const handleReset = () => {
    setIsProcessing(false);
    setShowResults(false);
    setCurrentNote(null);
  };


  return (
    <div className="min-h-screen bg-gradient-terminal p-4 scanlines">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center py-8">
          <div className="flex items-center justify-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="absolute left-4 top-8 font-retro"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              BACK HOME
            </Button>
            
            <div className="relative">
              <img 
                src={mascotImage} 
                alt="Retro Wizard Mascot" 
                className="w-20 h-20 rounded-full border-4 border-primary shadow-neon"
              />
              <div className="absolute -top-2 -right-2">
                <Sparkles className="w-6 h-6 text-accent animate-pulse" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-retro font-bold glow-text mb-2">
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

        {/* Main Interface */}
        <div className="space-y-6">
          {!user ? (
            <div className="text-center py-12 bg-card border-2 border-primary scanlines">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-retro font-bold glow-text mb-2">ACCESS REQUIRED</h2>
              <p className="font-retro text-muted-foreground mb-6 max-w-md mx-auto">Sign in to transform your notes using the Retro Note Wizard</p>
              <Button variant="neon" onClick={() => setShowAuthModal(true)} className="font-retro">LOGIN TO CONTINUE</Button>
            </div>
          ) : (
            <>
              {!isProcessing && !showResults && !currentNote && (
                <NotesInput 
                  onProcessNotes={handleProcessNotes}
                  isProcessing={isProcessing}
                  enhanceWithInternet={enhanceWithInternet}
                  onToggleInternet={setEnhanceWithInternet}
                />
              )}

              <AIProcessor 
                isProcessing={isProcessing}
                onComplete={handleProcessingComplete}
              />

              <StudyResults 
                isVisible={!!currentNote && !isProcessing}
                onReset={handleReset}
                noteData={currentNote}
              />
            </>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center pt-8 border-t border-primary">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Wand2 className="w-4 h-4 text-primary" />
            <span className="font-retro text-sm text-muted-foreground">
              Magical AI-Powered Note Transformation
            </span>
            <Sparkles className="w-4 h-4 text-accent" />
          </div>
        </footer>
      {/* Auth Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    </div>
  );
};

export default NoteWizard;