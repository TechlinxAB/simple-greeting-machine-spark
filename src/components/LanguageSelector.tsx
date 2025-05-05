
import { useLanguage } from '@/contexts/LanguageContext';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';
import { useEffect } from 'react';

interface LanguageSelectorProps {
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
}

const LanguageSelector = ({ 
  variant = 'outline', 
  size = 'default',
  showLabel = true 
}: LanguageSelectorProps) => {
  const { language, setLanguage } = useLanguage();
  const { t, i18n } = useTranslation();

  const languages = [
    { code: 'en', name: 'English' },
    { code: 'sv', name: 'Svenska' }
  ];

  // Ensure i18n and document language is in sync with context
  useEffect(() => {
    if (language && i18n.language !== language) {
      i18n.changeLanguage(language);
      document.documentElement.lang = language;
    }
  }, [language, i18n]);

  const handleLanguageChange = (code: 'en' | 'sv') => {
    console.log(`Changing language to: ${code}`);
    setLanguage(code);
    document.documentElement.lang = code;
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className="gap-2">
          <Globe className="h-4 w-4" />
          {showLabel && t("auth.selectLanguage")}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            className={language === lang.code ? "bg-primary/10 font-medium" : ""}
            onClick={() => handleLanguageChange(lang.code as 'en' | 'sv')}
          >
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;
