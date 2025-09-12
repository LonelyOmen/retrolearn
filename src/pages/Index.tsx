import { useState, useEffect } from "react";
import { NotesInput } from "@/components/NotesInput";
import { AIProcessor } from "@/components/AIProcessor";
import { StudyResults } from "@/components/StudyResults";
import { NotesList } from "@/components/NotesList";
import { AuthModal } from "@/components/AuthModal";
import { useAuth } from "@/hooks/useAuth";
import { useNotes } from "@/hooks/useNotes";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import mascotImage from "@/assets/retro-wizard-mascot.jpg";
import { Sparkles, Zap, Brain, User, LogOut, FileText, Wand2, Mail, Calendar, Hash } from "lucide-react";

const Index = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [currentNote, setCurrentNote] = useState<any>(null);
  const [enhanceWithInternet, setEnhanceWithInternet] = useState(true);
  const [activeTab, setActiveTab] = useState("transform");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const { user, signOut, loading } = useAuth();
  const { createNote } = useNotes();
  const { toast } = useToast();

  const handleProcessNotes = async (notes: string) => {
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
          enhanceWithInternet: enhanceWithInternet
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

  const handleViewNote = (note: any) => {
    setCurrentNote(note);
    setActiveTab("transform");
  };

  // Fetch user profile and stats
  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchUserStats();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    
    setUserProfile(data);
  };

  const fetchUserStats = async () => {
    if (!user) return;

    const [notesResult, sessionsResult] = await Promise.all([
      supabase
        .from('notes')
        .select('id, created_at')
        .eq('user_id', user.id),
      supabase
        .from('study_sessions')
        .select('id, created_at')
        .eq('user_id', user.id)
    ]);

    setUserStats({
      totalNotes: notesResult.data?.length || 0,
      totalSessions: sessionsResult.data?.length || 0,
      joinedDate: user.created_at
    });
  };

  const getUserDisplayName = () => {
    if (userProfile?.full_name) {
      return userProfile.full_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'User';
  };

  return (
    <div className="min-h-screen bg-gradient-terminal p-4 scanlines">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center py-8 relative">
          {/* Auth Section */}
          <div className="absolute top-0 right-0">
            {user ? (
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" className="font-retro text-sm text-muted-foreground hover:text-primary p-0 h-auto">
                      <User className="w-4 h-4 mr-1" />
                      {getUserDisplayName()}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 p-0 border-2 border-primary bg-card" align="end">
                    <Card className="border-0">
                      <CardHeader className="pb-3">
                        <CardTitle className="font-retro glow-text flex items-center gap-2">
                          <User className="w-5 h-5" />
                          User Profile
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm">
                            <User className="w-4 h-4 text-primary" />
                            <span className="font-retro">{getUserDisplayName()}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="w-4 h-4 text-secondary" />
                            <span className="font-retro text-muted-foreground">{user.email}</span>
                          </div>
                          {userStats && (
                            <>
                              <div className="flex items-center gap-2 text-sm">
                                <Hash className="w-4 h-4 text-accent" />
                                <span className="font-retro text-muted-foreground">
                                  {userStats.totalNotes} notes created
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <FileText className="w-4 h-4 text-accent" />
                                <span className="font-retro text-muted-foreground">
                                  {userStats.totalSessions} study sessions
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="w-4 h-4 text-primary" />
                                <span className="font-retro text-muted-foreground">
                                  Joined {new Date(userStats.joinedDate).toLocaleDateString()}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="secondary" className="font-retro text-xs">
                            {userStats?.totalNotes > 10 ? 'Power User' : 'Getting Started'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </PopoverContent>
                </Popover>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="font-retro"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  LOGOUT
                </Button>
              </div>
            ) : (
              <Button
                variant="neon"
                size="sm"
                onClick={() => setShowAuthModal(true)}
                className="font-retro"
                disabled={loading}
              >
                <User className="w-4 h-4 mr-1" />
                LOGIN
              </Button>
            )}
          </div>
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
          {!user ? (
            <div className="text-center py-12 bg-card border-2 border-primary scanlines">
              <User className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-retro font-bold glow-text mb-2">
                ACCESS REQUIRED
              </h2>
              <p className="font-retro text-muted-foreground mb-6 max-w-md mx-auto">
                Sign in to transform your notes into study materials and track your progress
              </p>
              <Button
                variant="neon"
                onClick={() => setShowAuthModal(true)}
                className="font-retro"
                disabled={loading}
              >
                <User className="w-4 h-4 mr-2" />
                SIGN IN TO CONTINUE
              </Button>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-card border-2 border-secondary font-retro">
                <TabsTrigger value="transform" className="font-retro">
                  <Wand2 className="w-4 h-4 mr-2" />
                  TRANSFORM NOTES
                </TabsTrigger>
                <TabsTrigger value="notes" className="font-retro">
                  <FileText className="w-4 h-4 mr-2" />
                  MY NOTES
                </TabsTrigger>
              </TabsList>

              <TabsContent value="transform" className="mt-6 space-y-6">
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
              </TabsContent>

              <TabsContent value="notes" className="mt-6">
                <NotesList onViewNote={handleViewNote} />
              </TabsContent>
            </Tabs>
          )}
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

        {/* Auth Modal */}
        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </div>
    </div>
  );
};

export default Index;