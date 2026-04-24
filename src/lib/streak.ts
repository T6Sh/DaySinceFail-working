export const MILESTONES = [1, 7, 30, 100, 365] as const;

export function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export function nextMilestone(days: number): number | null {
  return MILESTONES.find((m) => m > days) ?? null;
}

export function reachedMilestones(days: number): number[] {
  return MILESTONES.filter((m) => m <= days);
}
