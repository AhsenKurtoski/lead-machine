import { useEffect, useRef, useState } from "react";

type Options = {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
};

export function useInView<T extends HTMLElement = HTMLDivElement>(
  options: Options = { threshold: 0.15, rootMargin: "0px 0px -50px 0px", triggerOnce: true },
) {
  const ref = useRef<T | null>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setIsInView(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (options.triggerOnce !== false) observer.disconnect();
        } else if (options.triggerOnce === false) {
          setIsInView(false);
        }
      },
      {
        threshold: options.threshold ?? 0.15,
        rootMargin: options.rootMargin ?? "0px 0px -50px 0px",
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [options]);

  return { ref, isInView } as const;
}
