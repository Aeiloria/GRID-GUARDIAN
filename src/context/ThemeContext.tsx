import React, { createContext, useContext, useState, useEffect } from 'react';

interface ThemeContextType {
  isWhiteTheme: boolean;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isWhiteTheme: true,
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Default to light (white UI) as requested by user
  const [theme, setThemeState] = useState<'light' | 'dark'>(() => {
    try {
      const stored = localStorage.getItem('grid_guardian_theme');
      return stored === 'dark' ? 'dark' : 'light';
    } catch {
      return 'light';
    }
  });

  const isWhiteTheme = theme === 'light';

  useEffect(() => {
    try {
      localStorage.setItem('grid_guardian_theme', theme);
    } catch {
      // Ignore localStorage restrictions
    }
    if (theme === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (newTheme: 'light' | 'dark') => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ isWhiteTheme, theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
