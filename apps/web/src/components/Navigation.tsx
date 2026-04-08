import { useRef, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";

const navLinks = [
  { label: "Browse", href: "/listings", scroll: null },
  { label: "How It Works", href: "/#how-it-works", scroll: "how-it-works" },
  { label: "Become a Host", href: "/#host", scroll: "host" },
  { label: "Partner", href: "/partner", scroll: null },
  { label: "Join Us", href: "/join", scroll: null },
];

export function Navigation() {
  const navRef = useRef<HTMLElement>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!navRef.current) return;
    gsap.fromTo(
      navRef.current,
      { y: -80, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", delay: 0.2 },
    );
  }, []);

  // After navigating to homepage with a hash, scroll to the section
  useEffect(() => {
    if (location.pathname === "/" && location.hash) {
      const id = location.hash.replace("#", "");
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [location]);

  function handleNavClick(
    e: React.MouseEvent<HTMLAnchorElement>,
    link: (typeof navLinks)[number],
  ) {
    if (link.scroll === "host" && isAuthenticated) {
      e.preventDefault();
      navigate("/dashboard/profile?upgrade=host");
      return;
    }
    if (!link.scroll) return;
    e.preventDefault();
    setMobileOpen(false);
    if (location.pathname === "/") {
      document
        .getElementById(link.scroll)
        ?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate(`/#${link.scroll}`);
    }
  }

  return (
    <>
      <nav
        ref={navRef}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          scrolled
            ? "bg-background/90 backdrop-blur-md border-b border-border shadow-sm"
            : "bg-transparent",
        )}
      >
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <span
              className={cn(
                "font-display font-black text-2xl tracking-tight transition-colors duration-300",
                scrolled ? "text-foreground" : "text-white",
              )}
            >
              LEN<span className="text-gold">DA</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavClick(e, link)}
                className={cn(
                  "text-sm font-medium transition-colors duration-200 hover:text-gold cursor-pointer",
                  location.pathname === link.href
                    ? "text-gold"
                    : scrolled
                      ? "text-foreground/70"
                      : "text-white/80",
                )}
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop right actions */}
          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle />
            {isAuthenticated ? (
              <Link to="/dashboard">
                <Button variant="gold" size="sm">
                  Dashboard
                </Button>
              </Link>
            ) : (
              <>
                <Link to="/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "transition-colors duration-300",
                      scrolled
                        ? "text-foreground/70 hover:text-foreground"
                        : "text-white/80 hover:text-white",
                    )}
                  >
                    Sign In
                  </Button>
                </Link>
                <Link to="/register">
                  <Button variant="gold" size="sm">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            className={cn(
              "md:hidden p-2 transition-colors",
              scrolled
                ? "text-foreground/70 hover:text-foreground"
                : "text-white/80 hover:text-white",
            )}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden bg-background/95 backdrop-blur-md border-b border-border">
            <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={(e) => handleNavClick(e, link)}
                  className="text-sm font-medium text-foreground/70 hover:text-gold transition-colors py-2 cursor-pointer"
                >
                  {link.label}
                </a>
              ))}
              <div className="flex flex-col gap-2 pt-2 border-t border-border">
                {isAuthenticated ? (
                  <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                    <Button variant="gold" size="sm" className="w-full">
                      Dashboard
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setMobileOpen(false)}>
                      <Button
                        variant="outlineGold"
                        size="sm"
                        className="w-full"
                      >
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/register" onClick={() => setMobileOpen(false)}>
                      <Button variant="gold" size="sm" className="w-full">
                        Get Started
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
