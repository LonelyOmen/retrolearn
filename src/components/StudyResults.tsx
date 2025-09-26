import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Zap, HelpCircle, Download, RefreshCw } from "lucide-react";

interface StudyResultsProps {
  isVisible: boolean;
  onReset: () => void;
  noteData?: any;
}

const mockSummary = `# PROJECT ALPHA - EXECUTIVE SUMMARY

## KEY OBJECTIVES
• Improve user engagement metrics through gamification
• Implement feature improvements within $50k budget
• Complete development in 3-month timeline

## CRITICAL INSIGHTS  
• Competitors show 30% better retention rates
• User demand for dark mode and performance improvements
• Technical feasibility concerns from development team

## ACTION ITEMS
• Conduct legal review for data privacy compliance
• Schedule stakeholder meeting (Friday 2PM)
• Finalize marketing strategy for social features`;

const mockFlashcards = [
  {
    front: "What is the budget constraint for Project Alpha?",
    back: "$50,000 maximum budget allocated for the project"
  },
  {
    front: "What is the project timeline?",
    back: "3 months from project initiation to completion"
  },
  {
    front: "What percentage better retention do competitors have?",
    back: "30% better retention rates compared to current metrics"
  },
  {
    front: "What are the top user feedback requests?",
    back: "Dark mode implementation and faster loading speeds"
  },
  {
    front: "When is the next team meeting scheduled?",
    back: "Friday at 2:00 PM"
  }
];

const mockQA = [
  {
    question: "What are the main challenges facing Project Alpha?",
    answer: "Technical feasibility concerns from the team, budget constraints of $50k, and competing against products with 30% better retention rates."
  },
  {
    question: "What features do users want most?",
    answer: "Dark mode, faster loading times, and social features according to user feedback and marketing requests."
  },
  {
    question: "What needs to happen before launch?",
    answer: "Legal review for data privacy, completion of gamification elements, and stakeholder approval at Friday's meeting."
  },
  {
    question: "How does the competition compare?",
    answer: "Competitor analysis shows they have 30% better user retention rates, indicating areas for improvement in our engagement strategy."
  }
];

export const StudyResults = ({ isVisible, onReset, noteData }: StudyResultsProps) => {
  const [currentFlashcard, setCurrentFlashcard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const navigate = useNavigate();

  // Use real data or fallback to mock data
  const summary = noteData?.summary || mockSummary;
  const flashcards = noteData?.generated_flashcards || mockFlashcards;
  const qaData = noteData?.generated_qa || mockQA;
  const keyPoints = noteData?.key_points || [];

  const handleExport = () => {
    const title = noteData?.title || "Study Materials";
    const date = new Date().toLocaleDateString();
    
    let textContent = `${title}\n`;
    textContent += `Generated on: ${date}\n`;
    textContent += "=" + "=".repeat(title.length + 20) + "\n\n";

    // Add Key Points if available
    if (keyPoints.length > 0) {
      textContent += "KEY POINTS\n";
      textContent += "----------\n";
      keyPoints.forEach((point, index) => {
        textContent += `${index + 1}. ${point}\n`;
      });
      textContent += "\n";
    }

    // Add Summary
    textContent += "SUMMARY\n";
    textContent += "-------\n";
    textContent += summary + "\n\n";

    // Add Flashcards
    textContent += "FLASHCARDS\n";
    textContent += "----------\n";
    flashcards.forEach((card, index) => {
      textContent += `Card ${index + 1}:\n`;
      textContent += `Q: ${card.front}\n`;
      textContent += `A: ${card.back}\n\n`;
    });

    // Add Q&A
    textContent += "QUESTIONS & ANSWERS\n";
    textContent += "------------------\n";
    qaData.forEach((item, index) => {
      textContent += `${index + 1}. ${item.question}\n`;
      textContent += `   ${item.answer}\n\n`;
    });

    const dataBlob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}_study_materials.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isVisible) return null;

  const nextCard = () => {
    setIsFlipped(false);
    setCurrentFlashcard((prev) => (prev + 1) % flashcards.length);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setCurrentFlashcard((prev) => (prev - 1 + flashcards.length) % flashcards.length);
  };

  return (
    <Card className="p-6 bg-card border-2 border-success scanlines">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-retro glow-text">STUDY MATERIALS READY</h2>
            <p className="text-sm text-muted-foreground font-retro mt-1">
              Your notes have been transformed into organized learning resources
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="cyber" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4" />
              EXPORT
            </Button>
            <Button variant="terminal" size="sm" onClick={() => navigate('/note-wizard')}>
              <RefreshCw className="w-4 h-4" />
              NEW NOTES
            </Button>
          </div>
        </div>

        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-muted border border-primary">
            <TabsTrigger value="summary" className="font-retro">
              <FileText className="w-4 h-4 mr-2" />
              SUMMARY
            </TabsTrigger>
            <TabsTrigger value="flashcards" className="font-retro">
              <Zap className="w-4 h-4 mr-2" />
              FLASHCARDS
            </TabsTrigger>
            <TabsTrigger value="qa" className="font-retro">
              <HelpCircle className="w-4 h-4 mr-2" />
              Q&A
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-6">
            <Card className="p-6 bg-muted border-2 border-secondary">
              {keyPoints.length > 0 && (
                <div className="mb-4 space-y-2">
                  <h3 className="font-retro font-bold text-primary">KEY POINTS</h3>
                  <ul className="space-y-1">
                    {keyPoints.map((point, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-accent font-bold">•</span>
                        <span className="font-retro text-sm">{point}</span>
                      </li>
                    ))}
                  </ul>
                  <hr className="border-secondary my-4" />
                </div>
              )}
              <ScrollArea className="h-[400px] pr-4">
                <pre className="font-retro text-sm text-foreground whitespace-pre-wrap">
                  {summary}
                </pre>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="flashcards" className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-retro text-muted-foreground">
                    Card {currentFlashcard + 1} of {flashcards.length}
                  </span>
                  <div className="flex gap-2">
                    <Button variant="terminal" size="sm" onClick={prevCard}>
                      PREV
                    </Button>
                    <Button variant="terminal" size="sm" onClick={nextCard}>
                      NEXT
                    </Button>
                  </div>
                </div>
                
                <Card 
                  className="h-[300px] cursor-pointer bg-muted border-2 border-accent hover:shadow-pink transition-all duration-300"
                  onClick={() => setIsFlipped(!isFlipped)}
                >
                  <div className="h-full flex items-center justify-center p-6">
                    <div className="text-center">
                      <div className="text-lg font-retro mb-4 glow-pink">
                        {isFlipped ? "ANSWER" : "QUESTION"}
                      </div>
                      <p className="font-retro text-foreground">
                        {isFlipped 
                          ? flashcards[currentFlashcard].back
                          : flashcards[currentFlashcard].front
                        }
                      </p>
                      <div className="mt-6 text-xs text-muted-foreground font-retro">
                        Click to {isFlipped ? "see question" : "reveal answer"}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
          </TabsContent>

          <TabsContent value="qa" className="mt-6">
            <ScrollArea className="h-[400px]">
              <div className="space-y-4">
                {qaData.map((item: any, index: number) => (
                  <Card key={index} className="p-4 bg-muted border border-secondary">
                    <div className="space-y-3">
                      <div className="font-retro font-bold text-primary">
                        Q: {item.question}
                      </div>
                      <div className="font-retro text-sm text-foreground pl-4 border-l-2 border-accent">
                        A: {item.answer}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
};