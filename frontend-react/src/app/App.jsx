import { useEffect, useMemo, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { MDBContainer } from 'mdb-react-ui-kit'
import { useApiConfig } from '../hooks/useApiConfig'
import { Header } from '../components/layout/Header'
import { LoginPage } from '../pages/LoginPage'
import { RegisterPage } from '../pages/RegisterPage'
import { ShowcasePage } from '../pages/ShowcasePage'
import { CabinetPage } from '../pages/CabinetPage'
import { AdminPage } from '../pages/AdminPage'

export default function App() {
  const cfg = useApiConfig()
  const [token, setToken] = useState(localStorage.getItem('sessionToken') || '')
  const [login, setLogin] = useState(localStorage.getItem('login') || '')
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cart') || '{}')
    } catch (_err) {
      return {}
    }
  })

  useEffect(() => {
    localStorage.setItem('sessionToken', token)
    localStorage.setItem('login', login)
  }, [token, login])

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart))
  }, [cart])

  function onAuth(nextToken, nextLogin) {
    setToken(nextToken)
    setLogin(nextLogin)
  }

  function logout() {
    setToken('')
    setLogin('')
  }

  const cartCount = useMemo(
    () => Object.values(cart).reduce((acc, item) => acc + Number(item.quantity || 0), 0),
    [cart]
  )

  if (!cfg) {
    return <MDBContainer className='py-5'>Загрузка...</MDBContainer>
  }

  return (
    <MDBContainer className='pb-5'>
      <Header token={token} cartCount={cartCount} onLogout={logout} />
      {login && <p className='mt-3 mb-0'>Вы вошли как <strong>{login}</strong></p>}
      <Routes>
        <Route path='/' element={<ShowcasePage cfg={cfg} cart={cart} setCart={setCart} token={token} />} />
        <Route path='/login' element={<LoginPage cfg={cfg} onAuth={onAuth} />} />
        <Route path='/register' element={<RegisterPage cfg={cfg} onAuth={onAuth} />} />
        <Route path='/cabinet' element={<CabinetPage cfg={cfg} token={token} />} />
        <Route path='/admin' element={<AdminPage cfg={cfg} token={token} />} />
        <Route path='*' element={<Navigate to='/' replace />} />
      </Routes>
    </MDBContainer>
  )
}
