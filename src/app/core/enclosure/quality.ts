/**
 * 交互期画质开关（性能选项 B）。
 *
 * 参数拖动过程中，渲染器先用低段数快速出一版预览（拖动中持续可见的连续反馈），
 * 停手 250ms 后再用全段数精修一次 —— 最终产物与关闭本开关时逐位一致。
 *
 * 用法：
 * ```ts
 * setInteractiveQuality(true);
 * const geom = base(params);   // 内部 seg() 返回折半段数
 * setInteractiveQuality(false);
 * ```
 * 模块级单例，仅作用于**新建**的几何；导出 / 单测路径默认关闭。
 */

let interactive = false;

/** 进入 / 退出交互期低段数模式 */
export const setInteractiveQuality = (on: boolean): void => {
  interactive = on;
};

/** 当前是否处于交互期 */
export const isInteractiveQuality = (): boolean => interactive;

/**
 * 段数换算：交互期取一半（下限 10），平时取全值。
 * 48 → 24、24 → 12、16 → 10：弦高误差在 FDM 打印精度（0.1mm 级）以下不可分辨，
 * 而布尔运算的耗时随三角形数近似平方下降。
 */
export const seg = (normal: number): number =>
  interactive ? Math.max(10, Math.round(normal / 2)) : normal;
