import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MDBBtn,
  MDBCard,
  MDBCardBody,
  MDBCardImage,
  MDBCardText,
  MDBCardTitle,
  MDBCol,
  MDBInput,
  MDBRow
} from 'mdb-react-ui-kit'
import { fetchProducts } from '../services/productService'
import { checkoutOrder } from '../services/orderService'

export function ShowcasePage({ cfg, cart, setCart, token }) {
  const [products, setProducts] = useState([])
  const [qtyMap, setQtyMap] = useState({})
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchProducts(cfg.backendBaseUrl)
      .then(setProducts)
      .catch(() => setMessage('Не удалось загрузить витрину товаров'))
  }, [cfg.backendBaseUrl])

  function addToCart(product) {
    const qty = Number(qtyMap[product.id] || 1)
    if (qty < 1) return
    const key = String(product.id)
    const previous = cart[key]

    setCart({
      ...cart,
      [key]: {
        product,
        quantity: previous ? previous.quantity + qty : qty
      }
    })
    setMessage(`Добавлено в корзину: ${product.name}`)
  }

  async function checkout() {
    const items = Object.values(cart).map((item) => ({
      productId: item.product.id,
      quantity: item.quantity
    }))

    if (items.length === 0) {
      setMessage('Корзина пуста')
      return
    }
    if (!token) {
      navigate('/login')
      return
    }

    const response = await checkoutOrder(cfg.backendBaseUrl, token, items)
    if (!response.ok) {
      setMessage(`Ошибка оформления заказа: ${await response.text()}`)
      return
    }

    setCart({})
    setMessage('Заказ оформлен. Проверьте личный кабинет.')
    navigate('/cabinet')
  }

  return (
    <>
      <MDBRow className='my-4 g-4'>
        {products.map((product) => (
          <MDBCol key={product.id} md='6' lg='4'>
            <MDBCard className='h-100 shadow-2'>
              <MDBCardImage src={product.imageUrl} alt={product.name} position='top' style={{ height: '220px', objectFit: 'cover' }} />
              <MDBCardBody className='d-flex flex-column'>
                <MDBCardTitle>{product.name}</MDBCardTitle>
                <MDBCardText className='text-muted mb-3'>{product.price} USD</MDBCardText>
                <div className='d-flex gap-2 mt-auto'>
                  <MDBInput
                    type='number'
                    min='1'
                    value={qtyMap[product.id] || 1}
                    onChange={(e) => setQtyMap({ ...qtyMap, [product.id]: e.target.value })}
                    label='Кол-во'
                  />
                  <MDBBtn onClick={() => addToCart(product)}>В корзину</MDBBtn>
                </div>
              </MDBCardBody>
            </MDBCard>
          </MDBCol>
        ))}
      </MDBRow>

      <MDBCard className='shadow-1 mb-4'>
        <MDBCardBody>
          <h5>Корзина</h5>
          {Object.values(cart).length === 0 ? (
            <p className='mb-2 text-muted'>Пусто</p>
          ) : (
            <ul className='mb-3'>
              {Object.values(cart).map((item) => (
                <li key={item.product.id}>{item.product.name} x {item.quantity}</li>
              ))}
            </ul>
          )}
          <MDBBtn onClick={checkout}>Оформить заказ</MDBBtn>
          {message && <p className='mt-3 mb-0'>{message}</p>}
        </MDBCardBody>
      </MDBCard>
    </>
  )
}
