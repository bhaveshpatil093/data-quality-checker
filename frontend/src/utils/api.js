function resolveApiBaseUrl() {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }

  if (typeof window === 'undefined') {
    return 'http://localhost:4000'
  }

  const { protocol, hostname } = window.location
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1'
  if (isLocalHost) {
    return 'http://localhost:4000'
  }

  // For access from other devices on the LAN, reuse the same host IP.
  return `${protocol}//${hostname}:4000`
}

const API_BASE_URL = resolveApiBaseUrl()

export async function uploadDataset(file) {
  const formData = new FormData()
  formData.append('file', file)

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/upload`, {
      method: 'POST',
      body: formData,
    })
  } catch {
    throw new Error(`Unable to reach upload API at ${API_BASE_URL}. Check backend server and network access.`)
  }

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload.error || 'Upload failed')
  }

  return payload
}
