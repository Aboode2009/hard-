import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "react-i18next";

export const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    // Reload to apply changes properly
    window.location.reload();
  };

  const currentLang = i18n.language;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="duo-card duo-press relative w-11 h-11 flex items-center justify-center">
          <Globe className="h-5 w-5" style={{ color: "hsl(var(--duo-text))" }} strokeWidth={2.5} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="duo-page w-40 rounded-[1.25rem] border-2 border-[hsl(var(--duo-border))] bg-[hsl(var(--duo-surface))] shadow-[0_4px_0_hsl(var(--duo-edge))]"
      >
        <DropdownMenuItem
          onClick={() => changeLanguage('en')}
          className={`cursor-pointer transition-all rounded-xl ${currentLang === 'en' ? 'bg-[#1CB0F61e] text-[#1CB0F6] font-bold' : 'text-[hsl(var(--duo-text))] hover:bg-[hsl(var(--duo-border)/0.3)]'}`}
        >
          <span className="flex items-center justify-between w-full">
            English
            {currentLang === 'en' && <div className="w-1.5 h-1.5 rounded-full bg-[#1CB0F6] animate-pulse"></div>}
          </span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => changeLanguage('ar')}
          className={`cursor-pointer transition-all rounded-xl ${currentLang === 'ar' ? 'bg-[#1CB0F61e] text-[#1CB0F6] font-bold' : 'text-[hsl(var(--duo-text))] hover:bg-[hsl(var(--duo-border)/0.3)]'}`}
        >
          <span className="flex items-center justify-between w-full">
            العربية
            {currentLang === 'ar' && <div className="w-1.5 h-1.5 rounded-full bg-[#1CB0F6] animate-pulse"></div>}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};