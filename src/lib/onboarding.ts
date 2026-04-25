const KEY = (uid: string) => `dsf:onboarding-completed:${uid}`;

export function isOnboardingCompleted(userId: string | undefined): boolean {
  if (!userId) return true;
  try {
    return localStorage.getItem(KEY(userId)) === "1";
  } catch {
    return true;
  }
}

export function markOnboardingCompleted(userId: string | undefined) {
  if (!userId) return;
  try {
    localStorage.setItem(KEY(userId), "1");
  } catch {
    /* ignore */
  }
}
