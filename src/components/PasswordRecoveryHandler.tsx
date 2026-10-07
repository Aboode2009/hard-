import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { bi } from "@/i18n/bi";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Handles the "reset password" email link.
 *
 * resetPasswordForEmail() sends the user back to this web origin with a
 * recovery token. supabase-js signs them in from the URL and emits
 * PASSWORD_RECOVERY — without this component they simply landed in the app
 * signed in and were never asked for a new password.
 *
 * The event can fire while the client initialises, before any React effect
 * has subscribed, so it is captured at module load: both from the URL itself
 * and from a listener registered as soon as this module is imported.
 */
let recoveryPending =
  typeof window !== "undefined" &&
  /(^|[#&?])type=recovery(&|$)/.test(window.location.hash + "&" + window.location.search.slice(1));
const listeners = new Set<() => void>();

supabase.auth.onAuthStateChange((event) => {
  if (event === "PASSWORD_RECOVERY") {
    recoveryPending = true;
    listeners.forEach((fn) => fn());
  }
});

export function PasswordRecoveryHandler() {
  const [open, setOpen] = useState(recoveryPending);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const show = () => setOpen(true);
    listeners.add(show);
    if (recoveryPending) show();
    return () => {
      listeners.delete(show);
    };
  }, []);

  const close = () => {
    recoveryPending = false;
    setOpen(false);
    setPassword("");
    setConfirm("");
  };

  const save = async () => {
    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: bi("كلمة المرور قصيرة", "Password too short"),
        description: bi("استخدم 6 أحرف على الأقل.", "Use at least 6 characters."),
      });
      return;
    }
    if (password !== confirm) {
      toast({
        variant: "destructive",
        title: bi("كلمتا المرور غير متطابقتين", "Passwords don't match"),
      });
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);

    if (error) {
      toast({
        variant: "destructive",
        title: bi("تعذّر تغيير كلمة المرور", "Couldn't change the password"),
        description: error.message,
      });
      return;
    }

    toast({
      title: bi("تم تغيير كلمة المرور", "Password changed"),
      description: bi("يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة.", "You can now sign in with your new password."),
    });
    close();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{bi("تعيين كلمة مرور جديدة", "Set a new password")}</DialogTitle>
          <DialogDescription>
            {bi("اكتب كلمة المرور الجديدة لحسابك.", "Enter the new password for your account.")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="recovery-password">{bi("كلمة المرور الجديدة", "New password")}</Label>
            <Input
              id="recovery-password"
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="recovery-confirm">{bi("تأكيد كلمة المرور", "Confirm password")}</Label>
            <Input
              id="recovery-confirm"
              type="password"
              autoComplete="new-password"
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>
          <Button className="w-full" onClick={save} disabled={saving}>
            {saving ? bi("جارٍ الحفظ…", "Saving…") : bi("حفظ", "Save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
