import { useState } from "react";
import { NotesList } from "@/components/NotesList";
import { StudyResults } from "@/components/StudyResults";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileText, Sparkles, Users } from "lucide-react";

const Notes = () => {
  const [currentNote, setCurrentNote] = useState<any>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleViewNote = (note: any) => {
    setCurrentNote(note);
  };

  const handleReset = () => {
    setCurrentNote(null);
  };

  if (!user) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-terminal p-4 scanlines">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center py-8 relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="absolute left-0 top-8 font-retro"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            BACK HOME
          </Button>
          
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-secondary/10 border-2 border-secondary">
              <FileText className="w-8 h-8 text-secondary" />
            </div>
            <div>
              <h1 className="text-3xl md:text-5xl font-retro font-bold glow-text mb-2">
                MY NOTES
              </h1>
              <div className="flex items-center justify-center gap-2 text-lg font-retro text-secondary">
                <FileText className="w-5 h-5" />
                <span className="glow-blue">BROWSE & STUDY</span>
              </div>
            </div>
          </div>
          
          <p className="text-lg font-retro text-muted-foreground max-w-2xl mx-auto">
            Access all your transformed notes, flashcards, and study materials in one place
          </p>
        </header>

        {/* Main Content */}
        <div className="space-y-6">
          {currentNote ? (
            <StudyResults 
              isVisible={true}
              onReset={handleReset}
              noteData={currentNote}
            />
          ) : (
            <Tabs defaultValue="my-notes" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="my-notes" className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  My Notes
                </TabsTrigger>
                <TabsTrigger value="shared-notes" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Shared Notes
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="my-notes" className="space-y-4">
                <NotesList onViewNote={handleViewNote} notesType="regular" />
              </TabsContent>
              
              <TabsContent value="shared-notes" className="space-y-4">
                <NotesList onViewNote={handleViewNote} notesType="shared" />
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Footer */}
        <footer className="text-center pt-8 border-t border-primary">
          <div className="flex items-center justify-center gap-2 mb-2">
            <FileText className="w-4 h-4 text-secondary" />
            <span className="font-retro text-sm text-muted-foreground">
              Your Personal Study Library
            </span>
            <Sparkles className="w-4 h-4 text-accent" />
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Notes;