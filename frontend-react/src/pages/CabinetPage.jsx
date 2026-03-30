import { useEffect, useState } from 'react'
import { CardPage } from '../components/common/CardPage'
import { fetchMyOrders } from '../services/orderService'

export function CabinetPage({ cfg, token }) {
  const [orders, setOrders] = useState([])
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setMessage('Выполните вход, чтобы видеть заказы')
      setOrders([])
      return
    }

    fetchMyOrders(cfg.backendBaseUrl, token)
      .then((data) => {
        setOrders(data)
        setMessage('')
      })
      .catch((err) => {
        setMessage(`Не удалось загрузить заказы: ${err.message}`)
      })
  }, [cfg.backendBaseUrl, token])

  return (
    <CardPage title='Личный кабинет'>
      {message && <p>{message}</p>}
      {orders.length > 0 && (
        <ul className='mb-0'>
          {orders.map((order) => (
            <li key={order.id}>#{order.id} • {order.productName} • {order.quantity} шт. • <strong>{order.status}</strong></li>
          ))}
        </ul>
      )}
    </CardPage>
  )
}
