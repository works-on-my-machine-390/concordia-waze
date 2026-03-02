import { useState, useEffect } from "react";
import { API_URL } from "@/hooks/api";

export const useSvgDimensions = (imgPath: string | undefined) => {
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);
  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!imgPath) {
      setDimensions(null);
      return;
    }

    setError(false);
    setIsLoading(true);
    setDimensions(null);

    const fetchDimensions = async () => {
      try {
        const svgUrl = `${API_URL}/images/${imgPath}`;
        const response = await fetch(svgUrl);
        const svgText = await response.text();

        let width = 0;
        let height = 0;

        // try viewBox
        const viewBoxMatch = svgText.match(/viewBox=["']([^"']+)["']/);
        if (viewBoxMatch) {
          const values = viewBoxMatch[1].trim().split(/[\s,]+/);
          if (values.length === 4) {
            width = Number.parseFloat(values[2]);
            height = Number.parseFloat(values[3]);
          }
        }

        // fallback to width and height (for SVGs like CC_1, not sure why they don't have viewbox)
        if (!width || !height || Number.isNaN(width) || Number.isNaN(height)) {
          const widthMatch = svgText.match(/\swidth=["']?(\d+(?:\.\d+)?)["']?/);
          const heightMatch = svgText.match(/\sheight=["']?(\d+(?:\.\d+)?)["']?/);

          if (widthMatch) width = Number.parseFloat(widthMatch[1]);
          if (heightMatch) height = Number.parseFloat(heightMatch[1]);
        }

        // Validate
        if (!width || !height || Number.isNaN(width) || Number.isNaN(height)) {
          console.error("Invalid SVG dimensions:", width, height);
          setError(true);
          setIsLoading(false);
          return;
        }

        setDimensions({ width, height });
        setIsLoading(false);
      } catch (err) {
        console.error("Failed to fetch SVG:", err);
        setError(true);
        setIsLoading(false);
      }
    };

    fetchDimensions();
  }, [imgPath]);

  return { dimensions, error, isLoading };
};