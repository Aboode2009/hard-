import { useTranslation } from "react-i18next";
import { bi } from "@/i18n/bi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowRight, Heart, Brain, Dumbbell, Users, Briefcase, BookOpen, Moon, Sparkles, Target } from "lucide-react";

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

interface AssessmentResultsProps {
  results: AssessmentResults;
  onContinue: () => void;
}

const areaConfig = {
  health: { icon: Heart, colorClass: 'text-green-500', labelAr: 'الصحة', labelEn: 'Health' },
  fitness: { icon: Dumbbell, colorClass: 'text-orange-500', labelAr: 'اللياقة', labelEn: 'Fitness' },
  sleep: { icon: Moon, colorClass: 'text-indigo-500', labelAr: 'النوم', labelEn: 'Sleep' },
  learning: { icon: BookOpen, colorClass: 'text-blue-500', labelAr: 'التعلم', labelEn: 'Learning' },
  spirituality: { icon: Sparkles, colorClass: 'text-yellow-500', labelAr: 'الروحانية', labelEn: 'Spirituality' },
  relationships: { icon: Users, colorClass: 'text-pink-500', labelAr: 'العلاقات', labelEn: 'Relationships' },
  work: { icon: Briefcase, colorClass: 'text-slate-500', labelAr: 'العمل', labelEn: 'Work' },
  overall: { icon: Brain, colorClass: 'text-purple-500', labelAr: 'الرضا العام', labelEn: 'Overall' },
};

export const AssessmentResultsScreen = ({ results, onContinue }: AssessmentResultsProps) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  // Find weakest and strongest areas
  const sortedAreas = Object.entries(results)
    .filter(([key]) => key !== 'overall')
    .sort((a, b) => a[1] - b[1]);

  const weakestAreas = sortedAreas.slice(0, 3);
  const strongestAreas = sortedAreas.slice(-2).reverse();

  const getRecommendedPath = () => {
    const weakest = weakestAreas[0][0];
    if (weakest === 'health' || weakest === 'fitness' || weakest === 'sleep') {
      return { pathAr: '21 مسلم HARD', pathEn: '21 Muslim HARD', reason: bi("لتحسين صحتك ولياقتك", "To improve your health and fitness") };
    }
    if (weakest === 'spirituality') {
      return { pathAr: '21 مسلم HARD', pathEn: '21 Muslim HARD', reason: bi("لتقوية التزامك الديني", "To strengthen your spiritual commitment") };
    }
    if (weakest === 'learning') {
      return { pathAr: '45 يوم تحول', pathEn: '45 Days Transformation', reason: bi("لبناء عادات تعلم قوية", "To build strong learning habits") };
    }
    return { pathAr: '75 يوم نخبة', pathEn: '75 Days Elite', reason: bi("للتطوير الشامل", "For comprehensive development") };
  };

  const recommendation = getRecommendedPath();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black p-4 overflow-y-auto">
      <div className="w-full max-w-lg space-y-6 py-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-white">
            {bi("نتائج التقييم", "Assessment Results")}
          </h1>
          <p className="text-white/70">
            {bi("بناءً على إجاباتك، إليك تحليل وضعك الحالي", "Based on your answers, here is your current status analysis")}
          </p>
        </div>

        {/* Overall Score */}
        <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30">
          <CardContent className="p-6 text-center space-y-3">
            <div className="text-6xl font-black text-primary">{results.overall}%</div>
            <div className="text-white/80">
              {bi("الرضا العام عن الحياة", "Overall Life Satisfaction")}
            </div>
          </CardContent>
        </Card>

        {/* All Areas */}
        <Card className="bg-white/10 backdrop-blur-sm border-white/20">
          <CardContent className="p-4 space-y-3">
            {Object.entries(results).map(([key, value]) => {
              const config = areaConfig[key as keyof typeof areaConfig];
              const Icon = config.icon;
              return (
                <div key={key} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${config.colorClass}`} />
                      <span className="text-white text-sm">
                        {isArabic ? config.labelAr : config.labelEn}
                      </span>
                    </div>
                    <span className="text-white font-bold text-sm">{value}%</span>
                  </div>
                  <Progress 
                    value={value} 
                    className="h-2 bg-white/10"
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Focus Areas */}
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4 space-y-2">
            <h3 className="text-white font-bold flex items-center gap-2">
              <Target className="w-5 h-5 text-red-400" />
              {bi("مناطق تحتاج تحسين", "Areas Needing Improvement")}
            </h3>
            <div className="space-y-1">
              {weakestAreas.map(([key, value]) => {
                const config = areaConfig[key as keyof typeof areaConfig];
                return (
                  <div key={key} className="flex items-center justify-between text-white/80 text-sm">
                    <span>{isArabic ? config.labelAr : config.labelEn}</span>
                    <span className="text-red-400 font-bold">{value}%</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recommendation */}
        <Card className="bg-primary/20 border-primary/40">
          <CardContent className="p-4 space-y-2">
            <h3 className="text-white font-bold">
              {bi("المسار المقترح لك", "Recommended Path")}
            </h3>
            <div className="text-2xl font-black text-primary">
              {isArabic ? recommendation.pathAr : recommendation.pathEn}
            </div>
            <p className="text-white/70 text-sm">{recommendation.reason}</p>
          </CardContent>
        </Card>

        {/* Continue Button */}
        <Button
          onClick={onContinue}
          size="lg"
          className="w-full bg-white text-black hover:bg-white/90 font-bold h-14"
        >
          {bi("عرض المسارات", "View Paths")}
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
};
