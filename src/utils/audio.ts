// ============================================================
// 音效管理（Web Audio API）
// iOS 要求 AudioContext 必须在用户手势事件中创建
// ============================================================

let audioCtx: AudioContext | null = null;
let initialized = false;

/**
 * 初始化音频上下文，必须在用户点击/触摸事件中调用
 */
export function initAudio(): void {
  if (initialized) return;

  try {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    initialized = true;
  } catch (e) {
    console.warn('无法初始化音频上下文:', e);
  }
}

/**
 * 播放一个短促的提示音（动作完成时）
 */
export function playBeep(): void {
  if (!audioCtx || !initialized) return;

  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5

    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.15);
  } catch (e) {
    // 静默处理音频播放失败
  }
}

/**
 * 播放倒计时提示音（每秒钟一次）
 */
export function playCountdownBeep(): void {
  if (!audioCtx || !initialized) return;

  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4，比完成音低

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.1);
  } catch (e) {
    // 静默处理音频播放失败
  }
}

/**
 * 播放关卡完成音效（上升音阶）
 */
export function playSuccess(): void {
  if (!audioCtx || !initialized) return;

  try {
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    const noteDuration = 0.12;

    notes.forEach((freq, i) => {
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();

      osc.connect(gain);
      gain.connect(audioCtx!.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx!.currentTime + i * noteDuration);

      gain.gain.setValueAtTime(0, audioCtx!.currentTime + i * noteDuration);
      gain.gain.linearRampToValueAtTime(0.25, audioCtx!.currentTime + i * noteDuration + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx!.currentTime + i * noteDuration + noteDuration);

      osc.start(audioCtx!.currentTime + i * noteDuration);
      osc.stop(audioCtx!.currentTime + i * noteDuration + noteDuration);
    });
  } catch (e) {
    // 静默处理音频播放失败
  }
}

/**
 * Perfect 音效（清脆叮声，用于开合跳等动作完成）
 */
export function playPerfect(): void {
  if (!audioCtx || !initialized) return;

  try {
    const now = audioCtx.currentTime;

    // 主音：高频清脆叮声
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1200, now);
    osc1.frequency.exponentialRampToValueAtTime(1600, now + 0.05);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc1.start(now);
    osc1.stop(now + 0.2);

    // 泛音：增加清脆感
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2400, now + 0.03);
    gain2.gain.setValueAtTime(0.15, now + 0.03);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc2.start(now + 0.03);
    osc2.stop(now + 0.15);
  } catch (e) {
    // 静默处理
  }
}

/**
 * 检查音频是否已初始化
 */
export function isAudioReady(): boolean {
  return initialized;
}
