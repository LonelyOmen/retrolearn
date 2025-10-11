import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Sparkles, FileText, Mic, Image as ImageIcon, Globe } from "lucide-react";
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
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const handleSubmit = () => {
    if (notes.trim() || images.length > 0) {
      onProcessNotes(notes, images.map(({ data, mimeType }) => ({ data, mimeType })));
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
      // Compress and convert to base64 to keep payload small
      const base64Data = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        const reader = new FileReader();
        reader.onload = (e) => {
          img.onload = () => {
            const MAX = 1600;
            let width = img.naturalWidth;
            let height = img.naturalHeight;
            if (width > MAX || height > MAX) {
              if (width >= height) {
                height = Math.round((height * MAX) / width);
                width = MAX;
              } else {
                width = Math.round((width * MAX) / height);
                height = MAX;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Canvas not supported'));
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
            resolve(dataUrl.split(',')[1]);
          };
          img.onerror = reject;
          img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setImages(prev => [...prev, {
        data: base64Data,
        mimeType: 'image/jpeg',
        name: file.name
      }]);

      toast({
        title: "Image added",
        description: `${file.name} will be processed with your notes.`,
      });
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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('Audio blob size:', audioBlob.size);
        
        if (audioBlob.size === 0) {
          toast({
            title: "Recording failed",
            description: "No audio was captured. Please try again.",
            variant: "destructive",
          });
          stream.getTracks().forEach(track => track.stop());
          return;
        }
        
        await transcribeAudio(audioBlob);
        
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording with timeslice to ensure data is captured
      mediaRecorder.start(100);
      setIsRecording(true);
      
      toast({
        title: "Recording started",
        description: "Speak clearly into your microphone",
      });
    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: "Microphone access denied",
        description: "Please allow microphone access to use voice input",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try { mediaRecorderRef.current.requestData(); } catch {}
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    
    try {
      // Use fetch directly to send raw binary data
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/transcribe-audio`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            'Content-Type': 'audio/webm',
          },
          body: audioBlob,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Transcription failed');
      }

      const data = await response.json();

      if (data.isQuotaError) {
        toast({
          title: "Daily limit reached",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      if (data.text) {
        setNotes(prev => {
          const combined = prev ? `${prev}\n\n${data.text}` : data.text;
          // Auto-run the normal transform pipeline
          if (!isProcessing) {
            onProcessNotes(combined, images.map(({ data, mimeType }) => ({ data, mimeType })));
          }
          return combined;
        });
        toast({
          title: "Transcription complete",
          description: "Inserted into notes and starting transform",
        });
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
      toast({
        title: "Transcription failed",
        description: "Failed to transcribe audio. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsTranscribing(false);
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
          <Button 
            variant={isRecording ? "destructive" : "terminal"} 
            size="sm" 
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing || isTranscribing}
            className="text-xs"
          >
            <Mic className={`w-4 h-4 ${isRecording ? 'animate-pulse' : ''}`} />
            {isRecording ? 'STOP' : isTranscribing ? 'TRANSCRIBING...' : 'VOICE'}
          </Button>
          <Button 
            variant="terminal" 
            size="sm" 
            onClick={handleImageScan}
            disabled={isProcessing}
            className="text-xs"
          >
            <ImageIcon className="w-4 h-4" />
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
                  <ImageIcon className="w-4 h-4" />
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