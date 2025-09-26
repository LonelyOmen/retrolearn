import { useState } from "react";
import { Search, ExternalLink, Book } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface WikipediaSearchResult {
  pageid: number;
  title: string;
  snippet: string;
  size: number;
  wordcount: number;
}

interface WikipediaSummary {
  title: string;
  extract: string;
  thumbnail?: {
    source: string;
  };
  content_urls?: {
    desktop?: {
      page: string;
    };
  };
}

export const WikipediaSearch = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<WikipediaSearchResult[]>([]);
  const [selectedSummary, setSelectedSummary] = useState<WikipediaSummary | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const { toast } = useToast();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setIsSearching(true);
    setSelectedSummary(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('wikipedia-search', {
        body: { action: 'search', query: searchTerm }
      });

      if (error) {
        throw error;
      }

      if (data?.query?.search) {
        setSearchResults(data.query.search);
      } else {
        setSearchResults([]);
        toast({
          title: "No results found",
          description: "Try a different search term.",
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search failed",
        description: "Unable to search Wikipedia. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const fetchSummary = async (title: string) => {
    setIsLoadingSummary(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('wikipedia-search', {
        body: { action: 'summary', title }
      });

      if (error) {
        throw error;
      }

      setSelectedSummary(data);
    } catch (error) {
      console.error('Summary error:', error);
      toast({
        title: "Failed to load summary",
        description: "Unable to fetch article summary. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const stripHtmlTags = (html: string) => {
    return html.replace(/<[^>]*>/g, '');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Book className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Wikipedia Search</h1>
        </div>
        <p className="text-muted-foreground">
          Search and explore Wikipedia articles
        </p>
      </div>

      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          placeholder="Search Wikipedia..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={isSearching}>
          <Search className="h-4 w-4" />
        </Button>
      </form>

      {isSearching && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {searchResults.length > 0 && !isSearching && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Search Results</h2>
          <div className="grid gap-4">
            {searchResults.map((result) => (
              <Card key={result.pageid} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardHeader onClick={() => fetchSummary(result.title)}>
                  <CardTitle className="text-lg">{result.title}</CardTitle>
                  <CardDescription>
                    {stripHtmlTags(result.snippet)}...
                  </CardDescription>
                  <div className="text-sm text-muted-foreground">
                    {result.wordcount} words
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      )}

      {isLoadingSummary && (
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-2/3" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </CardContent>
        </Card>
      )}

      {selectedSummary && !isLoadingSummary && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              {selectedSummary.title}
              {selectedSummary.content_urls?.desktop?.page && (
                <Button variant="ghost" size="sm" asChild>
                  <a 
                    href={selectedSummary.content_urls.desktop.page} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-6">
              {selectedSummary.thumbnail && (
                <div className="flex-shrink-0">
                  <img
                    src={selectedSummary.thumbnail.source}
                    alt={selectedSummary.title}
                    className="w-32 h-32 object-cover rounded-lg"
                  />
                </div>
              )}
              <div className="flex-1">
                <p className="text-muted-foreground leading-relaxed">
                  {selectedSummary.extract}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};