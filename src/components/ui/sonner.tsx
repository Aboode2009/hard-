import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          // duo-page: sonner portals to body, so the Duolingo font + card
          // ledge are applied here directly.
          toast:
            "duo-page group toast group-[.toaster]:bg-[hsl(var(--duo-surface))] group-[.toaster]:text-[hsl(var(--duo-text))] group-[.toaster]:border-2 group-[.toaster]:border-[hsl(var(--duo-border))] group-[.toaster]:rounded-[1.25rem] group-[.toaster]:shadow-[0_4px_0_hsl(var(--duo-edge))]",
          description: "group-[.toast]:text-[hsl(var(--duo-muted))]",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
