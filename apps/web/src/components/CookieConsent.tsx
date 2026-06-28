import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";

const STORAGE_KEY = "lenda-cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setVisible(true);
      }
    } catch {
      // localStorage unavailable (e.g. private mode) — show the banner anyway
      setVisible(true);
    }
  }, []);

  const accept = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted");
    } catch {
      // ignore persistence failure
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-4 pointer-events-none">
      <div className="pointer-events-auto container mx-auto max-w-3xl glass-card-dark border border-gold/20 p-5 flex flex-col sm:flex-row sm:items-center gap-4 shadow-2xl">
        <div className="flex items-start gap-3 flex-1">
          <Cookie size={20} className="text-gold shrink-0 mt-0.5" />
          <p className="text-sm text-white/70 leading-relaxed">
            Lenda uses cookies for authentication and analytics.{" "}
            <Link
              to="/privacy"
              className="text-gold hover:underline whitespace-nowrap"
            >
              Learn more
            </Link>
          </p>
        </div>
        <button
          type="button"
          onClick={accept}
          className="btn-gold text-sm py-2 px-6 shrink-0 self-stretch sm:self-auto"
        >
          Accept
        </button>
      </div>
    </div>
  );
}
