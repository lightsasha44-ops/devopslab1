export async function fetchProducts(backendBaseUrl) {
  const response = await fetch(`${backendBaseUrl}/api/products`)
  const data = await response.json()
  return Array.isArray(data) ? data : []
}
