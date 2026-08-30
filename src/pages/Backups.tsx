import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { clerkAuth } from "@/lib/clerk-auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Download, RefreshCw, Trash2, Database, Calendar, HardDrive } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Navbar } from "@/components/Navbar";

interface BackupMetadata {
  total_profiles: number;
  total_challenge_progress: number;
  total_reminders: number;
  total_roles: number;
}

interface BackupData {
  metadata?: BackupMetadata;
}

interface Backup {
  id: string;
  created_at: string;
  backup_type: string;
  file_size_bytes: number | null;
  backup_data: BackupData;
}

const Backups = () => {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAndFetchBackups();
  }, []);

  const checkAdminAndFetchBackups = async () => {
    try {
      const { data: { user } } = await clerkAuth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: adminCheck } = await supabase.rpc('is_admin');
      
      if (!adminCheck) {
        toast({
          title: "غير مصرح",
          description: "هذه الصفحة للأدمن فقط",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      setIsAdmin(true);
      await fetchBackups();
    } catch (error) {
      console.error('Error checking admin:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBackups = async () => {
    const { data, error } = await supabase
      .from('backups')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching backups:', error);
      toast({
        title: "خطأ",
        description: "فشل في جلب النسخ الاحتياطية",
        variant: "destructive",
      });
      return;
    }

    setBackups((data || []) as Backup[]);
  };

  const createBackup = async () => {
    setCreating(true);
    try {
      const { data: { session } } = await clerkAuth.getSession();
      
      const response = await supabase.functions.invoke('create-backup', {
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "تم بنجاح",
        description: "تم إنشاء نسخة احتياطية جديدة",
      });

      await fetchBackups();
    } catch (error: any) {
      console.error('Error creating backup:', error);
      toast({
        title: "خطأ",
        description: error.message || "فشل في إنشاء النسخة الاحتياطية",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const downloadBackup = (backup: Backup) => {
    const dataStr = JSON.stringify(backup.backup_data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_${format(new Date(backup.created_at), 'yyyy-MM-dd_HH-mm')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "تم التحميل",
      description: "تم تحميل النسخة الاحتياطية بنجاح",
    });
  };

  const deleteBackup = async (backupId: string) => {
    const confirmed = window.confirm('هل أنت متأكد من حذف هذه النسخة الاحتياطية؟');
    if (!confirmed) return;

    const { error } = await supabase
      .from('backups')
      .delete()
      .eq('id', backupId);

    if (error) {
      toast({
        title: "خطأ",
        description: "فشل في حذف النسخة الاحتياطية",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "تم الحذف",
      description: "تم حذف النسخة الاحتياطية",
    });

    await fetchBackups();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const statTiles = (backup: Backup) => [
    { value: backup.backup_data?.metadata?.total_profiles || 0, label: "مستخدم", color: "#1CB0F6" },
    { value: backup.backup_data?.metadata?.total_challenge_progress || 0, label: "تقدم", color: "#58CC02" },
    { value: backup.backup_data?.metadata?.total_reminders || 0, label: "تذكير", color: "#FFC800" },
    { value: backup.backup_data?.metadata?.total_roles || 0, label: "دور", color: "#FF9600" },
  ];

  return (
    <div className="duo-page min-h-screen bg-background pb-24" dir="rtl">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>النسخ الاحتياطية</h1>
            <p className="mt-1 font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>إدارة النسخ الاحتياطية لقاعدة البيانات</p>
          </div>
          <Button
            onClick={createBackup}
            disabled={creating}
            className="duo-press rounded-2xl font-extrabold text-white"
            style={{ background: "#1CB0F6", boxShadow: "0 4px 0 #0F8ED9" }}
          >
            {creating ? (
              <RefreshCw className="h-4 w-4 ml-2 animate-spin" strokeWidth={2.5} />
            ) : (
              <Database className="h-4 w-4 ml-2" strokeWidth={2.5} />
            )}
            {creating ? "جاري الإنشاء..." : "إنشاء نسخة احتياطية"}
          </Button>
        </div>

        {backups.length === 0 ? (
          <div className="duo-card flex flex-col items-center justify-center py-12 px-6">
            <Database className="h-12 w-12 mb-4" style={{ color: "hsl(var(--duo-muted))" }} strokeWidth={2.5} />
            <p className="font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>لا توجد نسخ احتياطية بعد</p>
            <Button
              onClick={createBackup}
              className="mt-4 duo-press rounded-2xl font-extrabold text-white"
              style={{ background: "#1CB0F6", boxShadow: "0 4px 0 #0F8ED9" }}
              disabled={creating}
            >
              إنشاء أول نسخة احتياطية
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {backups.map((backup) => (
              <div key={backup.id} className="duo-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "#1CB0F61e" }}
                    >
                      <Calendar className="h-5 w-5" style={{ color: "#1CB0F6" }} strokeWidth={2.5} />
                    </div>
                    <h3 className="text-lg font-extrabold" style={{ color: "hsl(var(--duo-text))" }}>
                      {format(new Date(backup.created_at), 'dd MMMM yyyy - HH:mm', { locale: ar })}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => downloadBackup(backup)}
                      className="duo-press rounded-xl font-extrabold border-2"
                      style={{
                        background: "hsl(var(--duo-surface))",
                        borderColor: "hsl(var(--duo-border))",
                        boxShadow: "0 3px 0 hsl(var(--duo-edge))",
                        color: "hsl(var(--duo-text))",
                      }}
                    >
                      <Download className="h-4 w-4 ml-1" strokeWidth={2.5} />
                      تحميل
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => deleteBackup(backup.id)}
                      className="duo-press rounded-xl font-extrabold text-white"
                      style={{ background: "#FF4B4B", boxShadow: "0 3px 0 #E63E3E" }}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={2.5} />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm font-semibold" style={{ color: "hsl(var(--duo-muted))" }}>
                  <span className="flex items-center gap-1">
                    <HardDrive className="h-3 w-3" strokeWidth={2.5} />
                    {formatFileSize(backup.file_size_bytes || 0)}
                  </span>
                  <span>النوع: {backup.backup_type === 'full' ? 'كامل' : backup.backup_type}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mt-4">
                  {statTiles(backup).map((tile) => (
                    <div
                      key={tile.label}
                      className="rounded-xl p-3 text-center"
                      style={{ background: `${tile.color}1e` }}
                    >
                      <p className="text-2xl font-extrabold" style={{ color: tile.color }}>{tile.value}</p>
                      <p className="font-bold" style={{ color: "hsl(var(--duo-muted))" }}>{tile.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="duo-card mt-8 p-5">
          <h3 className="text-lg font-extrabold mb-3" style={{ color: "hsl(var(--duo-text))" }}>معلومات النسخ الاحتياطي</h3>
          <div className="text-sm font-semibold space-y-2" style={{ color: "hsl(var(--duo-muted))" }}>
            <p>• يتم إنشاء نسخة احتياطية تلقائية يومياً</p>
            <p>• يتم الاحتفاظ بآخر 30 نسخة احتياطية</p>
            <p>• الكود محفوظ تلقائياً في GitHub</p>
            <p>• يمكنك تحميل أي نسخة كملف JSON</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Backups;
