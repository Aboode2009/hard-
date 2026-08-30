import { useNavigate } from "react-router-dom";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface NavbarProps {
  isAdmin?: boolean;
  showLogout?: boolean;
}

export const Navbar = ({ isAdmin = false, showLogout = true }: NavbarProps) => {
  const navigate = useNavigate();

  return (
    <nav
      className="sticky top-0 z-50 w-full border-b border-border/30"
      style={{
        background: 'hsl(var(--background) / 0.72)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      }}
    >
      <div className="container flex h-14 items-center justify-between px-4">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 group"
        >
          <h1 className="text-xl font-semibold text-primary">
            21
          </h1>
        </button>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
        </div>
      </div>
    </nav>
  );
};
