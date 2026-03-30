export async function createProduct(backendBaseUrl, token, { name, price, file }) {
  const formData = new FormData()
  formData.append('name', name.trim())
  formData.append('price', price)
  if (file) formData.append('image', file)

  return fetch(`${backendBaseUrl}/api/admin/products`, {
    method: 'POST',
    headers: { 'X-Session-Token': token },
    body: formData
  })
}
