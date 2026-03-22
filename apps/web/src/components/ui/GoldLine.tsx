import { useRef, useEffect } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { cn } from "../../lib/utils";

gsap.registerPlugin(ScrollTrigger);

interface GoldLineProps {
  className?: string;
  animate?: boolean;
}

export function GoldLine({ className, animate = true }: GoldLineProps) {
  const lineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!animate || !lineRef.current) return;

    gsap.fromTo(
      lineRef.current,
      { scaleX: 0 },
      {
        scaleX: 1,
        duration: 0.8,
        ease: "power2.out",
        scrollTrigger: {
          trigger: lineRef.current,
          start: "top 80%",
        },
      },
    );
  }, [animate]);

  return <div ref={lineRef} className={cn("gold-line", className)} />;
}
