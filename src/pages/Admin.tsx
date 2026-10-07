import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "react-i18next";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Shield, Users, TrendingUp, UserCheck, Award, BarChart3, Database, Calendar, FileText, RefreshCw, ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface UserProgress {
  id: string;
  user_id: string;
  current_day: number;
  current_streak: number;
  best_streak: number;
  is_active: boolean;
  profiles: {
    username: string;
  };
}

interface UserWithRole {
  id: string;
  username: string;
  email: string;
  created_at: string;
  role: string | null;
}

interface Statistics {
  totalUsers: number;
  activeUsers: number;
  completionRate: number;
  averageDays: number;
  bestStreak: number;
  adminCount: number;
  moderatorCount: number;
  userCount: number;
}

interface DatabaseStats {
  profiles: number;
  challengeProgress: number;
  taskReminders: number;
  userRoles: number;
  backups: number;
}

/* Duolingo palette (face / edge) */
const DUO = {
  blue: "#1CB0F6",
  blueEdge: "#0F8ED9",
  green: "#58CC02",
  greenEdge: "#45A302",
  red: "#FF4B4B",
  redEdge: "#E63E3E",
  gold: "#FFC800",
  purple: "#CE82FF",
  orange: "#FF9600",
};

const ROLE_COLORS: Record<string, string> = {
  admin: DUO.red,
  moderator: DUO.blue,
  user: DUO.green,
};

const StatCard = ({
  label,
  value,
  icon: Icon,
  color,
  sub,
  children,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  sub?: string;
  children?: React.ReactNode;
}) => (
  <div className="duo-card p-4">
    <div className="flex items-center justify-between gap-2 mb-2">
      <p className="text-sm font-bold" style={{ color: "hsl(var(--duo-muted))" }}>{label}</p>
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}1e` }}
      >
        <Icon className="w-5 h-5" style={{ color }} strokeWidth={2.5} />
      </div>
    </div>
    <p className="text-3xl font-extrabold" style={{ color }}>{value}</p>
    {children}
    {sub && (
      <p className="text-xs font-semibold mt-1" style={{ color: "hsl(var(--duo-muted))" }}>{sub}</p>
    )}
  </div>
);

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-xs font-extrabold tracking-wider mb-2.5 px-1" style={{ color: "hsl(var(--duo-muted))" }}>
    {children}
  </p>
);

const tabTriggerClass =
  "duo-press h-11 px-4 rounded-2xl border-2 text-sm font-extrabold whitespace-nowrap " +
  "bg-[hsl(var(--duo-surface))] text-[hsl(var(--duo-muted))] border-[hsl(var(--duo-border))] shadow-[0_3px_0_hsl(var(--duo-edge))] " +
  "data-[state=active]:bg-[#1CB0F6] data-[state=active]:text-white data-[state=active]:border-[#1CB0F6] data-[state=active]:shadow-[0_3px_0_#0F8ED9]";

const Admin = () => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [challenges, setChallenges] = useState<UserProgress[]>([]);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<Statistics>({
    totalUsers: 0,
    activeUsers: 0,
    completionRate: 0,
    averageDays: 0,
    bestStreak: 0,
    adminCount: 0,
    moderatorCount: 0,
    userCount: 0,
  });
  const [databaseStats, setDatabaseStats] = useState<DatabaseStats>({
    profiles: 0,
    challengeProgress: 0,
    taskReminders: 0,
    userRoles: 0,
    backups: 0,
  });

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: isAdminData, error } = await supabase.rpc('is_admin');

      if (error) throw error;

      if (!isAdminData) {
        toast({
          title: t('admin.accessDenied'),
          description: t('admin.adminOnly'),
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsAdmin(true);
      await loadAllData();
    } catch (error) {
      console.error("Error checking admin status:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const loadAllData = async () => {
    await Promise.all([
      loadChallenges(),
      loadUsers(),
      loadStatistics(),
      loadDatabaseStats(),
    ]);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
    toast({
      title: t('admin.refreshed'),
      description: t('admin.dataRefreshed'),
    });
  };

  const loadChallenges = async () => {
    try {
      const { data, error } = await supabase
        .from("challenge_progress")
        .select(`
          *,
          profiles (
            username
          )
        `)
        .order("current_streak", { ascending: false });

      if (error) throw error;
      setChallenges(data || []);
    } catch (error) {
      console.error("Error loading challenges:", error);
      toast({
        title: t('admin.loadError'),
        variant: "destructive",
      });
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase.rpc('get_users_with_roles');

      if (error) throw error;

      const usersWithRoles: UserWithRole[] = (data || []).map((user: any) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        created_at: user.created_at,
        role: user.role,
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error loading users:", error);
      toast({
        title: t('admin.loadError'),
        variant: "destructive",
      });
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      // Delete existing role
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      // Insert new role
      const { error } = await supabase
        .from("user_roles")
        .insert([{ user_id: userId, role: newRole as "admin" | "moderator" | "user" }]);

      if (error) throw error;

      toast({
        title: t('admin.roleUpdated'),
        description: t('admin.roleUpdateSuccess'),
      });

      loadUsers();
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: t('admin.roleUpdateError'),
        variant: "destructive",
      });
    }
  };

  const loadStatistics = async () => {
    try {
      // Get all challenges
      const { data: allChallenges, error: challengesError } = await supabase
        .from("challenge_progress")
        .select("*");

      if (challengesError) throw challengesError;

      // Get all users with roles
      const { data: allUsers, error: usersError } = await supabase.rpc('get_users_with_roles');

      if (usersError) throw usersError;

      const totalUsers = allUsers?.length || 0;
      const activeUsers = allChallenges?.filter(c => c.is_active).length || 0;

      // Calculate completion rate (users who completed all stages)
      const completedUsers = allChallenges?.filter(c => c.stage_level >= 3 && c.current_day > 75).length || 0;
      const completionRate = totalUsers > 0 ? (completedUsers / totalUsers) * 100 : 0;

      // Calculate average days completed
      const totalDays = allChallenges?.reduce((sum, c) => sum + c.current_day, 0) || 0;
      const averageDays = allChallenges && allChallenges.length > 0
        ? totalDays / allChallenges.length
        : 0;

      // Find best streak
      const bestStreak = allChallenges?.reduce((max, c) =>
        Math.max(max, c.best_streak), 0) || 0;

      // Count users by role
      const adminCount = allUsers?.filter((u: any) => u.role === 'admin').length || 0;
      const moderatorCount = allUsers?.filter((u: any) => u.role === 'moderator').length || 0;
      const userCount = allUsers?.filter((u: any) => !u.role || u.role === 'user').length || 0;

      setStatistics({
        totalUsers,
        activeUsers,
        completionRate,
        averageDays: Math.round(averageDays),
        bestStreak,
        adminCount,
        moderatorCount,
        userCount,
      });
    } catch (error) {
      console.error("Error loading statistics:", error);
    }
  };

  const loadDatabaseStats = async () => {
    try {
      // Get counts from all tables
      const [profilesRes, challengesRes, remindersRes, rolesRes, backupsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('challenge_progress').select('id', { count: 'exact', head: true }),
        supabase.from('task_reminders').select('id', { count: 'exact', head: true }),
        supabase.from('user_roles').select('id', { count: 'exact', head: true }),
        supabase.from('backups').select('id', { count: 'exact', head: true }),
      ]);

      setDatabaseStats({
        profiles: profilesRes.count || 0,
        challengeProgress: challengesRes.count || 0,
        taskReminders: remindersRes.count || 0,
        userRoles: rolesRes.count || 0,
        backups: backupsRes.count || 0,
      });
    } catch (error) {
      console.error("Error loading database stats:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase
        .from("challenge_progress")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;

      toast({
        title: t('admin.deleteSuccess'),
        description: t('admin.challengeDeleted'),
      });

      loadChallenges();
      loadStatistics();
      setDeleteId(null);
    } catch (error) {
      console.error("Error deleting challenge:", error);
      toast({
        title: t('admin.deleteError'),
        variant: "destructive",
      });
    }
  };

  const totalRecords = databaseStats.profiles + databaseStats.challengeProgress +
    databaseStats.taskReminders +
    databaseStats.userRoles + databaseStats.backups;

  const dbTiles: { name: string; icon: LucideIcon; color: string; count: number }[] = [
    { name: "profiles", icon: Users, color: DUO.blue, count: databaseStats.profiles },
    { name: "challenge_progress", icon: Calendar, color: DUO.green, count: databaseStats.challengeProgress },
    { name: "task_reminders", icon: Calendar, color: DUO.orange, count: databaseStats.taskReminders },
    { name: "user_roles", icon: Shield, color: DUO.red, count: databaseStats.userRoles },
    { name: "backups", icon: FileText, color: DUO.gold, count: databaseStats.backups },
  ];

  const roleTiles: { key: string; icon: LucideIcon; color: string; count: number }[] = [
    { key: "admin", icon: Shield, color: DUO.red, count: statistics.adminCount },
    { key: "moderator", icon: Users, color: DUO.blue, count: statistics.moderatorCount },
    { key: "user", icon: Users, color: DUO.green, count: statistics.userCount },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="duo-page min-h-screen bg-background pb-24" dir={isRTL ? "rtl" : "ltr"}>
      <div className="max-w-7xl mx-auto px-4 pt-5 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate(-1)}
            className="duo-card duo-press w-11 h-11 flex items-center justify-center"
            style={{ borderRadius: "1rem" }}
          >
            {isRTL ? (
              <ChevronRight className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />
            ) : (
              <ChevronLeft className="w-6 h-6" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />
            )}
          </button>
          <h1 className="text-2xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
            {t('admin.title')}
          </h1>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label={t('admin.refresh')}
            className="duo-card duo-press w-11 h-11 flex items-center justify-center disabled:opacity-50"
            style={{ borderRadius: "1rem" }}
          >
            <RefreshCw
              className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`}
              style={{ color: "hsl(var(--duo-text))" }}
              strokeWidth={2.5}
            />
          </button>
        </div>

        {/* Quick Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label={t('admin.stats.totalUsers')}
            value={statistics.totalUsers}
            icon={Users}
            color={DUO.blue}
          />
          <StatCard
            label={t('admin.stats.activeUsers')}
            value={statistics.activeUsers}
            icon={UserCheck}
            color={DUO.green}
          />
          <StatCard
            label={t('admin.database.totalRecords')}
            value={totalRecords}
            icon={Database}
            color={DUO.purple}
          />
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <div className="overflow-x-auto -mx-4 px-4 pb-1">
            <TabsList className="flex w-max min-w-full h-auto items-center justify-start gap-2.5 rounded-none bg-transparent p-0">
              <TabsTrigger value="overview" className={tabTriggerClass}>{t('admin.tabs.overview')}</TabsTrigger>
              <TabsTrigger value="database" className={tabTriggerClass}>{t('admin.tabs.database')}</TabsTrigger>
              <TabsTrigger value="challenges" className={tabTriggerClass}>{t('admin.manageChallenges')}</TabsTrigger>
              <TabsTrigger value="users" className={tabTriggerClass}>{t('admin.manageUsers')}</TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-4 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                label={t('admin.stats.completionRate')}
                value={`${statistics.completionRate.toFixed(1)}%`}
                icon={TrendingUp}
                color={DUO.blue}
                sub={t('admin.stats.completed75Days')}
              >
                <Progress value={statistics.completionRate} className="mt-2 h-3 bg-muted" />
              </StatCard>

              <StatCard
                label={t('admin.stats.bestStreak')}
                value={statistics.bestStreak}
                icon={Award}
                color={DUO.orange}
                sub={t('admin.stats.longestStreak')}
              />

              <StatCard
                label={t('admin.stats.averageDays')}
                value={statistics.averageDays}
                icon={BarChart3}
                color={DUO.purple}
                sub={t('admin.stats.avgDaysCompleted')}
              />

              <StatCard
                label={t('admin.stats.admins')}
                value={statistics.adminCount}
                icon={Shield}
                color={DUO.red}
                sub={t('admin.roles.admin')}
              />
            </div>

            {/* Roles Distribution */}
            <div className="duo-card p-5">
              <h2 className="text-lg font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
                {t('admin.rolesDistribution')}
              </h2>
              <p className="text-sm font-semibold mb-4" style={{ color: "hsl(var(--duo-muted))" }}>
                {t('admin.rolesDistributionDesc')}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {roleTiles.map((role) => {
                  const Icon = role.icon;
                  return (
                    <div
                      key={role.key}
                      className="flex items-center gap-4 p-4 rounded-2xl"
                      style={{ background: `${role.color}1e` }}
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: role.color }}
                      >
                        <Icon className="w-6 h-6 text-white" strokeWidth={2.5} />
                      </div>
                      <div>
                        <p className="text-2xl font-extrabold" style={{ color: role.color }}>{role.count}</p>
                        <p className="text-sm font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
                          {t(`admin.roles.${role.key}`)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* Database Tab */}
          <TabsContent value="database" className="mt-4 space-y-5">
            <div>
              <SectionLabel>{t('admin.database.title')}</SectionLabel>
              <p className="text-xs font-semibold mb-2.5 px-1" style={{ color: "hsl(var(--duo-muted))" }}>
                {t('admin.database.description')}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {dbTiles.map((tile) => {
                  const Icon = tile.icon;
                  return (
                    <div key={tile.name} className="duo-card p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: `${tile.color}1e` }}
                        >
                          <Icon className="w-5 h-5" style={{ color: tile.color }} strokeWidth={2.5} />
                        </div>
                        <span className="font-bold" style={{ color: "hsl(var(--duo-text))" }}>{tile.name}</span>
                      </div>
                      <p className="text-3xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>{tile.count}</p>
                      <p className="text-xs font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
                        {t('admin.database.records')}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

          </TabsContent>

          {/* Challenges Tab */}
          <TabsContent value="challenges" className="mt-4">
            <SectionLabel>{t('admin.manageChallenges')}</SectionLabel>
            <p className="text-xs font-semibold mb-2.5 px-1" style={{ color: "hsl(var(--duo-muted))" }}>
              {t('admin.challengesDescription')}
            </p>
            <div className="duo-card overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-start whitespace-nowrap text-xs font-extrabold tracking-wider" style={{ color: "hsl(var(--duo-muted))" }}>{t('leaderboard.username')}</TableHead>
                      <TableHead className="text-start whitespace-nowrap text-xs font-extrabold tracking-wider" style={{ color: "hsl(var(--duo-muted))" }}>{t('admin.currentDay')}</TableHead>
                      <TableHead className="text-start whitespace-nowrap text-xs font-extrabold tracking-wider" style={{ color: "hsl(var(--duo-muted))" }}>{t('leaderboard.currentStreak')}</TableHead>
                      <TableHead className="text-start whitespace-nowrap text-xs font-extrabold tracking-wider" style={{ color: "hsl(var(--duo-muted))" }}>{t('leaderboard.bestStreak')}</TableHead>
                      <TableHead className="text-start whitespace-nowrap text-xs font-extrabold tracking-wider" style={{ color: "hsl(var(--duo-muted))" }}>{t('admin.status')}</TableHead>
                      <TableHead className="text-start whitespace-nowrap text-xs font-extrabold tracking-wider" style={{ color: "hsl(var(--duo-muted))" }}>{t('admin.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {challenges.map((challenge) => (
                      <TableRow key={challenge.id}>
                        <TableCell className="font-bold whitespace-nowrap" style={{ color: "hsl(var(--duo-text))" }}>
                          {challenge.profiles?.username || 'Unknown'}
                        </TableCell>
                        <TableCell className="font-semibold" style={{ color: "hsl(var(--duo-text))" }}>{challenge.current_day}</TableCell>
                        <TableCell className="font-semibold" style={{ color: "hsl(var(--duo-text))" }}>{challenge.current_streak}</TableCell>
                        <TableCell className="font-semibold" style={{ color: "hsl(var(--duo-text))" }}>{challenge.best_streak}</TableCell>
                        <TableCell>
                          {challenge.is_active ? (
                            <span
                              className="px-2.5 py-1 rounded-full text-xs font-extrabold text-white whitespace-nowrap"
                              style={{ background: DUO.green }}
                            >
                              {t('admin.active')}
                            </span>
                          ) : (
                            <span
                              className="px-2.5 py-1 rounded-full text-xs font-extrabold whitespace-nowrap"
                              style={{
                                background: "hsl(var(--duo-surface))",
                                border: "2px solid hsl(var(--duo-border))",
                                color: "hsl(var(--duo-muted))",
                              }}
                            >
                              {t('admin.inactive')}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => setDeleteId(challenge.id)}
                            className="duo-press h-9 px-3.5 rounded-xl inline-flex items-center gap-1.5 text-sm font-extrabold text-white whitespace-nowrap"
                            style={{ background: DUO.red, boxShadow: `0 3px 0 ${DUO.redEdge}` }}
                          >
                            <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                            {t('admin.delete')}
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="mt-4">
            <SectionLabel>{t('admin.manageUsers')}</SectionLabel>
            <p className="text-xs font-semibold mb-2.5 px-1" style={{ color: "hsl(var(--duo-muted))" }}>
              {t('admin.usersDescription')}
            </p>
            <div className="duo-card overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-start whitespace-nowrap text-xs font-extrabold tracking-wider" style={{ color: "hsl(var(--duo-muted))" }}>{t('admin.username')}</TableHead>
                      <TableHead className="text-start whitespace-nowrap text-xs font-extrabold tracking-wider" style={{ color: "hsl(var(--duo-muted))" }}>{t('admin.email')}</TableHead>
                      <TableHead className="text-start whitespace-nowrap text-xs font-extrabold tracking-wider" style={{ color: "hsl(var(--duo-muted))" }}>{t('admin.role')}</TableHead>
                      <TableHead className="text-start whitespace-nowrap text-xs font-extrabold tracking-wider" style={{ color: "hsl(var(--duo-muted))" }}>{t('admin.joinedDate')}</TableHead>
                      <TableHead className="text-start whitespace-nowrap text-xs font-extrabold tracking-wider" style={{ color: "hsl(var(--duo-muted))" }}>{t('admin.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => {
                      const roleKey = user.role || 'user';
                      const roleColor = ROLE_COLORS[roleKey] || DUO.green;
                      return (
                        <TableRow key={user.id}>
                          <TableCell className="font-bold whitespace-nowrap" style={{ color: "hsl(var(--duo-text))" }}>{user.username}</TableCell>
                          <TableCell className="font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>{user.email}</TableCell>
                          <TableCell>
                            <span
                              className="px-2.5 py-1 rounded-full text-xs font-extrabold whitespace-nowrap"
                              style={{ background: `${roleColor}1e`, color: roleColor }}
                            >
                              {t(`admin.roles.${roleKey}`)}
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold whitespace-nowrap" style={{ color: "hsl(var(--duo-muted))" }}>
                            {new Date(user.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={user.role || 'user'}
                              onValueChange={(value) => handleRoleChange(user.id, value)}
                            >
                              <SelectTrigger className="w-[140px] h-10 rounded-xl border-2 font-bold bg-[hsl(var(--duo-surface))] border-[hsl(var(--duo-border))] text-[hsl(var(--duo-text))] shadow-[0_3px_0_hsl(var(--duo-edge))]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">
                                  {t('admin.roles.user')}
                                </SelectItem>
                                <SelectItem value="moderator">
                                  {t('admin.roles.moderator')}
                                </SelectItem>
                                <SelectItem value="admin">
                                  {t('admin.roles.admin')}
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('admin.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('admin.confirmDeleteDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('admin.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {t('admin.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Admin;
