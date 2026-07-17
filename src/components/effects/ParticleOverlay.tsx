// ============================================================
// 全屏粒子特效覆盖层
// 接收粒子爆发事件，在独立 Canvas 上渲染
// ============================================================

import { useEffect, useRef, useCallback } from 'react';

interface Particle {
  x: number; y: number; vx: number; vy: number;
  life: number; maxLife: number; size: number;
  color: string;
}

const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#14b8a6', '#f97316'];
let particles: Particle[] = [];
let rafId: number | null = null;

/** 在指定位置生成粒子爆发 */
export function burstParticles(x: number, y: number, count = 40): void {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 100 + Math.random() * 300;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 50,
      life: 0.6 + Math.random() * 0.6,
      maxLife: 0.6 + Math.random() * 0.6,
      size: 5 + Math.random() * 10,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    });
  }
}

export function ParticleOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 尺寸适配视口
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 使用固定 dt 避免首帧大跳
    const now = performance.now();
    const dt = Math.min((now - (lastTimeRef.current || now)) / 1000, 0.05);
    lastTimeRef.current = now;

    particles = particles.filter((p) => {
      p.life -= dt;
      if (p.life <= 0) return false;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt; // 重力
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + alpha * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return true;
    });

    rafId = requestAnimationFrame(render);
  }, []);

  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    rafId = requestAnimationFrame(render);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      particles = [];
    };
  }, [render]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-50 pointer-events-none"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
}
