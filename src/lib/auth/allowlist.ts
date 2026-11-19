/** Parse a comma-separated allowlist. Empty list = everyone allowed. */
export function parseAllowlist(raw: string | undefined): string[] {
	return (raw ?? "")
		.split(",")
		.map((e) => e.trim().toLowerCase())
		.filter(Boolean);
}

export function isEmailAllowed(email: string, allowlist: string[]): boolean {
	if (allowlist.length === 0) return true;
	return allowlist.includes(email.trim().toLowerCase());
}
