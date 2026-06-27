const SUFFIX_RE = /^(.*) \((\d+)\)$/;

export function deduplicateLabel(candidate, existingLabels) {
    const m = SUFFIX_RE.exec(candidate);
    const base = m ? m[1] : candidate;
    let maxN = 0;
    let hasBase = false;
    for (const lbl of existingLabels) {
        if (lbl === base) { hasBase = true; continue; }
        const hit = SUFFIX_RE.exec(lbl);
        if (hit && hit[1] === base) {
            const n = parseInt(hit[2], 10);
            if (n > maxN) maxN = n;
        }
    }
    if (!hasBase && maxN === 0) return candidate;
    return base + ' (' + (maxN + 1) + ')';
}
