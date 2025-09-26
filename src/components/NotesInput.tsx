import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sparkles, FileText, Mic, Image, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

interface NotesInputProps {
  onProcessNotes: (notes: string) => void;
  isProcessing: boolean;
  enhanceWithInternet?: boolean;
  onToggleInternet?: (enabled: boolean) => void;
}

export const NotesInput = ({ 
  onProcessNotes, 
  isProcessing, 
  enhanceWithInternet = true, 
  onToggleInternet 
}: NotesInputProps) => {
  const [notes, setNotes] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSubmit = () => {
    if (notes.trim()) {
      onProcessNotes(notes);
    }
  };

  const demoNotes = `Meeting Notes - Project Alpha
- Need to improve user engagement metrics
- Consider implementing gamification elements
- Budget constraints: $50k max
- Timeline: 3 months
- Team concerns about technical feasibility
- Competitor analysis shows 30% better retention rates
- User feedback requests: dark mode, faster loading
- Marketing wants social features
- Legal review needed for data privacy
- Next meeting: Friday 2PM`;

  const loadDemo = () => {
    setNotes(demoNotes);
  };

  const handleImageScan = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    setIsExtracting(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;
        const base64Data = base64.split(',')[1]; // Remove data URL prefix
        
        try {
          const { data, error } = await supabase.functions.invoke('extract-text', {
            body: {
              image: base64Data,
              mimeType: file.type
            }
          });

          if (error) throw error;

          if (data?.success) {
            const extractedText = data.extractedText;
            if (extractedText && extractedText !== "No text detected in the image.") {
              setNotes(prev => prev ? `${prev}\n\n${extractedText}` : extractedText);
              toast({
                title: "Text extracted successfully",
                description: "The text from your image has been added to your notes.",
              });
            } else {
              toast({
                title: "No text found",
                description: "No readable text was detected in the image.",
                variant: "destructive",
              });
            }
          } else {
            throw new Error(data?.error || 'Failed to extract text');
          }
        } catch (error) {
          console.error('Error extracting text:', error);
          toast({
            title: "Extraction failed",
            description: "Failed to extract text from the image. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsExtracting(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "File processing failed",
        description: "Failed to process the image file.",
        variant: "destructive",
      });
      setIsExtracting(false);
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="p-6 bg-card border-2 border-primary scanlines">
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <FileText className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-retro glow-text">INPUT YOUR MESSY NOTES</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
          <Button variant="cyber" size="sm" className="text-xs">
            <FileText className="w-4 h-4" />
            TEXT INPUT
          </Button>
          <Button variant="terminal" size="sm" disabled className="text-xs opacity-50">
            <Mic className="w-4 h-4" />
            VOICE (SOON)
          </Button>
          <Button 
            variant="terminal" 
            size="sm" 
            onClick={handleImageScan}
            disabled={isProcessing || isExtracting}
            className="text-xs"
          >
            <Image className="w-4 h-4" />
            {isExtracting ? 'SCANNING...' : 'SCAN IMAGE'}
          </Button>
        </div>

        <div className="relative">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Paste your messy notes here... The more chaotic, the better! ✨"
            className="min-h-[200px] bg-muted border-2 border-secondary text-foreground font-retro resize-none focus:border-primary focus:shadow-blue transition-all"
            disabled={isProcessing}
          />
          {notes === "" && (
            <div className="absolute bottom-4 right-4">
              <span className="text-xs text-muted-foreground cursor-blink">Ready for input</span>
            </div>
          )}
        </div>

        {/* Internet Enhancement Toggle */}
        {onToggleInternet && (
          <div className="flex items-center justify-between p-3 bg-muted/30 border border-primary/20 rounded-lg">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <Label htmlFor="internet-toggle" className="font-retro text-sm">
                Enhance with Internet Research
              </Label>
            </div>
            <Switch
              id="internet-toggle"
              checked={enhanceWithInternet}
              onCheckedChange={onToggleInternet}
            />
          </div>
        )}

        <div className="flex gap-3">
          <Button 
            variant="wizard" 
            size="lg" 
            onClick={handleSubmit}
            disabled={!notes.trim() || isProcessing}
            className="flex-1"
          >
            <Sparkles className="w-5 h-5" />
            {isProcessing ? "PROCESSING..." : "TRANSFORM NOTES"}
          </Button>
          <Button 
            variant="terminal" 
            size="lg" 
            onClick={loadDemo}
            disabled={isProcessing}
          >
            DEMO
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    </Card>
  );
};