import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Search, Loader2, ExternalLink, Users, Video, Image } from "lucide-react";
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

const Learn = () => {
  const [topic, setTopic] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<LearnResult | null>(null);
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('explore-topic', {
        body: { topic: topic.trim() }
      });

      if (error) throw error;

      setResult(data);
      toast({
        title: "Topic explored successfully!",
        description: `Found comprehensive information about "${topic}"`,
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

  const resetSearch = () => {
    setResult(null);
    setTopic("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link to="/">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-4xl font-bold glow-text mb-2">Learn Anything</h1>
            <p className="text-muted-foreground">
              Enter any topic and discover comprehensive information from across the internet
            </p>
          </div>
        </div>

        {/* Search Form */}
        {!result && (
          <Card className="max-w-2xl mx-auto mb-8 border-primary/20 bg-gradient-to-r from-card to-card/80">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl glow-text">What would you like to learn?</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="e.g., Machine Learning, Digital Photography, Cooking Techniques..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="pl-10 text-lg py-6"
                    disabled={isLoading}
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full btn-glow py-6 text-lg"
                  disabled={isLoading || !topic.trim()}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Exploring...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Explore Topic
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-6">
            {/* Header with new search option */}
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold glow-text">Exploring: {topic}</h2>
              <Button onClick={resetSearch} variant="outline" className="gap-2">
                <Search className="h-4 w-4" />
                New Search
              </Button>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Left Column - Overview and Tips */}
              <div className="lg:col-span-2 space-y-6">
                {/* Overview */}
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="glow-text">Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {result.overview}
                    </p>
                  </CardContent>
                </Card>

                {/* Tips */}
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="glow-text">Tips for Beginners</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {result.tips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <Badge variant="outline" className="mt-0.5 min-w-fit">
                            {index + 1}
                          </Badge>
                          <span className="text-foreground/90">{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Videos and Images */}
              <div className="space-y-6">
                {/* Videos */}
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="glow-text flex items-center gap-2">
                      <Video className="h-5 w-5" />
                      Related Videos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {result.videos.map((video, index) => (
                        <div key={index} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                          <h4 className="font-medium text-primary mb-1">{video.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{video.description}</p>
                          <a 
                            href={video.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            Watch Video <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Images */}
                <Card className="border-primary/20">
                  <CardHeader>
                    <CardTitle className="glow-text flex items-center gap-2">
                      <Image className="h-5 w-5" />
                      Related Images
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {result.images.map((image, index) => (
                        <div key={index} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                          <h4 className="font-medium text-primary mb-1">{image.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">{image.description}</p>
                          <a 
                            href={image.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                          >
                            View Image <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Bottom Section - Community Support */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="glow-text flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Community & Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {result.communities.map((community, index) => (
                    <div key={index} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary">{community.platform}</Badge>
                        <h4 className="font-medium text-primary">{community.name}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{community.description}</p>
                      <a 
                        href={community.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        Join Community <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Learn;