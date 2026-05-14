const PRIVATE_BLOB_HOST_RE = /\.private\.blob\.vercel-storage\.com$/i

export function resolveAvatarUrl(image: string | null | undefined): string | null {
  if (!image) return null
  try {
    const url = new URL(image)
    if (PRIVATE_BLOB_HOST_RE.test(url.host)) {
      return `/api/avatars${url.pathname}`
    }
    return image
  } catch {
    return image
  }
}
