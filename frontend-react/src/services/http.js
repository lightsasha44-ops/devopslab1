export async function safeJson(response) {
  const text = await response.text()
  try {
    return { text, json: JSON.parse(text) }
  } catch (_err) {
    return { text, json: null }
  }
}
