import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import i18next from "i18next";
import { supabase } from "@/integrations/supabase/client";
import { onWidgetOpenTasks, pushWidgetSnapshot, widgetLang } from "@/lib/widget-sync";

/**
 * App-wide half of the home-screen widget link (Android only; no-op
 * elsewhere). Mounted once inside the router; renders nothing.
 *
 * - A widget tap opens the tasks page.
 * - Signing out, or starting with no session, switches every widget to its
 *   "sign in to start" state. The signed-in snapshot itself comes from the
 *   tasks page, which is where today's tasks and streak live.
 */
export const WidgetBridge = () => {
  const navigate = useNavigate();

  useEffect(() => onWidgetOpenTasks(() => navigate("/")), [navigate]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (event === "INITIAL_SESSION" && !session)) {
        pushWidgetSnapshot({ signedIn: false, lang: widgetLang(i18next.language) });
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return null;
};
