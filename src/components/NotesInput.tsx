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
  onProcessNotes: (notes: string, images?: Array<{data: string, mimeType: string}>) => void;
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
  const [images, setImages] = useState<Array<{data: string, mimeType: string, name: string}>>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleSubmit = () => {
    if (notes.trim() || images.length > 0) {
      onProcessNotes(notes, images);
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

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        const base64Data = base64.split(',')[1]; // Remove data URL prefix
        
        setImages(prev => [...prev, {
          data: base64Data,
          mimeType: file.type,
          name: file.name
        }]);

        toast({
          title: "Image added",
          description: `${file.name} will be processed with your notes.`,
        });
      };

      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "File processing failed",
        description: "Failed to process the image file.",
        variant: "destructive",
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
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
            disabled={isProcessing}
            className="text-xs"
          >
            <Image className="w-4 h-4" />
            ADD IMAGE
          </Button>
        </div>

        {/* Display added images */}
        {images.length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-retro">Added Images:</Label>
            <div className="flex flex-wrap gap-2">
              {images.map((image, index) => (
                <div key={index} className="flex items-center gap-2 bg-muted/50 px-2 py-1 rounded border">
                  <Image className="w-4 h-4" />
                  <span className="text-xs truncate max-w-[100px]">{image.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeImage(index)}
                    className="h-auto p-1 text-destructive hover:text-destructive"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

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
            disabled={(!notes.trim() && images.length === 0) || isProcessing}
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