/**
 * Monthly Referrer donor badge helpers (decorative only).
 *
 * Pure module shared by the trollbox and forum rows/cards so donor
 * badges look identical everywhere. Rankings come from
 * getTopDonators() (same source as /monthly_referrer.html); failures
 * yield no badges.
 */

function buildDonorRankMap(donors) {
  const rank = {};
  if (!Array.isArray(donors)) {
    return rank;
  }
  donors.forEach((d, index) => {
    if (d && typeof d.id === "string" && !(d.id in rank)) {
      rank[d.id] = index + 1;
    }
  });
  return rank;
}

function getDonorBadgeInfo(accountId, donorRank) {
  const rank = donorRank ? donorRank[accountId] : undefined;
  if (!rank) {
    return null;
  }
  if (rank >= 1 && rank <= 3) {
    return { kind: "top", rank };
  }
  return { kind: "donor", rank };
}

function donorMedal(rank) {
  if (rank === 1) {
    return "🥇";
  }
  if (rank === 2) {
    return "🥈";
  }
  if (rank === 3) {
    return "🥉";
  }
  return "";
}

function donorBadgeClassName(rank) {
  const base =
    "inline-flex shrink-0 items-center rounded border px-1.5 py-px text-[10px] font-medium";
  if (rank === 1) {
    return `${base} border-[hsl(var(--accent-warning)/0.6)] bg-[hsl(var(--accent-warning)/0.15)] text-[hsl(var(--accent-warning-fg))]`;
  }
  if (rank === 2) {
    return `${base} border-border bg-muted text-muted-foreground`;
  }
  if (rank === 3) {
    return `${base} border-[hsl(var(--accent-warning)/0.5)] bg-[hsl(var(--accent-warning)/0.08)] text-[hsl(var(--accent-warning-fg))]`;
  }
  return `${base} border-[hsl(var(--accent-success)/0.4)] bg-[hsl(var(--accent-success)/0.1)] text-[hsl(var(--accent-success-fg))]`;
}

function donorBadgeDialogClassName(rank) {
  if (rank === 1) {
    return "shrink-0 border-[hsl(var(--accent-warning)/0.6)] bg-[hsl(var(--accent-warning)/0.15)] text-[11px] text-[hsl(var(--accent-warning-fg))]";
  }
  if (rank === 2) {
    return "shrink-0 border-border bg-muted text-[11px] text-muted-foreground";
  }
  if (rank === 3) {
    return "shrink-0 border-[hsl(var(--accent-warning)/0.5)] bg-[hsl(var(--accent-warning)/0.08)] text-[11px] text-[hsl(var(--accent-warning-fg))]";
  }
  return "shrink-0 border-[hsl(var(--accent-success)/0.4)] bg-[hsl(var(--accent-success)/0.1)] text-[11px] text-[hsl(var(--accent-success-fg))]";
}

/**
 * Resolve the display label + tooltip for an account's donor badge.
 * Returns null when the account has no rank.
 */
function donorBadgeText(accountId, donorRank, { donorLabel, topDonorLabel, donorTitle, topDonorTitle }) {
  const badge = getDonorBadgeInfo(accountId, donorRank);
  if (!badge) {
    return null;
  }
  if (badge.kind === "top") {
    const title = topDonorTitle
      ? topDonorTitle.replace("{{rank}}", String(badge.rank))
      : `${topDonorLabel} #${badge.rank}`;
    return {
      badge,
      label: `${donorMedal(badge.rank)} ${title}`,
      title,
    };
  }
  return { badge, label: donorLabel, title: donorTitle || donorLabel };
}

export {
  buildDonorRankMap,
  getDonorBadgeInfo,
  donorMedal,
  donorBadgeClassName,
  donorBadgeDialogClassName,
  donorBadgeText,
};
