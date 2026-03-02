import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { API_URL } from "@/hooks/api";

// get svg text (cached by react query)
const fetchSvgText = async (imgPath: string): Promise<string> => {
  const svgUrl = `${API_URL}/images/${imgPath}`;
  const response = await fetch(svgUrl);
  return response.text();
};

export const useSvgDimensions = (imgPath: string | undefined) => {
  const [dimensions, setDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [error, setError] = useState(false);

  const { data: svgText, isLoading } = useQuery({
    queryKey: ['svg-text', imgPath],
    queryFn: () => fetchSvgText(imgPath!),
    enabled: !!imgPath,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  useEffect(() => {
    if (!svgText) {
      setDimensions(null);
      return;
    }

    try {
      let width = 0;
      let height = 0;

      const viewBoxMatch = svgText.match(/viewBox=["']([^"']+)["']/);
      if (viewBoxMatch) {
        const values = viewBoxMatch[1].trim().split(/[\s,]+/);
        if (values.length === 4) {
          width = Number.parseFloat(values[2]);
          height = Number.parseFloat(values[3]);
        }
      }

      if (!width || !height || Number.isNaN(width) || Number.isNaN(height)) {
        const widthMatch = svgText.match(/\swidth=["']?(\d+(?:\.\d+)?)["']?/);
        const heightMatch = svgText.match(/\sheight=["']?(\d+(?:\.\d+)?)["']?/);

        if (widthMatch) width = Number.parseFloat(widthMatch[1]);
        if (heightMatch) height = Number.parseFloat(heightMatch[1]);
      }

      if (!width || !height || Number.isNaN(width) || Number.isNaN(height)) {
        console.error("Invalid SVG dimensions:", width, height);
        setError(true);
        return;
      }

      setDimensions({ width, height });
      setError(false);
    } catch (err) {
      console.error("Failed to parse SVG:", err);
      setError(true);
    }
  }, [svgText]);

  return { dimensions, svgText, error, isLoading }; 
};