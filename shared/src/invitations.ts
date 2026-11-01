/** Client-side mirror of the server rules for invitations, used to show the right UI state.
 *  The server (send_invitation / respond_invitation SQL functions) remains the authority. */
export type VerificationStatus = "none" | "pending" | "verified" | "failed" | "manual_review" | "revoked";
export type InviteBlocker = "verification_required" | "blocked" | "rate_limited" | "self" | null;
export const DAILY_INVITE_LIMIT = 20;
export const INVITE_TTL_DAYS = 7;

export function canInvite(args: { me: string; target: string; myStatus: VerificationStatus; blocked: boolean; sentLast24h: number }): InviteBlocker {
  if (args.me === args.target) return "self";
  if (args.myStatus !== "verified") return "verification_required";
  if (args.blocked) return "blocked";
  if (args.sentLast24h >= DAILY_INVITE_LIMIT) return "rate_limited";
  return null;
}

export function canMessage(myStatus: VerificationStatus, isMember: boolean, blocked: boolean): boolean {
  return myStatus === "verified" && isMember && !blocked;
}

export function inviteState(status: string, expiresAt: Date, now = new Date()): "pending" | "accepted" | "declined" | "cancelled" | "expired" {
  if (status === "pending" && expiresAt < now) return "expired";
  return status as "pending" | "accepted" | "declined" | "cancelled" | "expired";
}
