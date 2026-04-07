import { useEffect } from "react";

export default function ThemeAlert() {
  useEffect(() => {
    const timer = setTimeout(() => {
      const shown = localStorage.getItem("themeAlertShown");

      const isLightMode =
        !document.documentElement.classList.contains("dark");

      if (!shown && isLightMode) {
        alert("Please switch to dark mode for better UI experience 🌙");
        localStorage.setItem("themeAlertShown", "true");
      }
    }, 500); // wait for theme to apply

    return () => clearTimeout(timer);
  }, []);

  return null;
}