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
                  <Card className="border-primary/20 animate-fade-in">
                    <CardHeader>
                      <CardTitle className="glow-text text-2xl">Overview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap text-lg">
                        {result.overview}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Tips */}
                  <Card className="border-primary/20 animate-fade-in" style={{ animationDelay: "200ms" }}>
                    <CardHeader>
                      <CardTitle className="glow-text text-2xl">Tips for Beginners</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-4">
                        {result.tips.map((tip, index) => (
                          <li key={index} className="flex items-start gap-4">
                            <Badge variant="outline" className="mt-1 min-w-fit text-lg px-3 py-1">
                              {index + 1}
                            </Badge>
                            <span className="text-foreground/90 text-lg">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Videos and Images */}
                <div className="space-y-8">
                  {/* Videos */}
                  <Card className="border-primary/20 animate-fade-in" style={{ animationDelay: "400ms" }}>
                    <CardHeader>
                      <CardTitle className="glow-text flex items-center gap-2 text-xl">
                        <Video className="h-6 w-6" />
                        Related Videos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {result.videos.map((video, index) => (
                          <div key={index} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                            <h4 className="font-medium text-primary mb-2 text-lg">{video.title}</h4>
                            <p className="text-muted-foreground mb-3">{video.description}</p>
                            <a 
                              href={video.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                            >
                              Watch Video <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Images */}
                  <Card className="border-primary/20 animate-fade-in" style={{ animationDelay: "600ms" }}>
                    <CardHeader>
                      <CardTitle className="glow-text flex items-center gap-2 text-xl">
                        <Image className="h-6 w-6" />
                        Related Images
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {result.images.map((image, index) => (
                          <div key={index} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                            <h4 className="font-medium text-primary mb-2 text-lg">{image.title}</h4>
                            <p className="text-muted-foreground mb-3">{image.description}</p>
                            <a 
                              href={image.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                            >
                              View Image <ExternalLink className="h-4 w-4" />
                            </a>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Bottom Section - Community Support */}
              <Card className="border-primary/20 mt-8 animate-fade-in" style={{ animationDelay: "800ms" }}>
                <CardHeader>
                  <CardTitle className="glow-text flex items-center gap-2 text-2xl">
                    <Users className="h-6 w-6" />
                    Community & Support
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {result.communities.map((community, index) => (
                      <div key={index} className="border rounded-lg p-6 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                          <Badge variant="secondary" className="text-sm px-3 py-1">{community.platform}</Badge>
                          <h4 className="font-medium text-primary text-lg">{community.name}</h4>
                        </div>
                        <p className="text-muted-foreground mb-4">{community.description}</p>
                        <a 
                          href={community.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                        >
                          Join Community <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Learn;