import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

type ThemeMode = 'light' | 'dark' | 'system';
type Language = 'en' | 'th' | 'zn';

interface UserSettings {
  theme: ThemeMode;
  language: Language;
  primaryColor: string;
  accentColor: string;
}

interface SettingsContextType {
  settings: UserSettings;
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
  resolvedTheme: 'light' | 'dark';
  language: Language;
  setLanguage: (lang: Language) => void;
  primaryColor: string;
  setPrimaryColor: (c: string) => void;
  accentColor: string;
  setAccentColor: (c: string) => void;
  t: (key: string) => string;
  saveSettings: () => void;
  savedSuccess: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  theme: 'system',
  language: 'en',
  primaryColor: '#1D4ED8',
  accentColor: '#EAB308',
};

const translations: Record<Language, Record<string, string>> = {
  en: {
    'settings.title': 'Settings',
    'settings.subtitle': 'Configure your preferences, language, and appearance.',
    'settings.language': 'Language',
    'settings.theme': 'Theme',
    'settings.light': 'Light',
    'settings.dark': 'Dark',
    'settings.system': 'System',
    'settings.save': 'Save Settings',
    'settings.saved': 'Preferences saved successfully!',
    'settings.appearance': 'Appearance',
    'brand.primary': 'Primary Base Color',
    'brand.accent': 'Accent Color',
    'brand.palette': 'Brand Color Palette',
    'theme.light': 'Light Mode',
    'theme.dark': 'Dark Mode',
    'theme.system': 'System Default',
    'nav.stages': 'Sales Pipeline Stages',
  },
  th: {
    'settings.title': 'ตั้งค่า',
    'settings.subtitle': 'กำหนดค่ากำหนด ภาษา และลักษณะที่ปรากฏ',
    'settings.language': 'ภาษา',
    'settings.theme': 'ธีม',
    'settings.light': 'สว่าง',
    'settings.dark': 'มืด',
    'settings.system': 'ตามระบบ',
    'settings.save': 'บันทึกการตั้งค่า',
    'settings.saved': 'บันทึกการตั้งค่าเรียบร้อยแล้ว!',
    'settings.appearance': 'ลักษณะที่ปรากฏ',
    'brand.primary': 'สีหลัก',
    'brand.accent': 'สีเน้น',
    'brand.palette': 'จานสีแบรนด์',
    'theme.light': 'โหมดสว่าง',
    'theme.dark': 'โหมดมืด',
    'theme.system': 'ค่าเริ่มต้นของระบบ',
    'nav.stages': 'ขั้นตอนการขาย',
  },
  zn: {
    'settings.title': '设置',
    'settings.subtitle': '配置您的偏好、语言和外观。',
    'settings.language': '语言',
    'settings.theme': '主题',
    'settings.light': '明亮',
    'settings.dark': '深色',
    'settings.system': '跟随系统',
    'settings.save': '保存设置',
    'settings.saved': '设置已成功保存！',
    'settings.appearance': '外观',
    'brand.primary': '主色调',
    'brand.accent': '强调色',
    'brand.palette': '品牌调色板',
    'theme.light': '浅色模式',
    'theme.dark': '深色模式',
    'theme.system': '系统默认',
    'nav.stages': '销售阶段',
  },
};

const storageKey = (userId: string) => `rf-settings-${userId}`;

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id || 'anonymous';
  const [prevUserId, setPrevUserId] = useState(userId);

  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const saved = localStorage.getItem(storageKey(userId));
      if (saved) return JSON.parse(saved);
    } catch {/* ignore corrupt data */}
    return DEFAULT_SETTINGS;
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Reload settings when user changes (during render, not effect)
  if (userId !== prevUserId) {
    setPrevUserId(userId);
    try {
      const saved = localStorage.getItem(storageKey(userId));
      setSettings(saved ? JSON.parse(saved) : DEFAULT_SETTINGS);
    } catch {/* ignore corrupt data */}
  }

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const updateResolved = () => {
      const resolved = settings.theme === 'system' ? (mediaQuery.matches ? 'dark' : 'light') : settings.theme;
      setResolvedTheme(resolved);
      document.documentElement.classList.toggle('dark', resolved === 'dark');
      document.documentElement.setAttribute('data-theme', resolved === 'dark' ? 'dark' : 'light');
    };
    updateResolved();
    mediaQuery.addEventListener('change', updateResolved);
    return () => mediaQuery.removeEventListener('change', updateResolved);
  }, [settings.theme]);

  const persist = (updated: UserSettings) => {
    localStorage.setItem(storageKey(userId), JSON.stringify(updated));
  };

  const setTheme = (theme: ThemeMode) => {
    const updated = { ...settings, theme };
    setSettings(updated);
    persist(updated);
  };

  const setLanguage = (language: Language) => {
    const updated = { ...settings, language };
    setSettings(updated);
    persist(updated);
  };

  const setPrimaryColor = (primaryColor: string) => {
    setSettings((prev) => ({ ...prev, primaryColor }));
  };

  const setAccentColor = (accentColor: string) => {
    setSettings((prev) => ({ ...prev, accentColor }));
  };

  const saveSettings = () => {
    persist(settings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const t = (key: string): string => {
    return translations[settings.language][key] || translations.en[key] || key;
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        theme: settings.theme,
        setTheme,
        resolvedTheme,
        language: settings.language,
        setLanguage,
        primaryColor: settings.primaryColor,
        setPrimaryColor,
        accentColor: settings.accentColor,
        setAccentColor,
        t,
        saveSettings,
        savedSuccess,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};
