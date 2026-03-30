import { useState } from 'react'
import { MDBBtn, MDBInput } from 'mdb-react-ui-kit'
import { CardPage } from '../components/common/CardPage'
import { createProduct } from '../services/adminService'

export function AdminPage({ cfg, token }) {
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [file, setFile] = useState(null)
  const [message, setMessage] = useState('')

  async function submit(event) {
    event.preventDefault()
    if (!token) {
      setMessage('Нужен вход под admin')
      return
    }

    const response = await createProduct(cfg.backendBaseUrl, token, { name, price, file })
    setMessage(response.ok ? 'Товар добавлен' : `Ошибка добавления товара: ${await response.text()}`)

    if (response.ok) {
      setName('')
      setPrice('')
      setFile(null)
    }
  }

  return (
    <CardPage title='Админ-панель'>
      <p className='text-muted'>Для добавления карточек войдите под пользователем <code>admin</code>.</p>
      <form onSubmit={submit} className='d-grid gap-3'>
        <MDBInput label='Название товара' value={name} onChange={(e) => setName(e.target.value)} required />
        <MDBInput type='number' min='0.01' step='0.01' label='Цена' value={price} onChange={(e) => setPrice(e.target.value)} required />
        <input type='file' accept='image/*' onChange={(e) => setFile(e.target.files?.[0] || null)} required />
        <MDBBtn type='submit'>Добавить товар</MDBBtn>
        {message && <p className='mb-0'>{message}</p>}
      </form>
    </CardPage>
  )
}
