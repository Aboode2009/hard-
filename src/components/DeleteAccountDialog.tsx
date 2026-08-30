import { useState } from "react";
import { bi } from "@/i18n/bi";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { clerkAuth } from "@/lib/clerk-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2, AlertTriangle } from "lucide-react";

export const DeleteAccountDialog = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const navigate = useNavigate();
  const { toast } = useToast();
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);

  const requiredText = bi("حذف حسابي", "DELETE");

  const handleDelete = async () => {
    if (confirmText !== requiredText) return;

    setLoading(true);
    try {
      const { data: { session } } = await clerkAuth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Call edge function to properly delete the account (including auth.users)
      const { data, error } = await supabase.functions.invoke("delete-account", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        throw new Error(error.message || "Failed to delete account");
      }

      if (!data?.success) {
        throw new Error(data?.error || "Failed to delete account");
      }

      // Sign out locally
      await clerkAuth.signOut();

      toast({
        title: bi("تم حذف الحساب", "Account Deleted"),
        description: bi("تم حذف جميع بياناتك بنجاح", "All your data has been deleted successfully"),
      });

      navigate("/auth");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast({
        variant: "destructive",
        title: bi("خطأ", "Error"),
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" className="w-full">
          <Trash2 className="w-4 h-4 mr-2" />
          {bi("حذف الحساب", "Delete Account")}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            {bi("حذف الحساب نهائياً", "Delete Account Permanently")}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              {bi("هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع بياناتك بما في ذلك:", "This action cannot be undone. All your data will be deleted including:")}
            </p>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>{bi("تقدمك في التحدي", "Challenge progress")}</li>
              <li>{bi("المهام المخصصة", "Custom tasks")}</li>
              <li>{bi("التذكيرات", "Reminders")}</li>
              <li>{bi("جميع الإحصائيات", "All statistics")}</li>
            </ul>
            <div className="pt-4 space-y-2">
              <Label>
                {isArabic 
                  ? `اكتب "${requiredText}" للتأكيد`
                  : `Type "${requiredText}" to confirm`}
              </Label>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={requiredText}
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            {bi("إلغاء", "Cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={confirmText !== requiredText || loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? "..." : (bi("حذف نهائياً", "Delete Forever"))}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
