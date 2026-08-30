import { useState } from "react";
import { bi } from "@/i18n/bi";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { KeyRound, Mail, Check, Lock, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { z } from "zod";

// Strong password validation schema
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const validatePassword = (password: string, isArabic: boolean): string | null => {
  const result = passwordSchema.safeParse(password);
  if (!result.success) {
    const error = result.error.errors[0];
    if (isArabic) {
      if (error.message.includes('8 characters')) {
        return 'يجب أن تكون كلمة المرور 8 أحرف على الأقل';
      }
      if (error.message.includes('uppercase')) {
        return 'يجب أن تحتوي كلمة المرور على حرف كبير واحد على الأقل';
      }
      if (error.message.includes('number')) {
        return 'يجب أن تحتوي كلمة المرور على رقم واحد على الأقل';
      }
    }
    return error.message;
  }
  return null;
};

interface PasswordResetDialogProps {
  trigger?: React.ReactNode;
}

type Step = "email" | "otp" | "newPassword" | "success";

export const PasswordResetDialog = ({ trigger }: PasswordResetDialogProps) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<Step>("email");
  const [open, setOpen] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  const handleNewPasswordChange = (value: string) => {
    setNewPassword(value);
    setPasswordError(validatePassword(value, isArabic));
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { email, action: 'send' }
      });

      if (error) throw error;

      setStep("otp");
      toast({
        title: bi("تم الإرسال", "Code Sent"),
        description: bi("تم إرسال رمز التحقق إلى بريدك الإلكتروني", "Verification code has been sent to your email"),
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: bi("خطأ", "Error"),
        description: error.message || (bi("فشل في إرسال الرمز", "Failed to send code")),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { email, action: 'send' }
      });

      if (error) throw error;

      toast({
        title: bi("تم إعادة الإرسال", "Code Resent"),
        description: bi("تم إرسال رمز جديد إلى بريدك الإلكتروني", "A new code has been sent to your email"),
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: bi("خطأ", "Error"),
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { email, action: 'verify', otp }
      });

      if (error) throw error;

      if (!data.valid) {
        throw new Error(bi("الرمز غير صحيح أو منتهي الصلاحية", "Invalid or expired code"));
      }

      // Store the reset token for password update
      if (data.resetToken) {
        setResetToken(data.resetToken);
      }

      setStep("newPassword");
      toast({
        title: bi("تم التحقق", "Verified"),
        description: bi("تم التحقق من الرمز بنجاح", "Code verified successfully"),
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: bi("خطأ", "Error"),
        description: bi("الرمز غير صحيح أو منتهي الصلاحية", "Invalid or expired code"),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password strength
    const validationError = validatePassword(newPassword, isArabic);
    if (validationError) {
      setPasswordError(validationError);
      toast({
        variant: "destructive",
        title: bi("خطأ", "Error"),
        description: validationError,
      });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: bi("خطأ", "Error"),
        description: bi("كلمتا المرور غير متطابقتين", "Passwords do not match"),
      });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-otp', {
        body: { email, action: 'reset-password', newPassword, resetToken }
      });

      if (error) throw error;

      setStep("success");
      toast({
        title: bi("تم التحديث", "Password Updated"),
        description: bi("تم تحديث كلمة المرور بنجاح، يرجى تسجيل الدخول", "Your password has been updated. Please log in."),
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: bi("خطأ", "Error"),
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setStep("email");
      setEmail("");
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError(null);
      setResetToken(null);
    }
  };

  const getStepDescription = () => {
    switch (step) {
      case "email":
        return bi("أدخل بريدك الإلكتروني وسنرسل لك رمز التحقق", "Enter your email and we'll send you a verification code");
      case "otp":
        return bi("أدخل رمز التحقق المكون من 6 أرقام المرسل إلى بريدك", "Enter the 6-digit code sent to your email");
      case "newPassword":
        return bi("أدخل كلمة المرور الجديدة", "Enter your new password");
      default:
        return "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {bi("نسيت كلمة المرور؟", "Forgot password?")}
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-primary" />
            {bi("استعادة كلمة المرور", "Reset Password")}
          </DialogTitle>
          <DialogDescription>
            {getStepDescription()}
          </DialogDescription>
        </DialogHeader>

        {step === "email" && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {bi("البريد الإلكتروني", "Email")}
              </Label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={bi("أدخل بريدك الإلكتروني", "Enter your email")}
                className="h-11"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading 
                ? "..." 
                : (bi("إرسال رمز التحقق", "Send Verification Code"))}
            </Button>
          </form>
        )}

        {step === "otp" && (
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                {bi("رمز التحقق (6 أرقام)", "Verification Code (6 digits)")}
              </Label>
              <div className="flex justify-center" dir="ltr">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                {isArabic ? `تم إرسال الرمز إلى ${email}` : `Code sent to ${email}`}
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setStep("email")}
                className="flex-1"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                {bi("رجوع", "Back")}
              </Button>
              <Button type="submit" className="flex-1" disabled={loading || otp.length !== 6}>
                {loading ? "..." : (bi("تحقق", "Verify"))}
              </Button>
            </div>
            <Button 
              type="button" 
              variant="ghost" 
              onClick={handleResendOtp}
              disabled={loading}
              className="w-full text-sm"
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              {bi("إعادة إرسال الرمز", "Resend Code")}
            </Button>
          </form>
        )}

        {step === "newPassword" && (
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                {bi("كلمة المرور الجديدة", "New Password")}
              </Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => handleNewPasswordChange(e.target.value)}
                required
                placeholder={bi("أدخل كلمة المرور الجديدة", "Enter new password")}
                className={`h-11 ${passwordError ? 'border-destructive' : ''}`}
              />
              {passwordError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {passwordError}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {bi("يجب أن تكون 8 أحرف على الأقل، مع حرف كبير ورقم", "Must be 8+ characters with uppercase and number")}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="flex items-center gap-2">
                <Lock className="w-4 h-4" />
                {bi("تأكيد كلمة المرور", "Confirm Password")}
              </Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder={bi("أعد إدخال كلمة المرور", "Re-enter password")}
                className="h-11"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "..." : (bi("تحديث كلمة المرور", "Update Password"))}
            </Button>
          </form>
        )}

        {step === "success" && (
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <p className="text-center text-muted-foreground">
              {bi("تم تحديث كلمة المرور بنجاح، يمكنك الآن تسجيل الدخول", "Password updated successfully. You can now log in.")}
            </p>
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              {bi("إغلاق", "Close")}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
