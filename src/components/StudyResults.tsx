import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Zap, HelpCircle, Download, RefreshCw } from "lucide-react";

interface StudyResultsProps {
  isVisible: boolean;
  onReset: () => void;
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

export const StudyResults = ({ isVisible, onReset }: StudyResultsProps) => {
  const [currentFlashcard, setCurrentFlashcard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!isVisible) return null;

  const nextCard = () => {
    setIsFlipped(false);
    setCurrentFlashcard((prev) => (prev + 1) % mockFlashcards.length);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setCurrentFlashcard((prev) => (prev - 1 + mockFlashcards.length) % mockFlashcards.length);
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
            <Button variant="cyber" size="sm">
              <Download className="w-4 h-4" />
              EXPORT
            </Button>
            <Button variant="terminal" size="sm" onClick={onReset}>
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
              <ScrollArea className="h-[400px] pr-4">
                <pre className="font-retro text-sm text-foreground whitespace-pre-wrap">
                  {mockSummary}
                </pre>
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="flashcards" className="mt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-retro text-muted-foreground">
                  Card {currentFlashcard + 1} of {mockFlashcards.length}
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
                        ? mockFlashcards[currentFlashcard].back
                        : mockFlashcards[currentFlashcard].front
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
                {mockQA.map((item, index) => (
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