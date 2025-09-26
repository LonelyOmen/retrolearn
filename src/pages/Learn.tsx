import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Search, Loader2, ExternalLink, Users, Video, Image, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface LearnResult {
  overview: string;
  videos: Array<{
    title: string;
    url: string;
    description: string;
  }>;
  tips: string[];
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
  const { toast } = useToast();

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
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Back button - positioned absolutely */}
      <div className="absolute top-6 left-6 z-10">
        <Link to="/">
          <Button variant="outline" size="sm" className="gap-2 animate-fade-in">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
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
            </div>
          </div>
        ) : (
          // Results State - Full Layout
          <div className="flex-1 px-4 py-8">
            <div className="container mx-auto max-w-7xl">
              {/* Header with new search option */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <h2 className="text-3xl font-bold glow-text">Exploring: {topic}</h2>
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

                  {/* Learning Tips */}
                  <Card className="border-primary/20 animate-fade-in bg-background/50 backdrop-blur-sm" style={{ animationDelay: "200ms" }}>
                    <CardHeader className="pb-4">
                      <CardTitle className="glow-text text-2xl flex items-center gap-3">
                        <div className="w-6 h-6 text-primary">💡</div>
                        Learning Tips
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {result.tips.slice(3).map((tip, index) => (
                        <div key={index + 3} className="space-y-3">
                          <h4 className="text-lg font-semibold text-primary">
                            {tip.split(':')[0] || `Tip ${index + 4}`}
                          </h4>
                          <p className="text-foreground/80 leading-relaxed">
                            {tip.includes(':') ? tip.split(':').slice(1).join(':').trim() : tip}
                          </p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Videos */}
                <div className="space-y-6">
                  <Card className="border-primary/20 animate-fade-in bg-background/50 backdrop-blur-sm" style={{ animationDelay: "400ms" }}>
                    <CardHeader className="pb-4">
                      <CardTitle className="glow-text text-xl flex items-center gap-3">
                        <Video className="h-5 w-5" />
                        Recommended Videos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {result.videos.map((video, index) => (
                          <a 
                            key={index}
                            href={video.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="block group"
                          >
                            <div className="flex gap-3 p-3 rounded-lg hover:bg-muted/20 transition-colors">
                              <div className="w-20 h-14 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:from-primary/30 group-hover:to-secondary/30 transition-colors">
                                <Video className="w-6 h-6 text-primary" />
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
                          </a>
                        ))}
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
      </div>
    </div>
  );
};

export default Learn;