import { toast } from "sonner";

type SbError = { message?: string; code?: string; details?: string } | null | undefined;

const FRIENDLY: Array<{ test: (e: SbError) => boolean; msg: string }> = [
  {
    test: (e) =>
      !!e &&
      (e.code === "42501" ||
        /row-level security|violates row-level|permission denied|not authorized/i.test(
          e.message ?? ""
        )),
    msg: "You don't have permission to do that.",
  },
  {
    test: (e) => !!e && e.code === "23505",
    msg: "Already done — you can only react once per type.",
  },
  {
    test: (e) => !!e && e.code === "PGRST116",
    msg: "Not found, or you don't have access.",
  },
];

export function friendlyMessage(error: SbError, fallback = "Something went wrong"): string {
  if (!error) return fallback;
  const match = FRIENDLY.find((f) => f.test(error));
  return match?.msg ?? error.message ?? fallback;
}

export function toastError(error: SbError, context?: string) {
  const base = friendlyMessage(error);
  toast.error(context ? `${context}: ${base}` : base);
}
