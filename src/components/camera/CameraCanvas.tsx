// ============================================================
// 摄像头画布组件
// ============================================================

import type { RefObject } from 'react';

interface CameraCanvasProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

export function CameraCanvas({ videoRef, canvasRef }: CameraCanvasProps) {
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {/* video：始终存在，透明不可见（仅用于 MediaPipe 喂帧） */}
      <video
        ref={videoRef}
        className="absolute top-0 left-0 w-full h-full object-contain opacity-0 pointer-events-none"
        playsInline
        muted
      />

      {/* canvas：摄像头预览画面 + 骨骼，镜像效果 */}
      <canvas
        ref={canvasRef}
        className="w-full h-full object-contain rounded-lg"
      />
    </div>
  );
}
