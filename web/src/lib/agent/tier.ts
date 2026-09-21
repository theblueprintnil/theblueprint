export type AgeTier = 'YOUTH' | 'JUNIOR' | 'SENIOR' | 'RESTRICTED'

export function resolveAgeTier(
  dateOfBirth: Date | string | null | undefined,
  at: Date = new Date(),
): AgeTier {
  if (!dateOfBirth) {
    return 'RESTRICTED'
  }
  const dob = dateOfBirth instanceof Date ? dateOfBirth : new Date(dateOfBirth)
  if (Number.isNaN(dob.getTime())) {
    return 'RESTRICTED'
  }
  let age = at.getFullYear() - dob.getFullYear()
  const monthDelta = at.getMonth() - dob.getMonth()
  const dayDelta = at.getDate() - dob.getDate()
  if (monthDelta < 0 || (monthDelta === 0 && dayDelta < 0)) {
    age -= 1
  }
  if (age < 0) {
    return 'RESTRICTED'
  }
  if (age <= 12) {
    return 'YOUTH'
  }
  if (age <= 17) {
    return 'JUNIOR'
  }
  return 'SENIOR'
}
