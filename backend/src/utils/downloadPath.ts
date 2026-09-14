import path from 'path'

/**
 * Map a `:filename` URL param to a file directly inside `dir`, or null if it is not a plain
 * file name. Express has already percent-decoded the param, so '..%2Fsecret' arrives as
 * '../secret'. Download URLs only ever carry path.basename() of a generated file, so any
 * separator, '.', '..', NUL or absolute path is rejected rather than normalised.
 */
export function resolveDownloadPath(dir: string, filename: string): string | null {
  if (!filename || filename === '.' || filename === '..') return null
  if (/[/\\\0]/.test(filename)) return null
  const base = path.resolve(dir)
  const resolved = path.resolve(base, filename)
  // Belt and braces: whatever the checks above missed, the result must sit directly in dir.
  if (path.dirname(resolved) !== base) return null
  return resolved
}
