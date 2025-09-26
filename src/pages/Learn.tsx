import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Search, Loader2, ExternalLink, Users, Video, Image, Sparkles, Play, X, Plus, Trash2, Check, BookOpen, Save, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface LearnResult {
  overview: string;
  videos: Array<{
    title: string;
    url: string;
    description: string;
  }>;
  tips: string[];
  learningSteps: Array<{
    id: string;
    title: string;
    description: string;
    completed: boolean;
  }>;
  images: Array<{
    title: string;
    url: string;
    description: string;
  }>;
  communities: Array<{
    name: string;
    url: string;
    platform: string;
    description: string;
  }>;
  wikipediaArticles: Array<{
    title: string;
    url: string;
    description: string;
    thumbnail?: string | null;
  }>;
}

interface SavedLearningProgress {
  id: string;
  topic: string;
  progress_percentage: number;
  learning_steps: any; // Using any for Json type from database
  total_steps: number;
  completed_steps: number;
  is_completed: boolean;
  overview?: string;
  tips?: any; // Using any for Json type from database
  created_at: string;
  updated_at: string;
}

const popularTopics = [
  "Machine Learning",
  "Astrophysics", 
  "Digital Photography",
  "Quantum Computing",
  "Guitar Playing",
  "Space Exploration",
  "Cybersecurity",
  "3D Animation"
];

const Learn = () => {
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<LearnResult | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<{ title: string; url: string; } | null>(null);
  const [learningSteps, setLearningSteps] = useState<LearnResult['learningSteps']>([]);
  const [newStepTitle, setNewStepTitle] = useState("");
  const [showCongratulations, setShowCongratulations] = useState(false);
  const [savedLearningProgress, setSavedLearningProgress] = useState<SavedLearningProgress[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url: string) => {
    const regex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  };

  // Get YouTube thumbnail URL
  const getYouTubeThumbnail = (url: string) => {
    const videoId = getYouTubeVideoId(url);
    return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
  };

  // Get YouTube embed URL
  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = getYouTubeVideoId(url);
    return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1` : null;
  };

  const handleSearch = async (e?: React.FormEvent, searchTopic?: string) => {
    if (e) e.preventDefault();
    const searchQuery = searchTopic || topic.trim();
    if (!searchQuery) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('explore-topic', {
        body: { topic: searchQuery }
      });

      if (error) throw error;

      setResult(data);
      setLearningSteps(data.learningSteps || []);
      if (!searchTopic) {
        setTopic(searchQuery);
      }
      toast({
        title: "Topic explored successfully!",
        description: `Found comprehensive information about "${searchQuery}"`,
      });
    } catch (error) {
      console.error('Error exploring topic:', error);
      toast({
        title: "Error",
        description: "Failed to explore the topic. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePopularTopicClick = (popularTopic: string) => {
    setTopic(popularTopic);
    handleSearch(undefined, popularTopic);
  };

  const resetSearch = () => {
    setResult(null);
    setTopic("");
    setLearningSteps([]);
    setShowCongratulations(false);
  };

  const toggleStepComplete = (stepId: string) => {
    const updatedSteps = learningSteps.map(step => 
      step.id === stepId ? { ...step, completed: !step.completed } : step
    );
    setLearningSteps(updatedSteps);
    
    // Check if all steps are completed
    const completedSteps = updatedSteps.filter(step => step.completed).length;
    if (completedSteps === updatedSteps.length && updatedSteps.length > 0 && !showCongratulations) {
      setShowCongratulations(true);
      toast({
        title: "🎉 Congratulations!",
        description: `You've completed your learning journey for "${topic}"! Keep exploring new topics!`,
      });
    }
    
    // Auto-save progress after step completion change
    setTimeout(() => autoSaveProgress(), 500);
  };

  const addStep = () => {
    if (!newStepTitle.trim()) return;
    
    const newStep = {
      id: `step-${Date.now()}`,
      title: newStepTitle.trim(),
      description: "Custom learning step",
      completed: false
    };
    
    setLearningSteps([...learningSteps, newStep]);
    setNewStepTitle("");
    
    // Auto-save progress after adding step
    setTimeout(() => autoSaveProgress(), 500);
  };

  const removeStep = (stepId: string) => {
    setLearningSteps(learningSteps.filter(step => step.id !== stepId));
    
    // Auto-save progress after removing step
    setTimeout(() => autoSaveProgress(), 500);
  };

  const progressPercentage = learningSteps.length > 0 
    ? (learningSteps.filter(step => step.completed).length / learningSteps.length) * 100 
    : 0;

  // Load saved learning progress
  const loadSavedProgress = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('learning_progress')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSavedLearningProgress(data || []);
    } catch (error) {
      console.error('Error loading saved progress:', error);
    }
  };

  // Auto-save current learning progress
  const autoSaveProgress = async () => {
    if (!user || !result || !topic.trim()) return;
    
    try {
      const completedSteps = learningSteps.filter(step => step.completed).length;
      const progressPercent = learningSteps.length > 0 ? Math.round((completedSteps / learningSteps.length) * 100) : 0;
      const isCompleted = progressPercent === 100;

      // Check if this topic already exists for the user
      const { data: existingProgress } = await supabase
        .from('learning_progress')
        .select('id')
        .eq('user_id', user.id)
        .eq('topic', topic)
        .single();

      if (existingProgress) {
        // Update existing progress
        const { error } = await supabase
          .from('learning_progress')
          .update({
            progress_percentage: progressPercent,
            learning_steps: learningSteps,
            total_steps: learningSteps.length,
            completed_steps: completedSteps,
            is_completed: isCompleted,
            overview: result.overview,
            tips: result.tips,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProgress.id);

        if (error) throw error;
      } else {
        // Create new progress entry
        const { error } = await supabase
          .from('learning_progress')
          .insert({
            user_id: user.id,
            topic: topic,
            progress_percentage: progressPercent,
            learning_steps: learningSteps,
            total_steps: learningSteps.length,
            completed_steps: completedSteps,
            is_completed: isCompleted,
            overview: result.overview,
            tips: result.tips
          });

        if (error) throw error;
      }

      await loadSavedProgress();
    } catch (error) {
      console.error('Error auto-saving progress:', error);
    }
  };

  // Delete saved learning progress
  const deleteSavedProgress = async (progressId: string, topicName: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('learning_progress')
        .delete()
        .eq('id', progressId)
        .eq('user_id', user.id);

      if (error) throw error;

      setSavedLearningProgress(prev => prev.filter(p => p.id !== progressId));
      toast({
        title: "Progress deleted",
        description: `Removed "${topicName}" from your learning list.`,
      });
    } catch (error) {
      console.error('Error deleting progress:', error);
      toast({
        title: "Error",
        description: "Failed to delete progress. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Continue learning from saved progress
  const continueFromSaved = (savedProgress: SavedLearningProgress) => {
    setTopic(savedProgress.topic);
    setLearningSteps(savedProgress.learning_steps);
    
    // Create result object from saved data
    const restoredResult: LearnResult = {
      overview: savedProgress.overview || `Continue learning about ${savedProgress.topic}`,
      tips: Array.isArray(savedProgress.tips) ? savedProgress.tips : [],
      learningSteps: savedProgress.learning_steps,
      videos: [],
      images: [],
      communities: [],
      wikipediaArticles: []
    };
    
    setResult(restoredResult);
    setShowCongratulations(savedProgress.is_completed);
  };

  // Load saved progress on component mount
  useEffect(() => {
    if (user) {
      loadSavedProgress();
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Back button - positioned absolutely */}
      <div className="absolute top-6 left-6 z-10 flex items-center gap-2">
        <Link to="/" onClick={autoSaveProgress}>
          <Button variant="outline" size="sm" className="gap-2 animate-fade-in">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
        {result && user && (
          <Button
            onClick={autoSaveProgress}
            variant="outline"
            size="sm"
            className="gap-2 animate-fade-in"
            title="Save current progress"
          >
            <Save className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Main Content */}
      <div className="min-h-screen flex flex-col">
        {!result ? (
          // Initial Search State - Centered Layout
          <div className="flex-1 flex items-center justify-center px-4 py-20">
            <div className="w-full max-w-4xl mx-auto text-center space-y-12 animate-fade-in">
              {/* Central Icon */}
              <div className="flex justify-center mb-8">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-r from-primary/20 to-secondary/20 flex items-center justify-center animate-pulse">
                    <Sparkles className="w-12 h-12 text-primary glow-text" />
                  </div>
                  <div className="absolute inset-0 w-24 h-24 rounded-full bg-gradient-to-r from-primary/10 to-secondary/10 animate-ping"></div>
                </div>
              </div>

              {/* Main Heading */}
              <div className="space-y-4">
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold glow-text leading-tight">
                  What would you like to learn?
                </h1>
                <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
                  Enter any topic and discover insights, videos, and community resources
                </p>
              </div>

              {/* Search Form */}
              <div className="max-w-3xl mx-auto space-y-6">
                <form onSubmit={handleSearch} className="space-y-6">
                  <div className="relative">
                    <Input
                      placeholder="Enter a topic you want to learn..."
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="text-xl py-8 px-6 rounded-2xl border-primary/30 bg-background/50 backdrop-blur-sm text-center placeholder:text-muted-foreground/70"
                      disabled={isLoading}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full max-w-md mx-auto btn-glow py-8 text-xl rounded-2xl bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 transition-all duration-300 transform hover:scale-105"
                    disabled={isLoading || !topic.trim()}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-3 h-6 w-6 animate-spin" />
                        Exploring...
                      </>
                    ) : (
                      <>
                        Start Learning <Sparkles className="ml-3 h-6 w-6" />
                      </>
                    )}
                  </Button>
                </form>
              </div>

              {/* Popular Topics */}
              <div className="space-y-6">
                <h3 className="text-2xl font-semibold text-muted-foreground">Popular cosmic topics:</h3>
                <div className="flex flex-wrap justify-center gap-3 max-w-4xl mx-auto">
                  {popularTopics.map((popularTopic, index) => (
                    <Button
                      key={popularTopic}
                      variant="outline"
                      className="rounded-full px-6 py-3 text-lg hover:bg-primary/10 hover:border-primary/50 transition-all duration-300 transform hover:scale-105 animate-fade-in"
                      style={{ animationDelay: `${index * 100}ms` }}
                      onClick={() => handlePopularTopicClick(popularTopic)}
                      disabled={isLoading}
                    >
                      {popularTopic}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Finish Learning About Section */}
              {user && savedLearningProgress.length > 0 && (
                <div className="space-y-6 mt-16">
                  <div className="text-center">
                    <h3 className="text-2xl font-semibold text-muted-foreground mb-2">Finish Learning About...</h3>
                    <p className="text-lg text-muted-foreground/80">Continue your learning journey</p>
                  </div>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
                    {savedLearningProgress.map((progress, index) => (
                      <Card 
                        key={progress.id} 
                        className="border-primary/20 bg-background/50 backdrop-blur-sm hover:bg-background/70 transition-all duration-300 animate-fade-in"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg font-semibold text-foreground flex items-center gap-2">
                              <BookOpen className="h-5 w-5 text-primary" />
                              {progress.topic}
                            </CardTitle>
                            {progress.is_completed && (
                              <CheckCircle className="h-6 w-6 text-green-500" />
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm text-muted-foreground">
                              <span>{progress.completed_steps} / {progress.total_steps} steps</span>
                              <span className={progress.is_completed ? "text-green-500 font-semibold" : ""}>
                                {progress.progress_percentage}%
                              </span>
                            </div>
                            <Progress 
                              value={progress.progress_percentage} 
                              className={progress.is_completed ? "h-2 progress-completed" : "h-2"}
                            />
                            {progress.is_completed && (
                              <div className="flex items-center gap-1 text-green-500 text-sm font-medium">
                                <Check className="h-4 w-4" />
                                Completed!
                              </div>
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              onClick={() => continueFromSaved(progress)}
                              className="flex-1 gap-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                              variant="outline"
                            >
                              <Play className="h-4 w-4" />
                              {progress.is_completed ? "Review" : "Continue"}
                            </Button>
                            <Button
                              onClick={() => deleteSavedProgress(progress.id, progress.topic)}
                              variant="outline"
                              size="icon"
                              className="border-destructive/20 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Results State - Full Layout
          <div className="flex-1 px-4 py-8 pt-20"> {/* Added pt-20 to account for back button */}
            <div className="container mx-auto max-w-7xl">
              {/* Header with new search option */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <h2 className="text-3xl font-bold glow-text ml-0 sm:ml-2">Exploring: {topic}</h2> {/* Added margin for mobile spacing */}
                <Button onClick={resetSearch} variant="outline" className="gap-2">
                  <Search className="h-4 w-4" />
                  New Search
                </Button>
              </div>

              <div className="grid lg:grid-cols-3 gap-8">
                {/* Left Column - Overview and Tips */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Overview */}
                  <Card className="border-primary/20 animate-fade-in bg-background/50 backdrop-blur-sm">
                    <CardHeader className="pb-4">
                      <CardTitle className="glow-text text-2xl flex items-center gap-3">
                        <div className="w-6 h-6 border-2 border-primary rounded flex items-center justify-center">
                          <div className="w-2 h-2 bg-primary rounded"></div>
                        </div>
                        Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <p className="text-foreground/90 leading-relaxed text-lg">
                        {result.overview}
                      </p>
                      
                      {/* Key Learning Points */}
                      <div>
                        <h3 className="text-xl font-semibold mb-4 text-foreground">Key Learning Points:</h3>
                        <ul className="space-y-3">
                          {result.tips.slice(0, 3).map((tip, index) => (
                            <li key={index} className="flex items-start gap-3">
                              <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                              <span className="text-foreground/90 text-base leading-relaxed">{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Learning Progress */}
                  <Card className="border-primary/20 animate-fade-in bg-background/50 backdrop-blur-sm" style={{ animationDelay: "200ms" }}>
                    <CardHeader className="pb-4">
                      <CardTitle className="glow-text text-2xl flex items-center gap-3">
                        <div className="w-6 h-6 text-primary">📈</div>
                        Learning Progress
                        {showCongratulations && <div className="text-lg">🎉</div>}
                      </CardTitle>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>Progress: {learningSteps.filter(step => step.completed).length} / {learningSteps.length} steps</span>
                          <span>{Math.round(progressPercentage)}%</span>
                        </div>
                        <Progress value={progressPercentage} className="h-3" />
                        {showCongratulations && (
                          <div className="text-center py-4 space-y-2">
                            <div className="text-2xl">🌟</div>
                            <p className="text-primary font-semibold">Congratulations on completing your learning journey!</p>
                            <p className="text-sm text-muted-foreground">You've mastered the fundamentals of {topic}</p>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Learning Steps */}
                      <div className="space-y-3">
                        {learningSteps.map((step, index) => (
                          <div key={step.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/20 transition-colors">
                            <button
                              onClick={() => toggleStepComplete(step.id)}
                              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                                step.completed 
                                  ? 'bg-primary border-primary text-primary-foreground' 
                                  : 'border-muted-foreground hover:border-primary'
                              }`}
                            >
                              {step.completed && <Check className="w-3 h-3" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <h4 className={`font-medium text-sm mb-1 ${step.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                                {step.title}
                              </h4>
                              <p className={`text-xs leading-relaxed ${step.completed ? 'text-muted-foreground/70' : 'text-muted-foreground'}`}>
                                {step.description}
                              </p>
                            </div>
                            <button
                              onClick={() => removeStep(step.id)}
                              className="text-muted-foreground hover:text-destructive transition-colors p-1"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Add New Step */}
                      <div className="flex gap-2 pt-4 border-t border-border/50">
                        <Input
                          placeholder="Add a learning step..."
                          value={newStepTitle}
                          onChange={(e) => setNewStepTitle(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && addStep()}
                          className="text-sm"
                        />
                        <Button onClick={addStep} size="sm" variant="outline" className="gap-1">
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Videos and Wikipedia */}
                <div className="space-y-6">
                  {/* Wikipedia Resources */}
                  <Card className="border-primary/20 animate-fade-in bg-background/50 backdrop-blur-sm" style={{ animationDelay: "300ms" }}>
                    <CardHeader className="pb-4">
                      <CardTitle className="glow-text text-xl flex items-center gap-3">
                        <BookOpen className="h-5 w-5" />
                        Wikipedia Resources
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {result.wikipediaArticles?.map((article, index) => (
                          <div key={index} className="border border-border/30 rounded-lg p-4 hover:bg-muted/10 transition-colors">
                            <div className="flex justify-between items-start gap-3">
                              <div className="flex-1">
                                <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                                  {article.title}
                                  <ExternalLink className="h-3 w-3 text-muted-foreground" />
                                </h4>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {article.description}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3">
                              <a 
                                href={article.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
                              >
                                Read full article →
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-primary/20 animate-fade-in bg-background/50 backdrop-blur-sm" style={{ animationDelay: "400ms" }}>
                    <CardHeader className="pb-4">
                      <CardTitle className="glow-text text-xl flex items-center gap-3">
                        <Video className="h-5 w-5" />
                        Recommended Videos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {result.videos.map((video, index) => {
                          const thumbnail = getYouTubeThumbnail(video.url);
                          const videoId = getYouTubeVideoId(video.url);
                          
                          return (
                            <div 
                              key={index}
                              onClick={() => setSelectedVideo(video)}
                              className="block group cursor-pointer"
                            >
                              <div className="flex gap-3 p-3 rounded-lg hover:bg-muted/20 transition-colors">
                                <div className="relative w-20 h-14 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:from-primary/30 group-hover:to-secondary/30 transition-colors overflow-hidden">
                                  {thumbnail && videoId ? (
                                    <>
                                      <img 
                                        src={thumbnail} 
                                        alt={video.title}
                                        className="w-full h-full object-cover rounded-lg"
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                        }}
                                      />
                                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                                        <Play className="w-4 h-4 text-white drop-shadow-lg" />
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <Video className="w-6 h-6 text-primary" />
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <Play className="w-4 h-4 text-primary/70" />
                                      </div>
                                    </>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-foreground text-sm leading-tight mb-1 line-clamp-2 group-hover:text-primary transition-colors">
                                    {video.title}
                                  </h4>
                                  <p className="text-xs text-muted-foreground mb-1">
                                    {video.description.split(' ').slice(0, 3).join(' ')}...
                                  </p>
                                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Educational Content</span>
                                    <span className="bg-primary/20 px-2 py-1 rounded text-primary font-mono">
                                      {Math.floor(Math.random() * 15) + 5}:{String(Math.floor(Math.random() * 60)).padStart(2, '0')}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Additional Resources */}
                  <Card className="border-primary/20 animate-fade-in bg-background/50 backdrop-blur-sm" style={{ animationDelay: "600ms" }}>
                    <CardHeader className="pb-4">
                      <CardTitle className="glow-text text-lg flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Communities
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {result.communities.slice(0, 3).map((community, index) => (
                          <a 
                            key={index}
                            href={community.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block group"
                          >
                            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/20 transition-colors">
                              <Badge variant="secondary" className="text-xs">
                                {community.platform}
                              </Badge>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">
                                  {community.name}
                                </p>
                              </div>
                              <ExternalLink className="h-3 w-3 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                          </a>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Video Player Modal */}
        <Dialog open={!!selectedVideo} onOpenChange={() => setSelectedVideo(null)}>
          <DialogContent className="max-w-4xl w-full p-0 bg-background border-primary/20">
            <DialogHeader className="p-6 pb-0">
              <div className="flex items-center justify-between">
                <DialogTitle className="text-xl font-semibold text-foreground pr-8">
                  {selectedVideo?.title}
                </DialogTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedVideo(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>
            <div className="px-6 pb-6">
              {selectedVideo && getYouTubeEmbedUrl(selectedVideo.url) && (
                <div className="aspect-video w-full rounded-lg overflow-hidden bg-black">
                  <iframe
                    src={getYouTubeEmbedUrl(selectedVideo.url) || ''}
                    title={selectedVideo.title}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}
              {selectedVideo && !getYouTubeEmbedUrl(selectedVideo.url) && (
                <div className="aspect-video w-full rounded-lg bg-muted/20 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <Video className="h-12 w-12 text-muted-foreground mx-auto" />
                    <div>
                      <p className="text-foreground font-medium">Video not available for embedding</p>
                      <p className="text-muted-foreground text-sm">This video can only be watched on YouTube</p>
                      <Button
                        onClick={() => window.open(selectedVideo?.url, '_blank')}
                        className="mt-4"
                        variant="outline"
                      >
                        Watch on YouTube <ExternalLink className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Learn;