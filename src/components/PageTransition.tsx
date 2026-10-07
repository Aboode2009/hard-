import { ReactNode } from "react";

interface PageTransitionProps {
  children: ReactNode;
}

/**
 * The wrapper every route renders in. Deliberately no animation.
 *
 * It used to fade the new page in from opacity 0 over 0.14s. The outgoing
 * page is unmounted on the tap, so for those first frames there was nothing
 * opaque on screen at all — measured on a real phone as 2–5 blank frames on
 * every single tab switch, which read as the whole app blinking. Native tab
 * bars swap instantly; so does this.
 */
export const PageTransition = ({ children }: PageTransitionProps) => (
  <div className="w-full h-full">{children}</div>
);
