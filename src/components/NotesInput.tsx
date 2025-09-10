import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Sparkles, FileText, Mic, Image } from "lucide-react";

interface NotesInputProps {
  onProcessNotes: (notes: string) => void;
  isProcessing: boolean;
}

export const NotesInput = ({ onProcessNotes, isProcessing }: NotesInputProps) => {
  const [notes, setNotes] = useState("");

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
          <Button variant="terminal" size="sm" disabled className="text-xs opacity-50">
            <Image className="w-4 h-4" />
            SCAN (SOON)
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
      </div>
    </Card>
  );
};