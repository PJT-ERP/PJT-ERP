// Role yang bisa di-tag sebagai grup di komentar (sama dengan saran di SalesOrderComments).
export const MENTION_ROLES = ['Sales', 'Engineering', 'Engineering Supervisor', 'QC', 'Owner', 'Admin', 'Finance', 'Purchasing'];

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Ambil semua tag utuh dari isi komentar (lowercase).
 * Kandidat dicocokkan dari yang terpanjang dulu dan tidak boleh diikuti huruf/angka,
 * jadi "@Engineering Supervisor" tidak terbaca sebagai "@Engineering",
 * dan "@Budi Santoso" tidak terbaca sebagai "@Budi".
 */
export function extractMentions(content: string, candidates: string[]): Set<string> {
  const unique = Array.from(new Set(candidates.map(c => c?.trim()).filter(Boolean) as string[]));
  if (!content || unique.length === 0) return new Set();
  const pattern = unique.sort((a, b) => b.length - a.length).map(escapeRegex).join('|');
  const regex = new RegExp(`@(${pattern})(?![\\p{L}\\p{N}_])`, 'giu');
  const found = new Set<string>();
  for (const match of content.matchAll(regex)) found.add(match[1].toLowerCase());
  return found;
}

/** True kalau user ini di-tag langsung (nama/username) atau lewat tag role-nya. */
export function isUserMentioned(
  content: string,
  user: { name?: string; role?: string; username?: string },
  knownNames: string[] = [],
): boolean {
  const own = [user.name, user.role, user.username].filter(Boolean) as string[];
  const mentions = extractMentions(content, [...MENTION_ROLES, ...knownNames, ...own]);
  return own.some(v => mentions.has(v.toLowerCase()));
}
