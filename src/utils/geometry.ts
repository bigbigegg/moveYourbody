// ============================================================
// 几何计算工具函数
// 所有函数使用 MediaPipe 归一化坐标 (0-1 范围)
// ============================================================

import type { Keypoint } from '../types';

/**
 * 计算以 b 为顶点的三点夹角（度数）
 * 用于膝关节角度、肘关节角度等
 */
export function calculateAngle(a: Keypoint, b: Keypoint, c: Keypoint): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let angle = Math.abs(radians * 180.0 / Math.PI);
  if (angle > 180.0) {
    angle = 360 - angle;
  }
  return angle;
}

/**
 * 两点之间的欧几里得距离（归一化坐标）
 */
export function distance(a: Keypoint, b: Keypoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 两点在 Z 轴（深度）方向的差值
 * 正值表示 a 在 b 后面（距离摄像头更远）
 */
export function depthDiff(a: Keypoint, b: Keypoint): number {
  return a.z - b.z;
}

/**
 * 判断手腕是否明显高于肩膀
 * MediaPipe 坐标系中 Y 轴向下，所以手腕 Y < 肩膀 Y 表示手腕在上方
 * threshold 防止微小抖动误判
 */
export function isWristAboveShoulder(
  wrist: Keypoint,
  shoulder: Keypoint,
  threshold = 0.05,
): boolean {
  return wrist.y < shoulder.y - threshold;
}

/**
 * 计算两点的中点
 */
export function midpoint(a: Keypoint, b: Keypoint): Keypoint {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
    z: (a.z + b.z) / 2,
  };
}

/**
 * 计算躯干与垂直线的夹角（度数），用于判断深蹲时是否弯腰
 * 使用肩部中点和髋部中点连线，对比垂直线 (dx=0, dy=∞)
 */
export function calculateTorsoLeanAngle(
  leftShoulder: Keypoint,
  rightShoulder: Keypoint,
  leftHip: Keypoint,
  rightHip: Keypoint,
): number {
  const shoulderMid = midpoint(leftShoulder, rightShoulder);
  const hipMid = midpoint(leftHip, rightHip);

  // 躯干向量
  const dx = hipMid.x - shoulderMid.x;
  const dy = hipMid.y - shoulderMid.y;

  // 与垂直线的夹角（垂直线的水平分量为 0，垂直分量为 -1）
  // 使用 atan2 计算躯干方向与垂直方向的角度差
  const torsoAngle = Math.abs(Math.atan2(dx, -dy) * 180.0 / Math.PI);

  return torsoAngle;
}
