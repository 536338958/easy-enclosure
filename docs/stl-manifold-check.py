#!/usr/bin/env python3
"""STL 流形分析：找非流形边（不被恰好 2 个三角形共享的边）并定位其空间分布。

BambuStudio 报「模型在 18 和 20.22 之间出现空洞」「有错误对象方向」，
非流形边就是这类症状的几何根源。
"""
import sys
from collections import defaultdict


def load_ascii_stl(path):
    tris = []
    with open(path, encoding="utf8", errors="replace") as f:
        cur = []
        for line in f:
            line = line.strip()
            if line.startswith("vertex"):
                cur.append(tuple(float(x) for x in line.split()[1:4]))
                if len(cur) == 3:
                    tris.append(tuple(cur))
                    cur = []
    return tris


def analyze(path):
    tris = load_ascii_stl(path)
    print(f"===== {path} =====")
    print(f"三角形数: {len(tris)}")

    def key(v):
        return (round(v[0], 4), round(v[1], 4), round(v[2], 4))

    edges = defaultdict(list)
    for ti, t in enumerate(tris):
        for i in range(3):
            a, b = key(t[i]), key(t[(i + 1) % 3])
            if a > b:
                a, b = b, a
            edges[(a, b)].append(ti)

    bad = {e: ts for e, ts in edges.items() if len(ts) != 2}
    open_edges = sum(1 for ts in bad.values() if len(ts) == 1)
    multi = sum(1 for ts in bad.values() if len(ts) > 2)
    print(f"非流形边: {len(bad)}  （悬空边 {open_edges}，重叠边 {multi}）")

    if not bad:
        print("  流形完好 ✓")
        return

    # 位置聚类：按 5mm 网格统计非流形边中点
    grid = defaultdict(int)
    zs = []
    for (a, b) in bad:
        mx = (a[0] + b[0]) / 2
        my = (a[1] + b[1]) / 2
        mz = (a[2] + b[2]) / 2
        grid[(round(mx / 10) * 10, round(my / 10) * 10, round(mz / 10) * 10)] += 1
        zs.append((mz, a, b))

    print("非流形边位置分布（10mm 网格，按数量排序，前 20）:")
    for (gx, gy, gz), n in sorted(grid.items(), key=lambda kv: -kv[1])[:20]:
        print(f"  ({gx:4},{gy:4},{gz:4})  x{n}")

    zs.sort()
    lo = zs[0][0]
    hi = zs[-1][0]
    print(f"非流形边 z 范围: [{lo:.2f}, {hi:.2f}]")
    print("z 直方图（1mm）:")
    hist = defaultdict(int)
    for mz, _, _ in zs:
        hist[round(mz)] += 1
    for z in sorted(hist):
        print(f"  z={z:4}  {'#' * min(hist[z], 60)} ({hist[z]})")
    print()


for p in sys.argv[1:]:
    analyze(p)
