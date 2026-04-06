export function buildClientFolderName(lastName: string, firstName: string) {
  const normalizedLastName = slugify(lastName)
  const firstInitial = slugify(firstName).slice(0, 1)

  if (!normalizedLastName || !firstInitial) {
    throw new Error('Missing client name data')
  }

  return `${normalizedLastName}-${firstInitial}`
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
