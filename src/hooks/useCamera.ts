// ============================================================
// 摄像头管理 Hook
// ============================================================

import { useState, useCallback, useRef } from 'react';

interface UseCameraReturn {
  isReady: boolean;
  error: string | null;
  startCamera: () => Promise<void>;
  stopCamera: () => void;
}

export function useCamera(
  videoRef: React.RefObject<HTMLVideoElement | null>,
): UseCameraReturn {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsReady(false);
  }, [videoRef]);

  const startCamera = useCallback(async () => {
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) {
        setError('Video 元素未就绪');
        return;
      }

      video.srcObject = stream;

      // 等待视频元数据加载完成
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('视频加载超时'));
        }, 10000);

        const onReady = () => {
          clearTimeout(timeout);
          video.removeEventListener('loadedmetadata', onReady);
          video.removeEventListener('error', onError);
          video.play().catch(console.warn);
          setIsReady(true);
          resolve();
        };

        const onError = () => {
          clearTimeout(timeout);
          video.removeEventListener('loadedmetadata', onReady);
          video.removeEventListener('error', onError);
          reject(new Error('视频加载失败'));
        };

        // 如果视频已经加载好了
        if (video.readyState >= 2) {
          onReady();
          return;
        }

        video.addEventListener('loadedmetadata', onReady);
        video.addEventListener('error', onError);
      });

      console.log('[useCamera] 摄像头就绪');
    } catch (err: any) {
      const message =
        err.name === 'NotAllowedError'
          ? '摄像头权限被拒绝，请在浏览器设置中允许摄像头访问'
          : err.name === 'NotFoundError'
            ? '未检测到摄像头设备'
            : `摄像头启动失败: ${err.message}`;
      setError(message);
      console.error('[useCamera]', message);
    }
  }, [videoRef]);

  return { isReady, error, startCamera, stopCamera };
}
