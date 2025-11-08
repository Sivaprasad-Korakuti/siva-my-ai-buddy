import { useEffect, useRef } from 'react';

interface VoiceVisualizerProps {
  isActive: boolean;
  className?: string;
}

export const VoiceVisualizer = ({ isActive, className = '' }: VoiceVisualizerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bars = 5;
    const barWidth = 4;
    const gap = 6;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < bars; i++) {
        const height = isActive
          ? Math.random() * 30 + 10
          : 10;

        const x = i * (barWidth + gap);
        const y = (canvas.height - height) / 2;

        const gradient = ctx.createLinearGradient(x, y, x, y + height);
        gradient.addColorStop(0, 'hsl(195, 100%, 60%)');
        gradient.addColorStop(1, 'hsl(195, 100%, 50%)');

        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, barWidth, height);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={60}
      height={40}
      className={className}
    />
  );
};
