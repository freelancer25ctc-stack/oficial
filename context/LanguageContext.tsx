
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations } from '../i18n/translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations['pt'], params?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('app_language');
      return (saved as Language) || 'pt';
    } catch (e) {
      console.warn("Erro ao ler idioma do cache:", e);
      return 'pt';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('app_language', language);
    } catch (e) {
      console.warn("Erro ao salvar idioma no cache:", e);
    }
  }, [language]);

  const t = (key: keyof typeof translations['pt'], params?: Record<string, string>) => {
    let text = translations[language][key] || translations['pt'][key] || key;
    
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, v);
      });
    }
    
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider');
  return context;
};
