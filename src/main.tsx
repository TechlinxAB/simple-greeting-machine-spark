
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { applyColorTheme, DEFAULT_THEME } from './components/ThemeProvider.tsx'

// Apply default theme immediately on page load
applyColorTheme(DEFAULT_THEME);

createRoot(document.getElementById("root")!).render(<App />);
