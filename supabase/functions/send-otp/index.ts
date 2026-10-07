import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-forwarded-for, x-real-ip",
};

// Generate a 6-digit OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// In-memory store for IP-based rate limiting (resets on function restart)
// For production, consider using Redis or a database table
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();
const GLOBAL_RATE_LIMIT = 100; // Max 100 OTP requests per hour globally
let globalRequestCount = 0;
let globalResetTime = Date.now() + 3600000;

// Get client IP from headers
function getClientIP(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
         req.headers.get("x-real-ip") || 
         "unknown";
}

// Check IP-based rate limit (max 5 requests per IP per hour)
function checkIPRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = ipRequestCounts.get(ip);
  
  if (!record || now > record.resetTime) {
    ipRequestCounts.set(ip, { count: 1, resetTime: now + 3600000 });
    return true;
  }
  
  if (record.count >= 5) {
    return false;
  }
  
  record.count++;
  return true;
}

// Check global rate limit
function checkGlobalRateLimit(): boolean {
  const now = Date.now();
  
  if (now > globalResetTime) {
    globalRequestCount = 1;
    globalResetTime = now + 3600000;
    return true;
  }
  
  if (globalRequestCount >= GLOBAL_RATE_LIMIT) {
    return false;
  }
  
  globalRequestCount++;
  return true;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { email, action, otp, newPassword, resetToken } = requestBody;
    
    console.log(`Processing ${action} request for email: ${email}`);

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "send") {
      // IP-based rate limiting
      const clientIP = getClientIP(req);
      console.log(`OTP request from IP: ${clientIP}`);
      
      if (!checkIPRateLimit(clientIP)) {
        console.log(`IP rate limit exceeded for: ${clientIP}`);
        return new Response(
          JSON.stringify({ error: "Too many requests from this location. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Global rate limiting to prevent exhausting email quota
      if (!checkGlobalRateLimit()) {
        console.log("Global rate limit exceeded");
        return new Response(
          JSON.stringify({ error: "Service is temporarily busy. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Email-based rate limiting: max 3 OTP requests per email per hour
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      const { count: recentRequestCount } = await supabase
        .from("password_reset_otps")
        .select("*", { count: "exact", head: true })
        .eq("email", email)
        .gte("created_at", oneHourAgo);

      if (recentRequestCount && recentRequestCount >= 3) {
        console.log(`Email rate limit exceeded for: ${email}`);
        return new Response(
          JSON.stringify({ error: "Too many requests for this email. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate OTP
      const otpCode = generateOTP();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

      // Check if user exists
      const { data: authUser } = await supabase.auth.admin.listUsers();
      const userExists = authUser?.users?.some(u => u.email === email);

      if (!userExists) {
        console.log(`User with email ${email} not found`);
        // Return success anyway to prevent email enumeration attacks
        return new Response(
          JSON.stringify({ success: true, message: "If the email exists, OTP has been sent" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Invalidate any existing OTPs for this email
      await supabase
        .from("password_reset_otps")
        .update({ used: true })
        .eq("email", email)
        .eq("used", false);

      // Store new OTP
      const { error: insertError } = await supabase
        .from("password_reset_otps")
        .insert({
          email,
          otp_code: otpCode,
          expires_at: expiresAt.toISOString(),
        });

      if (insertError) {
        console.error("Error storing OTP:", insertError);
        throw new Error("Failed to generate OTP");
      }

      // Send email with OTP using Resend API directly
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Hard 21 <onboarding@resend.dev>",
          to: [email],
          subject: "رمز التحقق - Password Reset Code",
          html: `
            <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #333; text-align: center;">Hard 21</h1>
              <h2 style="color: #666; text-align: center;">رمز استعادة كلمة المرور</h2>
              <div style="background: #f5f5f5; border-radius: 10px; padding: 30px; text-align: center; margin: 20px 0;">
                <p style="font-size: 16px; color: #666; margin-bottom: 20px;">رمز التحقق الخاص بك هو:</p>
                <div style="background: #333; color: #fff; font-size: 32px; font-weight: bold; letter-spacing: 8px; padding: 20px 40px; border-radius: 8px; display: inline-block;">
                  ${otpCode}
                </div>
                <p style="font-size: 14px; color: #999; margin-top: 20px;">هذا الرمز صالح لمدة 10 دقائق فقط</p>
              </div>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="font-size: 12px; color: #999; text-align: center;">
                إذا لم تطلب استعادة كلمة المرور، يمكنك تجاهل هذا البريد
              </p>
            </div>
          `,
        }),
      });

      const emailResult = await emailResponse.json();
      console.log("Email sent:", emailResult);

      if (!emailResponse.ok) {
        console.error("Failed to send email:", emailResult);
        // Check if it's a Resend domain validation error
        if (emailResult.message && emailResult.message.includes("testing emails")) {
          throw new Error("Resend في وضع الاختبار - يمكن إرسال الإيميل فقط لـ barraaa2234barra@gmail.com حالياً");
        }
        throw new Error(emailResult.message || "فشل في إرسال رمز التحقق");
      }

      return new Response(
        JSON.stringify({ success: true, message: "OTP sent successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "verify") {
      if (!otp) {
        return new Response(
          JSON.stringify({ error: "OTP is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Find valid OTP
      const { data: otpRecord, error: selectError } = await supabase
        .from("password_reset_otps")
        .select("*")
        .eq("email", email)
        .eq("otp_code", otp)
        .eq("used", false)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (selectError || !otpRecord) {
        console.log("Invalid or expired OTP");
        return new Response(
          JSON.stringify({ error: "Invalid or expired OTP", valid: false }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Generate secure reset token
      const secureResetToken = crypto.randomUUID();

      // Mark OTP as used and store reset token
      const { error: updateError } = await supabase
        .from("password_reset_otps")
        .update({ 
          used: true,
          reset_token: secureResetToken
        })
        .eq("id", otpRecord.id);

      if (updateError) {
        console.error("Error updating OTP record:", updateError);
        throw new Error("Failed to verify OTP");
      }

      console.log("OTP verified successfully, reset token generated");

      return new Response(
        JSON.stringify({ 
          success: true, 
          valid: true, 
          message: "OTP verified",
          resetToken: secureResetToken  // Return token to client for password reset
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "reset-password") {
      if (!newPassword) {
        return new Response(
          JSON.stringify({ error: "New password is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // SECURITY: Require reset token to prove OTP was verified
      if (!resetToken) {
        console.log("Password reset attempted without reset token");
        return new Response(
          JSON.stringify({ error: "Reset token is required. Please verify OTP first." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Validate the reset token
      const { data: tokenRecord, error: tokenError } = await supabase
        .from("password_reset_otps")
        .select("*")
        .eq("email", email)
        .eq("reset_token", resetToken)
        .eq("used", true)  // OTP must have been verified (used=true)
        .gt("expires_at", new Date(Date.now() - 15 * 60 * 1000).toISOString()) // Allow 15 mins after OTP expiry for password reset
        .single();

      if (tokenError || !tokenRecord) {
        console.log("Invalid or expired reset token");
        return new Response(
          JSON.stringify({ error: "Invalid or expired reset token. Please request a new OTP." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get user by email and update password
      const { data: userData } = await supabase.auth.admin.listUsers();
      const user = userData?.users?.find(u => u.email === email);

      if (!user) {
        return new Response(
          JSON.stringify({ error: "User not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
      );

      if (updateError) {
        console.error("Error updating password:", updateError);
        throw new Error("Failed to update password");
      }

      // Invalidate the reset token after successful password reset
      await supabase
        .from("password_reset_otps")
        .update({ reset_token: null })
        .eq("id", tokenRecord.id);

      console.log("Password updated successfully for user:", user.id);

      return new Response(
        JSON.stringify({ success: true, message: "Password updated successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-otp function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
