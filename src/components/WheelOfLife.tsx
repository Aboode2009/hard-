import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { clerkAuth } from "@/lib/clerk-auth";
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  ResponsiveContainer,
  Tooltip
} from "recharts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WheelOfLifeProps {
  userId?: string;
}

interface LifeAreaData {
  area: string;
  areaAr: string;
  value: number;
  fullMark: 100;
  color: string;
}

type TimePeriod = 7 | 30 | 90;

export const WheelOfLife = ({ userId }: WheelOfLifeProps) => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const [data, setData] = useState<LifeAreaData[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<TimePeriod>(30);

  const lifeAreas = [
    { name: 'health', nameAr: 'صحي', color: '#22c55e' },
    { name: 'fitness', nameAr: 'رياضة', color: '#f97316' },
    { name: 'learning', nameAr: 'تعلّم', color: '#3b82f6' },
    { name: 'culture', nameAr: 'ثقافة', color: '#8b5cf6' },
    { name: 'religion', nameAr: 'دين', color: '#eab308' },
    { name: 'work', nameAr: 'عمل', color: '#64748b' },
    { name: 'relationships', nameAr: 'علاقات', color: '#ec4899' },
    { name: 'skills', nameAr: 'مهارة', color: '#06b6d4' },
  ];

  useEffect(() => {
    fetchData();
  }, [userId, period]);

  const fetchData = async () => {
    setLoading(true);
    
    try {
      const { data: { session } } = await clerkAuth.getSession();
      const targetUserId = userId || session?.user?.id;
      
      if (!targetUserId) {
        setLoading(false);
        return;
      }

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - period);

      // Fetch task completions for the period
      const { data: completions } = await supabase
        .from('task_completions')
        .select('*, life_area_tags(name)')
        .eq('user_id', targetUserId)
        .gte('completed_at', startDate.toISOString())
        .lte('completed_at', endDate.toISOString());

      // Count completions per area
      const areaCount: Record<string, number> = {};
      lifeAreas.forEach(area => {
        areaCount[area.name] = 0;
      });

      completions?.forEach((completion: any) => {
        const areaName = completion.life_area_tags?.name;
        if (areaName && areaCount[areaName] !== undefined) {
          areaCount[areaName]++;
        }
      });

      // Calculate max possible (assuming 1 task per area per day)
      const maxPossible = period;

      // Convert to chart data
      const chartData: LifeAreaData[] = lifeAreas.map(area => ({
        area: isArabic ? area.nameAr : area.name,
        areaAr: area.nameAr,
        value: Math.min(100, Math.round((areaCount[area.name] / maxPossible) * 100)),
        fullMark: 100,
        color: area.color,
      }));

      setData(chartData);
    } catch (error) {
      console.error('Error fetching wheel data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="duo-card p-6">
        <div className="h-64 flex items-center justify-center">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="duo-card p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground">
          {t('wheelOfLife.title')}
        </h3>
        
        {/* Period Selector */}
        <div className="flex gap-1">
          {([7, 30, 90] as TimePeriod[]).map((p) => (
            <Button
              key={p}
              size="sm"
              variant={period === p ? "default" : "ghost"}
              className={cn(
                "h-8 px-3 text-xs",
                period === p && "bg-primary text-primary-foreground"
              )}
              onClick={() => setPeriod(p)}
            >
              {p} {t('wheelOfLife.days')}
            </Button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis 
              dataKey="area" 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            />
            <PolarRadiusAxis 
              angle={30} 
              domain={[0, 100]} 
              tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
            />
            <Radar
              name="Progress"
              dataKey="value"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-4 gap-2 text-xs">
        {data.map((item) => (
          <div key={item.area} className="flex items-center gap-1.5">
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: lifeAreas.find(a => 
                isArabic ? a.nameAr === item.area : a.name === item.area
              )?.color }}
            />
            <span className="text-muted-foreground truncate">{item.area}</span>
            <span className="text-foreground font-medium">{item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
