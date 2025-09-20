import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { Brain, Plus, Play, Trophy, Clock, Users, CheckCircle, XCircle, Sparkles, ArrowLeft, Zap, Search, Eye, Lock, Globe } from 'lucide-react';
interface Quiz {
  id: string;
  title: string;
  description: string;
  creator_id: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}
interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  question_number: number;
}
interface QuizAttempt {
  answers: Record<string, string>;
  score: number;
  total_questions: number;
}
export default function Quizzes() {
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const [publicQuizzes, setPublicQuizzes] = useState<Quiz[]>([]);
  const [privateQuizzes, setPrivateQuizzes] = useState<Quiz[]>([]);
  const [currentQuiz, setCurrentQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isCompleted, setIsCompleted] = useState(false);
  const [results, setResults] = useState<QuizAttempt | null>(null);
  const [loading, setLoading] = useState(false);

  // Create Quiz Form
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createTopic, setCreateTopic] = useState('');
  const [creating, setCreating] = useState(false);
  const [newlyCreatedQuiz, setNewlyCreatedQuiz] = useState<Quiz | null>(null);
  const [showQuizCreated, setShowQuizCreated] = useState(false);

  // Search functionality
  const [publicSearchTerm, setPublicSearchTerm] = useState('');
  const [privateSearchTerm, setPrivateSearchTerm] = useState('');
  useEffect(() => {
    fetchQuizzes();
  }, [user]);
  const fetchQuizzes = async () => {
    if (!user) return;

    // Fetch public quizzes
    const {
      data: publicData,
      error: publicError
    } = await supabase.from('quizzes').select('*').eq('is_public', true).order('created_at', {
      ascending: false
    });
    if (publicError) {
      toast({
        title: "Error fetching public quizzes",
        description: publicError.message,
        variant: "destructive"
      });
    } else {
      // Fetch creator profiles for public quizzes
      const publicQuizzesWithProfiles = await Promise.all((publicData || []).map(async quiz => {
        const {
          data: profile
        } = await supabase.from('profiles').select('full_name, email').eq('id', quiz.creator_id).single();
        return {
          ...quiz,
          profiles: profile
        };
      }));
      setPublicQuizzes(publicQuizzesWithProfiles);
    }

    // Fetch private quizzes for current user
    const {
      data: privateData,
      error: privateError
    } = await supabase.from('quizzes').select('*').eq('creator_id', user.id).eq('is_public', false).order('created_at', {
      ascending: false
    });
    if (privateError) {
      toast({
        title: "Error fetching private quizzes",
        description: privateError.message,
        variant: "destructive"
      });
    } else {
      // Add current user profile to private quizzes
      const privateQuizzesWithProfiles = (privateData || []).map(quiz => ({
        ...quiz,
        profiles: {
          full_name: user.email?.split('@')[0] || 'You',
          email: user.email || ''
        }
      }));
      setPrivateQuizzes(privateQuizzesWithProfiles);
    }
  };
  const createQuizWithAI = async () => {
    if (!createTitle.trim() || !createTopic.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both a title and topic",
        variant: "destructive"
      });
      return;
    }
    setCreating(true);
    try {
      // Call AI generation edge function via Supabase client
      const {
        data: result,
        error: fnError
      } = await supabase.functions.invoke('generate-quiz', {
        body: {
          title: createTitle,
          description: createDescription,
          topic: createTopic
        }
      });
      if (fnError) {
        throw fnError;
      }
      const {
        quiz_id
      } = (result || {}) as {
        quiz_id: string;
      };

      // Fetch the newly created quiz
      const {
        data: newQuiz
      } = await supabase.from('quizzes').select('*').eq('id', quiz_id).single();
      if (newQuiz) {
        setNewlyCreatedQuiz({
          ...newQuiz,
          profiles: {
            full_name: user.email?.split('@')[0] || 'You',
            email: user.email || ''
          }
        });
        setShowQuizCreated(true);
      }

      // Reset form
      setCreateTitle('');
      setCreateDescription('');
      setCreateTopic('');
    } catch (error) {
      console.error('Error creating quiz:', error);
      toast({
        title: "Error creating quiz",
        description: "Failed to generate quiz with AI",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };
  const startQuiz = async (quiz: Quiz) => {
    setLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.from('quiz_questions').select('*').eq('quiz_id', quiz.id).order('question_number');
      if (error) throw error;
      setCurrentQuiz(quiz);
      setQuestions((data || []) as QuizQuestion[]);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setIsCompleted(false);
      setResults(null);
    } catch (error) {
      console.error('Error loading quiz:', error);
      toast({
        title: "Error loading quiz",
        description: "Failed to load quiz questions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  const selectAnswer = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };
  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };
  const previousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };
  const submitQuiz = async () => {
    if (!currentQuiz || !user) return;

    // Calculate score
    let score = 0;
    questions.forEach(question => {
      if (answers[question.id] === question.correct_answer) {
        score++;
      }
    });
    const attempt: QuizAttempt = {
      answers,
      score,
      total_questions: questions.length
    };
    try {
      // Save attempt to database
      const {
        error
      } = await supabase.from('quiz_attempts').insert({
        quiz_id: currentQuiz.id,
        user_id: user.id,
        score,
        total_questions: questions.length,
        answers
      });
      if (error) throw error;
      setResults(attempt);
      setIsCompleted(true);
      toast({
        title: "Quiz completed!",
        description: `You scored ${score} out of ${questions.length}`
      });
    } catch (error) {
      console.error('Error submitting quiz:', error);
      toast({
        title: "Error submitting quiz",
        description: "Failed to save your results",
        variant: "destructive"
      });
    }
  };
  const resetQuiz = () => {
    setCurrentQuiz(null);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setIsCompleted(false);
    setResults(null);
    setNewlyCreatedQuiz(null);
    setShowQuizCreated(false);
  };
  const makeQuizPublic = async (quizId: string) => {
    const {
      error
    } = await supabase.from('quizzes').update({
      is_public: true
    }).eq('id', quizId);
    if (error) {
      toast({
        title: "Error making quiz public",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Quiz is now public!",
        description: "Other users can now find and take your quiz"
      });
      fetchQuizzes();
      setShowQuizCreated(false);
    }
  };
  const keepQuizPrivate = async () => {
    toast({
      title: "Quiz kept private",
      description: "Your quiz is only visible to you"
    });
    fetchQuizzes();
    setShowQuizCreated(false);
  };
  const filteredPublicQuizzes = publicQuizzes.filter(quiz => quiz.title.toLowerCase().includes(publicSearchTerm.toLowerCase()) || quiz.description?.toLowerCase().includes(publicSearchTerm.toLowerCase()));
  const filteredPrivateQuizzes = privateQuizzes.filter(quiz => quiz.title.toLowerCase().includes(privateSearchTerm.toLowerCase()) || quiz.description?.toLowerCase().includes(privateSearchTerm.toLowerCase()));
  if (currentQuiz && !isCompleted) {
    const currentQuestion = questions[currentQuestionIndex];
    const progress = (currentQuestionIndex + 1) / questions.length * 100;
    return <div className="min-h-screen bg-gradient-terminal p-4 scanlines">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={resetQuiz} className="font-retro">
              <ArrowLeft className="w-4 h-4 mr-2" />
              BACK TO QUIZZES
            </Button>
            <Badge variant="secondary" className="font-retro">
              Question {currentQuestionIndex + 1} of {questions.length}
            </Badge>
          </div>

          <Card className="border-2 border-primary bg-card scanlines">
            <CardHeader>
              <CardTitle className="font-retro glow-text text-center">
                {currentQuiz.title}
              </CardTitle>
              <Progress value={progress} className="w-full" />
            </CardHeader>
            <CardContent className="space-y-6">
              {currentQuestion && <>
                  <div className="text-center">
                    <h3 className="text-xl font-retro mb-6 text-foreground">
                      {currentQuestion.question_text}
                    </h3>
                  </div>

                  <RadioGroup value={answers[currentQuestion.id] || ''} onValueChange={value => selectAnswer(currentQuestion.id, value)} className="space-y-4">
                    {['A', 'B', 'C', 'D'].map(option => <div key={option} className="flex items-center space-x-3 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value={option} id={`${currentQuestion.id}-${option}`} />
                        <Label htmlFor={`${currentQuestion.id}-${option}`} className="font-retro text-sm flex-1 cursor-pointer">
                          <span className="font-bold text-primary mr-2">{option}.</span>
                          {currentQuestion[`option_${option.toLowerCase()}` as keyof QuizQuestion]}
                        </Label>
                      </div>)}
                  </RadioGroup>

                  <div className="flex justify-between pt-6">
                    <Button variant="outline" onClick={previousQuestion} disabled={currentQuestionIndex === 0} className="font-retro">
                      Previous
                    </Button>
                    
                    {currentQuestionIndex === questions.length - 1 ? <Button onClick={submitQuiz} disabled={!answers[currentQuestion.id]} className="font-retro bg-accent hover:bg-accent/80">
                        <Trophy className="w-4 h-4 mr-2" />
                        SUBMIT QUIZ
                      </Button> : <Button onClick={nextQuestion} disabled={!answers[currentQuestion.id]} className="font-retro">
                        Next
                      </Button>}
                  </div>
                </>}
            </CardContent>
          </Card>
        </div>
      </div>;
  }
  if (isCompleted && results) {
    const percentage = Math.round(results.score / results.total_questions * 100);
    return <div className="min-h-screen bg-gradient-terminal p-4 scanlines">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="text-center">
            <Button variant="outline" onClick={resetQuiz} className="font-retro mb-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              BACK TO QUIZZES
            </Button>
          </div>

          <Card className="border-2 border-accent bg-card scanlines">
            <CardHeader className="text-center">
              <Trophy className="w-16 h-16 mx-auto text-accent mb-4" />
              <CardTitle className="font-retro text-3xl glow-pink">
                QUIZ COMPLETED!
              </CardTitle>
              <CardDescription className="font-retro text-lg">
                {currentQuiz?.title}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <div className="text-6xl font-retro font-bold glow-text mb-2">
                  {percentage}%
                </div>
                <div className="font-retro text-muted-foreground">
                  {results.score} out of {results.total_questions} correct
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-retro text-lg glow-blue">Review Answers:</h3>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {questions.map((question, index) => {
                    const userAnswer = results.answers[question.id];
                    const isCorrect = userAnswer === question.correct_answer;
                    return <div key={question.id} className="p-4 border border-border rounded-lg">
                          <div className="flex items-start gap-2 mb-2">
                            {isCorrect ? <CheckCircle className="w-5 h-5 text-success mt-1" /> : <XCircle className="w-5 h-5 text-destructive mt-1" />}
                            <div className="flex-1">
                              <p className="font-retro text-sm font-bold">
                                Question {index + 1}
                              </p>
                              <p className="font-retro text-sm mb-2">
                                {question.question_text}
                              </p>
                              <div className="space-y-1 text-xs">
                                {!isCorrect && <>
                                    <p className="font-retro text-destructive">
                                      Your answer: {userAnswer}. {question[`option_${userAnswer?.toLowerCase()}` as keyof QuizQuestion]}
                                    </p>
                                    <p className="font-retro text-success">
                                      Correct answer: {question.correct_answer}. {question[`option_${question.correct_answer.toLowerCase()}` as keyof QuizQuestion]}
                                    </p>
                                  </>}
                                {isCorrect && <p className="font-retro text-success">
                                    Correct! {question.correct_answer}. {question[`option_${question.correct_answer.toLowerCase()}` as keyof QuizQuestion]}
                                  </p>}
                              </div>
                            </div>
                          </div>
                        </div>;
                  })}
                  </div>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>;
  }

  // Quiz created dialog
  if (showQuizCreated && newlyCreatedQuiz) {
    return <div className="min-h-screen bg-gradient-terminal p-4 scanlines">
        <div className="max-w-2xl mx-auto space-y-6 pt-12">
          <Card className="border-2 border-success bg-card scanlines">
            <CardHeader className="text-center">
              <Sparkles className="w-16 h-16 mx-auto text-success mb-4" />
              <CardTitle className="font-retro text-3xl glow-text">
                QUIZ CREATED!
              </CardTitle>
              <CardDescription className="font-retro text-lg">
                {newlyCreatedQuiz.title}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <p className="font-retro text-muted-foreground">
                  Your AI-generated quiz is ready! What would you like to do?
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Button onClick={() => startQuiz(newlyCreatedQuiz)} className="font-retro bg-primary hover:bg-primary/80">
                  <Eye className="w-4 h-4 mr-2" />
                  VIEW & TEST QUIZ
                </Button>
                <Button onClick={() => makeQuizPublic(newlyCreatedQuiz.id)} variant="outline" className="font-retro">
                  <Globe className="w-4 h-4 mr-2" />
                  MAKE PUBLIC
                </Button>
              </div>

              <div className="flex justify-center">
                <Button onClick={keepQuizPrivate} variant="ghost" className="font-retro text-muted-foreground">
                  <Lock className="w-4 h-4 mr-2" />
                  Keep Private
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>;
  }
  return <div className="min-h-screen bg-gradient-terminal p-4 scanlines">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-retro font-bold glow-text mb-4">
            RETRO QUIZZES
          </h1>
          <p className="text-lg font-retro text-muted-foreground">
            Challenge yourself with AI-generated multiple choice quizzes
          </p>
        </div>

        <Tabs defaultValue="do-quizzes" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="do-quizzes" className="font-retro">
              <Play className="w-4 h-4 mr-2" />
              DO QUIZZES
            </TabsTrigger>
            <TabsTrigger value="create-quiz" className="font-retro">
              <Plus className="w-4 h-4 mr-2" />
              CREATE QUIZ
            </TabsTrigger>
          </TabsList>

          <TabsContent value="do-quizzes" className="space-y-6">
            <Tabs defaultValue="public" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="public" className="font-retro">
                  <Globe className="w-4 h-4 mr-2" />
                  PUBLIC QUIZZES
                </TabsTrigger>
                
              </TabsList>

              <TabsContent value="public" className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input placeholder="Search public quizzes..." value={publicSearchTerm} onChange={e => setPublicSearchTerm(e.target.value)} className="pl-10 font-retro" />
                </div>
                
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredPublicQuizzes.map(quiz => <Card key={quiz.id} className="group hover:shadow-neon transition-all duration-300 border-2 border-secondary bg-card scanlines">
                      <CardHeader>
                        <CardTitle className="font-retro text-lg glow-text line-clamp-2">
                          {quiz.title}
                        </CardTitle>
                        <CardDescription className="font-retro text-sm line-clamp-3">
                          {quiz.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between text-xs font-retro text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {quiz.profiles?.full_name || quiz.profiles?.email?.split('@')[0] || 'Anonymous'}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(quiz.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <Button onClick={() => startQuiz(quiz)} disabled={loading} className="w-full font-retro group-hover:bg-secondary/20 transition-colors" variant="outline">
                          <Play className="w-4 h-4 mr-2" />
                          START QUIZ
                        </Button>
                      </CardContent>
                    </Card>)}
                </div>

                {filteredPublicQuizzes.length === 0 && publicSearchTerm && <div className="text-center py-12">
                    <Search className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-retro text-xl glow-text mb-2">No Results Found</h3>
                    <p className="font-retro text-muted-foreground">
                      Try adjusting your search terms
                    </p>
                  </div>}

                {publicQuizzes.length === 0 && !publicSearchTerm && <div className="text-center py-12">
                    <Brain className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-retro text-xl glow-text mb-2">No Public Quizzes</h3>
                    <p className="font-retro text-muted-foreground">
                      Be the first to create a public quiz!
                    </p>
                  </div>}
              </TabsContent>

              <TabsContent value="private" className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input placeholder="Search your private quizzes..." value={privateSearchTerm} onChange={e => setPrivateSearchTerm(e.target.value)} className="pl-10 font-retro" />
                </div>
                
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {filteredPrivateQuizzes.map(quiz => <Card key={quiz.id} className="group hover:shadow-neon transition-all duration-300 border-2 border-accent bg-card scanlines">
                      <CardHeader>
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="secondary" className="font-retro text-xs">
                            <Lock className="w-3 h-3 mr-1" />
                            PRIVATE
                          </Badge>
                        </div>
                        <CardTitle className="font-retro text-lg glow-text line-clamp-2">
                          {quiz.title}
                        </CardTitle>
                        <CardDescription className="font-retro text-sm line-clamp-3">
                          {quiz.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between text-xs font-retro text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(quiz.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => startQuiz(quiz)} disabled={loading} className="flex-1 font-retro group-hover:bg-accent/20 transition-colors" variant="outline">
                            <Play className="w-4 h-4 mr-2" />
                            START
                          </Button>
                          <Button onClick={() => makeQuizPublic(quiz.id)} size="sm" variant="ghost" className="font-retro text-xs">
                            <Globe className="w-3 h-3 mr-1" />
                            PUBLIC
                          </Button>
                        </div>
                      </CardContent>
                    </Card>)}
                </div>

                {filteredPrivateQuizzes.length === 0 && privateSearchTerm && <div className="text-center py-12">
                    <Search className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-retro text-xl glow-text mb-2">No Results Found</h3>
                    <p className="font-retro text-muted-foreground">
                      Try adjusting your search terms
                    </p>
                  </div>}

                {privateQuizzes.length === 0 && !privateSearchTerm && <div className="text-center py-12">
                    <Lock className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-retro text-xl glow-text mb-2">No Private Quizzes</h3>
                    <p className="font-retro text-muted-foreground">
                      Create your first private quiz to get started!
                    </p>
                  </div>}
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="create-quiz" className="space-y-6">
            <div className="flex items-center mb-6">
              
            </div>
            
            <Card className="border-2 border-primary bg-card scanlines max-w-2xl mx-auto">
              <CardHeader className="text-center">
                <Sparkles className="w-12 h-12 mx-auto text-primary mb-4" />
                <CardTitle className="font-retro text-2xl glow-text">
                  CREATE AI QUIZ
                </CardTitle>
                <CardDescription className="font-retro">
                  Generate a 10-question multiple choice quiz using AI
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title" className="font-retro text-sm">Quiz Title</Label>
                    <Input id="title" value={createTitle} onChange={e => setCreateTitle(e.target.value)} placeholder="e.g., History of Computing" className="font-retro" />
                  </div>
                  
                  <div>
                    <Label htmlFor="description" className="font-retro text-sm">Description (Optional)</Label>
                    <Textarea id="description" value={createDescription} onChange={e => setCreateDescription(e.target.value)} placeholder="Brief description of the quiz content..." className="font-retro resize-none" rows={3} />
                  </div>
                  
                  <div>
                    <Label htmlFor="topic" className="font-retro text-sm">Topic</Label>
                    <Textarea id="topic" value={createTopic} onChange={e => setCreateTopic(e.target.value)} placeholder="Describe the topic you want the quiz to cover. Be specific about the subject matter, difficulty level, and any particular focus areas..." className="font-retro resize-none" rows={4} />
                  </div>
                </div>

                <Button onClick={createQuizWithAI} disabled={creating || !user} className="w-full font-retro bg-primary hover:bg-primary/80">
                  {creating ? <>
                      <Zap className="w-4 h-4 mr-2 animate-pulse" />
                      GENERATING QUIZ...
                    </> : <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      GENERATE WITH AI
                    </>}
                </Button>

                {!user && <p className="text-sm font-retro text-muted-foreground text-center">
                    Please sign in to create quizzes
                  </p>}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>;
}