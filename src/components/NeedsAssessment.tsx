import { useState } from "react";
import { bi } from "@/i18n/bi";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, ChevronLeft, SkipForward, Heart, Brain, Dumbbell, Users, Briefcase, BookOpen, Moon, Sparkles } from "lucide-react";

interface NeedsAssessmentProps {
  onComplete: (results: AssessmentResults) => void;
  onSkip: () => void;
}

interface AssessmentResults {
  health: number;
  fitness: number;
  learning: number;
  relationships: number;
  work: number;
  spirituality: number;
  sleep: number;
  overall: number;
}

interface Question {
  id: string;
  area: keyof AssessmentResults;
  questionAr: string;
  questionEn: string;
  icon: React.ReactNode;
}

const questions: Question[] = [
  { id: 'health1', area: 'health', questionAr: 'كيف تقيم صحتك الجسدية العامة؟', questionEn: 'How would you rate your overall physical health?', icon: <Heart className="w-8 h-8" /> },
  { id: 'fitness1', area: 'fitness', questionAr: 'كم مرة تمارس الرياضة أسبوعياً؟', questionEn: 'How often do you exercise per week?', icon: <Dumbbell className="w-8 h-8" /> },
  { id: 'sleep1', area: 'sleep', questionAr: 'كيف تقيم جودة نومك؟', questionEn: 'How would you rate your sleep quality?', icon: <Moon className="w-8 h-8" /> },
  { id: 'learning1', area: 'learning', questionAr: 'كم وقت تخصص للقراءة والتعلم يومياً؟', questionEn: 'How much time do you dedicate to reading and learning daily?', icon: <BookOpen className="w-8 h-8" /> },
  { id: 'spirituality1', area: 'spirituality', questionAr: 'كيف تقيم التزامك الديني والروحي؟', questionEn: 'How would you rate your spiritual commitment?', icon: <Sparkles className="w-8 h-8" /> },
  { id: 'relationships1', area: 'relationships', questionAr: 'كيف تقيم علاقاتك الاجتماعية والعائلية؟', questionEn: 'How would you rate your social and family relationships?', icon: <Users className="w-8 h-8" /> },
  { id: 'work1', area: 'work', questionAr: 'كيف تقيم إنتاجيتك في العمل/الدراسة؟', questionEn: 'How would you rate your productivity at work/study?', icon: <Briefcase className="w-8 h-8" /> },
  { id: 'overall1', area: 'overall', questionAr: 'بشكل عام، ما مدى رضاك عن حياتك؟', questionEn: 'Overall, how satisfied are you with your life?', icon: <Brain className="w-8 h-8" /> },
];

const scaleOptions = [
  { value: 1, labelAr: 'ضعيف جداً', labelEn: 'Very Poor' },
  { value: 2, labelAr: 'ضعيف', labelEn: 'Poor' },
  { value: 3, labelAr: 'متوسط', labelEn: 'Average' },
  { value: 4, labelAr: 'جيد', labelEn: 'Good' },
  { value: 5, labelAr: 'ممتاز', labelEn: 'Excellent' },
];

export const NeedsAssessment = ({ onComplete, onSkip }: NeedsAssessmentProps) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const handleAnswer = (value: number) => {
    setAnswers(prev => ({ ...prev, [question.id]: value }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      // Calculate results
      const results: AssessmentResults = {
        health: 0, fitness: 0, learning: 0, relationships: 0,
        work: 0, spirituality: 0, sleep: 0, overall: 0,
      };

      const areaCounts: Record<string, number> = {};

      questions.forEach(q => {
        const answer = answers[q.id] || 3;
        results[q.area] += answer * 20; // Convert 1-5 to 0-100
        areaCounts[q.area] = (areaCounts[q.area] || 0) + 1;
      });

      // Average if multiple questions per area
      Object.keys(results).forEach(key => {
        const count = areaCounts[key] || 1;
        results[key as keyof AssessmentResults] = Math.round(results[key as keyof AssessmentResults] / count);
      });

      onComplete(results);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black p-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-white/70">
            <span>{bi("السؤال", "Question")} {currentQuestion + 1}/{questions.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2 bg-white/20" />
        </div>

        {/* Question Card */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardContent className="p-6 space-y-6">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="p-4 bg-white/10 rounded-full text-white">
                {question.icon}
              </div>
            </div>

            {/* Question */}
            <h2 className="text-xl font-bold text-white text-center">
              {isArabic ? question.questionAr : question.questionEn}
            </h2>

            {/* Scale Options */}
            <div className="grid grid-cols-5 gap-2">
              {scaleOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleAnswer(option.value)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    answers[question.id] === option.value
                      ? 'bg-white text-black border-white'
                      : 'bg-white/5 text-white border-white/20 hover:bg-white/10'
                  }`}
                >
                  <div className="text-2xl font-bold">{option.value}</div>
                  <div className="text-xs mt-1 hidden sm:block">
                    {isArabic ? option.labelAr : option.labelEn}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={currentQuestion === 0}
            className="text-white hover:bg-white/10"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            {bi("السابق", "Previous")}
          </Button>

          <Button
            variant="ghost"
            onClick={onSkip}
            className="text-white/60 hover:bg-white/10"
          >
            <SkipForward className="w-5 h-5 mr-1" />
            {bi("تخطي", "Skip")}
          </Button>

          <Button
            onClick={handleNext}
            disabled={!answers[question.id]}
            className="bg-white text-black hover:bg-white/90"
          >
            {currentQuestion === questions.length - 1 
              ? (bi("عرض النتائج", "View Results"))
              : (bi("التالي", "Next"))
            }
            <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
};
