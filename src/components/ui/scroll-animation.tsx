import { useEffect, useRef, useState, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ScrollAnimationProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "fade";
  duration?: number;
}

const ScrollAnimation = ({
  children,
  className,
  delay = 0,
  direction = "up",
  duration = 600,
}: ScrollAnimationProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsVisible(true);
          }, delay);
        }
      },
      {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
      }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [delay]);

  const directionClasses = {
    up: isVisible
      ? "opacity-100 translate-y-0"
      : "opacity-0 translate-y-10",
    down: isVisible
      ? "opacity-100 translate-y-0"
      : "opacity-0 -translate-y-10",
    left: isVisible
      ? "opacity-100 translate-x-0"
      : "opacity-0 -translate-x-10",
    right: isVisible
      ? "opacity-100 translate-x-0"
      : "opacity-0 translate-x-10",
    fade: isVisible ? "opacity-100" : "opacity-0",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all ease-out",
        directionClasses[direction],
        className
      )}
      style={{
        transitionDuration: `${duration}ms`,
      }}
    >
      {children}
    </div>
  );
};

export default ScrollAnimation;

