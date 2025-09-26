import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import mascotImage from '@/assets/retro-wizard-mascot.jpg';
import { Sparkles, Brain, FileText, Users, Wand2, User, LogOut, Mail, Calendar, Hash, ArrowRight, Zap, Trophy, Search } from 'lucide-react';
import { AuthModal } from '@/components/AuthModal';
export default function Home() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userStats, setUserStats] = useState<any>(null);
  const {
    user,
    signOut,
    loading
  } = useAuth();
  const {
    toast
  } = useToast();
  const navigate = useNavigate();

  // Fetch user profile and stats
  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchUserStats();
    }
  }, [user]);
  const fetchUserProfile = async () => {
    if (!user) return;
    const {
      data
    } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setUserProfile(data);
  };
  const fetchUserStats = async () => {
    if (!user) return;
    const [notesResult, sessionsResult] = await Promise.all([supabase.from('notes').select('id, created_at').eq('user_id', user.id), supabase.from('study_sessions').select('id, created_at').eq('user_id', user.id)]);
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
  return <div className="min-h-screen bg-gradient-terminal p-4 scanlines">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="text-center py-8 relative">
          {/* Auth Section */}
          <div className="absolute top-0 right-0">
            {user ? <div className="flex items-center gap-2">
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
                          {userStats && <>
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
                            </>}
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
                <Button variant="ghost" size="sm" onClick={signOut} className="font-retro">
                  <LogOut className="w-4 h-4 mr-1" />
                  LOGOUT
                </Button>
              </div> : <Button variant="neon" size="sm" onClick={() => setShowAuthModal(true)} className="font-retro" disabled={loading}>
                <User className="w-4 h-4 mr-1" />
                LOGIN
              </Button>}
          </div>

          {/* Main Header */}
          <div className="flex items-center justify-center gap-6 mb-6">
            <div className="relative">
              <img src={mascotImage} alt="Retro Learn Mascot" className="w-24 h-24 rounded-full border-4 border-primary shadow-neon" />
              <div className="absolute -top-2 -right-2">
                <Sparkles className="w-8 h-8 text-accent animate-pulse" />
              </div>
            </div>
            <div>
              <h1 className="text-4xl md:text-6xl font-retro font-bold glow-text mb-2">
                RETRO LEARN
              </h1>
              <div className="flex items-center justify-center gap-4 text-lg font-retro text-secondary">
                <Brain className="w-5 h-5" />
                <span>LEARN</span>
                <Zap className="w-5 h-5 text-accent" />
                <span className="glow-pink">STUDY</span>
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="glow-blue">SUCCEED</span>
              </div>
            </div>
          </div>
          
          <p className="text-lg font-retro text-muted-foreground max-w-2xl mx-auto">
            Your ultimate retro-styled learning platform with AI-powered note transformation and collaborative study rooms
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

        {/* Feature Cards */}
        {!user ? <div className="text-center py-12 bg-card border-2 border-primary scanlines">
            <User className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-retro font-bold glow-text mb-2">
              ACCESS REQUIRED
            </h2>
            <p className="font-retro text-muted-foreground mb-6 max-w-md mx-auto">
              Sign in to access all Retro Learn features and start your learning journey
            </p>
            <Button variant="neon" onClick={() => setShowAuthModal(true)} className="font-retro" disabled={loading}>
              <User className="w-4 h-4 mr-2" />
              SIGN IN TO CONTINUE
            </Button>
          </div> : <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
            {/* Retro Note Wizard */}
            <Card className="group hover:shadow-neon transition-all duration-300 border-2 border-primary bg-card scanlines">
              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Wand2 className="w-8 h-8 text-primary group-hover:scale-110 transition-transform" />
                </div>
                <CardTitle className="font-retro text-xl glow-text group-hover:glow-pink transition-all">NOTE WIZARD</CardTitle>
                <CardDescription className="font-retro text-muted-foreground">
                  Transform your messy notes into organized study materials with AI magic
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center mx-px px-0">
                <Button variant="outline" onClick={e => {
              e.stopPropagation();
              navigate('/note-wizard');
            }} className="font-retro group-hover:bg-primary/20 transition-colors my-0 py-0 mx-0 px-0 w-full">
                  <Sparkles className="w-4 h-4 mr-2" />
                  START TRANSFORMING
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>

            {/* My Notes */}
            <Card className="group hover:shadow-neon transition-all duration-300 border-2 border-secondary bg-card scanlines">
              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-secondary/10 group-hover:bg-secondary/20 transition-colors">
                  <FileText className="w-8 h-8 text-secondary group-hover:scale-110 transition-transform" />
                </div>
                <CardTitle className="font-retro text-xl glow-text group-hover:glow-blue transition-all">
                  MY NOTES
                </CardTitle>
                <CardDescription className="font-retro text-muted-foreground">
                  Browse, search, and manage all your transformed notes and study materials
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button className="font-retro group-hover:bg-secondary/20 transition-colors w-full" variant="outline" onClick={e => {
              e.stopPropagation();
              navigate('/notes');
            }}>
                  <FileText className="w-4 h-4 mr-2" />
                  VIEW NOTES
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>

            {/* Work Rooms */}
            <Card className="group hover:shadow-neon transition-all duration-300 border-2 border-accent bg-card scanlines">
              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-accent/10 group-hover:bg-accent/20 transition-colors">
                  <Users className="w-8 h-8 text-accent group-hover:scale-110 transition-transform" />
                </div>
                <CardTitle className="font-retro text-xl glow-text group-hover:glow-pink transition-all">
                  WORK ROOMS
                </CardTitle>
                <CardDescription className="font-retro text-muted-foreground">
                  Collaborate with others, share notes, and study together in real-time
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button className="font-retro group-hover:bg-accent/20 transition-colors w-full" variant="outline" onClick={e => {
              e.stopPropagation();
              navigate('/workrooms');
            }}>
                  <Users className="w-4 h-4 mr-2" />
                  JOIN ROOMS
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>

            {/* Quizzes */}
            <Card className="group hover:shadow-neon transition-all duration-300 border-2 border-warning bg-card scanlines">
              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-warning/10 group-hover:bg-warning/20 transition-colors">
                  <Trophy className="w-8 h-8 text-warning group-hover:scale-110 transition-transform" />
                </div>
                <CardTitle className="font-retro text-xl glow-text group-hover:glow-blue transition-all">
                  QUIZZES
                </CardTitle>
                <CardDescription className="font-retro text-muted-foreground">
                  Test your knowledge with AI-generated multiple choice quizzes
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button className="font-retro group-hover:bg-warning/20 transition-colors w-full" variant="outline" onClick={e => {
              e.stopPropagation();
              navigate('/quizzes');
            }}>
                  <Trophy className="w-4 h-4 mr-2" />
                  START QUIZ
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>

            {/* Learn Anything */}
            <Card className="group hover:shadow-neon transition-all duration-300 border-2 border-destructive bg-card scanlines">
              <CardHeader className="text-center pb-4">
                <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 group-hover:bg-destructive/20 transition-colors">
                  <Search className="w-8 h-8 text-destructive group-hover:scale-110 transition-transform" />
                </div>
                <CardTitle className="font-retro text-xl glow-text group-hover:glow-pink transition-all">
                  LEARN ANYTHING
                </CardTitle>
                <CardDescription className="font-retro text-muted-foreground">
                  Discover comprehensive information about any topic from across the internet
                </CardDescription>
              </CardHeader>
              <CardContent className="text-center">
                <Button className="font-retro group-hover:bg-destructive/20 transition-colors w-full" variant="outline" onClick={e => {
              e.stopPropagation();
              navigate('/learn');
            }}>
                  <Search className="w-4 h-4 mr-2" />
                  EXPLORE TOPICS
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          </div>}

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
            Ready to make learning retroactively awesome
          </div>
        </footer>

        {/* Auth Modal */}
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      </div>
    </div>;
}