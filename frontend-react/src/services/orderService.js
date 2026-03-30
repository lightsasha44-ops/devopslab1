export async function checkoutOrder(backendBaseUrl, token, items) {
  return fetch(`${backendBaseUrl}/api/orders/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Token': token
    },
    body: JSON.stringify({ items })
  })
}

export async function fetchMyOrders(backendBaseUrl, token) {
  const response = await fetch(`${backendBaseUrl}/api/orders/my`, {
    headers: { 'X-Session-Token': token }
  })
  if (!response.ok) {
    throw new Error(await response.text())
  }
  return response.json()
}
