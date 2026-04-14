function resolveApiBaseUrl() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/+$/, '')
  }

  if (typeof window === 'undefined') {
    return 'http://localhost:4000'
  }

  const { protocol, hostname } = window.location
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1'
  if (isLocalHost) {
    return 'http://localhost:4000'
  }

  // In deployed environments (e.g. Vercel), use same-origin API routes.
  return `${protocol}//${hostname}`
}

const API_BASE_URL = resolveApiBaseUrl()
const UPLOAD_TIMEOUT_MS = 20000

export async function uploadDataset(file) {
  const formData = new FormData()
  formData.append('file', file)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS)
  const uploadUrl = `${API_BASE_URL}/api/upload`

  let response
  try {
    response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    })
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`Upload timed out after ${UPLOAD_TIMEOUT_MS / 1000}s. Verify the API is reachable at ${uploadUrl}.`)
    }
    throw new Error(`Unable to reach upload API at ${uploadUrl}. Check backend deployment and network access.`)
  } finally {
    clearTimeout(timeoutId)
  }

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || 'Upload failed')
  }

  return payload
}
