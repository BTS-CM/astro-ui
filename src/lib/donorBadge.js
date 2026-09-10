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
    return `${base} border-yellow-500/60 bg-yellow-500/15 text-yellow-700 dark:text-yellow-300`;
  }
  if (rank === 2) {
    return `${base} border-slate-400/60 bg-slate-400/15 text-slate-600 dark:text-slate-300`;
  }
  if (rank === 3) {
    return `${base} border-amber-700/60 bg-amber-700/15 text-amber-700 dark:text-amber-400`;
  }
  return `${base} border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400`;
}

function donorBadgeDialogClassName(rank) {
  if (rank === 1) {
    return "shrink-0 border-yellow-500/60 bg-yellow-500/15 text-[11px] text-yellow-700 dark:text-yellow-300";
  }
  if (rank === 2) {
    return "shrink-0 border-slate-400/60 bg-slate-400/15 text-[11px] text-slate-600 dark:text-slate-300";
  }
  if (rank === 3) {
    return "shrink-0 border-amber-700/60 bg-amber-700/15 text-[11px] text-amber-700 dark:text-amber-400";
  }
  return "shrink-0 border-emerald-500/40 bg-emerald-500/10 text-[11px] text-emerald-700 dark:text-emerald-400";
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
