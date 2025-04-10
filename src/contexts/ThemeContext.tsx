
import React, { createContext, useContext, useState } from "react";

interface ThemeContextType {
  chartColors: {
    bar: string;
    pie: string[];
  };
}

const defaultThemeContext: ThemeContextType = {
  chartColors: {
    bar: "#4CAF50",
    pie: ['#8BC34A', '#4CAF50', '#009688', '#2196F3', '#3F51B5', '#673AB7', '#9C27B0']
  }
};

const ThemeContext = createContext<ThemeContextType>(defaultThemeContext);

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme] = useState<ThemeContextType>(defaultThemeContext);
  
  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};
