import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { migrateSettings } from "./lib/settingsMigration";

// Run before anything else — clears broken model names from localStorage
migrateSettings();

createRoot(document.getElementById("root")!).render(<App />);
