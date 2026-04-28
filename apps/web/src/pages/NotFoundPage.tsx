import { Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { GoldLine } from "@/components/ui/GoldLine";
import { Button } from "@/components/ui/Button";
import { ArrowRight } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <div className="flex-1 flex items-center justify-center px-4 pt-16">
        <div className="text-center max-w-md">
          <p className="font-display font-black text-8xl text-gold/20 leading-none mb-6">
            404
          </p>
          <p className="section-label mb-3">Page Not Found</p>
          <GoldLine className="w-12 mx-auto mb-6" />
          <h1 className="font-display font-bold text-2xl text-foreground uppercase tracking-tight mb-4">
            This page does not exist
          </h1>
          <p className="text-foreground/50 text-sm leading-relaxed mb-8">
            The page you are looking for may have been moved, deleted, or never
            existed. Check the URL or head back to the homepage.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/">
              <Button variant="gold" size="lg" className="gap-2">
                Back to Home <ArrowRight size={16} />
              </Button>
            </Link>
            <Link to="/listings">
              <Button variant="outlineGold" size="lg">
                Browse Listings
              </Button>
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
