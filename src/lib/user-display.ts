import { getInitials } from "@/lib/jwt";

type UserDisplayInput = {
  name?: string | null;
  email?: string | null;
  username?: string | null;
};

export function resolveUserDisplayName({
  name,
  email,
  username,
}: UserDisplayInput): string {
  const trimmedName = name?.trim();
  if (trimmedName) return trimmedName;

  const trimmedEmail = email?.trim();
  if (trimmedEmail) return trimmedEmail;

  const trimmedUsername = username?.trim();
  if (trimmedUsername) return trimmedUsername;

  return "—";
}

export function initialsFromUserDisplay(input: UserDisplayInput): string {
  const displayName = resolveUserDisplayName(input);
  if (displayName === "—") return "?";

  if (displayName.includes("@")) {
    return getInitials(displayName);
  }

  const parts = displayName.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }

  return displayName.slice(0, 2).toUpperCase();
}
