// ============================================================
// 规则引擎：管理所有动作规则，提供统一的判定入口
// ============================================================

import type { ActionRule, ActionResult, Pose } from '../types';

export class RuleEngine {
  private rules: Map<string, ActionRule> = new Map();

  /** 注册一条动作规则 */
  register(rule: ActionRule): void {
    this.rules.set(rule.id, rule);
  }

  /** 批量注册 */
  registerAll(rules: Map<string, ActionRule>): void {
    rules.forEach((rule, id) => {
      this.rules.set(id, rule);
    });
  }

  /** 获取指定规则 */
  getRule(id: string): ActionRule | undefined {
    return this.rules.get(id);
  }

  /** 使用指定规则判定当前 Pose */
  judge(ruleId: string, pose: Pose): ActionResult {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      console.warn(`[RuleEngine] 未找到规则: ${ruleId}`);
      return { detected: false, count: 0, stage: 'unknown' };
    }
    return rule.judge(pose);
  }

  /** 重置指定规则 */
  reset(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (rule) {
      rule.reset();
    }
  }

  /** 重置全部规则 */
  resetAll(): void {
    this.rules.forEach((rule) => {
      rule.reset();
    });
  }

  /** 获取所有规则 ID */
  getRuleIds(): string[] {
    return Array.from(this.rules.keys());
  }
}
