import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MDBBtn, MDBInput } from 'mdb-react-ui-kit'
import { CardPage } from '../components/common/CardPage'
import { loginUser, registerUser } from '../services/authService'

export function RegisterPage({ cfg, onAuth }) {
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  async function submit(event) {
    event.preventDefault()
    const registerResponse = await registerUser(cfg.authBaseUrl, login, password)
    if (!registerResponse.ok && registerResponse.status !== 409) {
      setMessage(`Ошибка регистрации: ${await registerResponse.text()}`)
      return
    }

    const { response, body } = await loginUser(cfg.authBaseUrl, login, password)
    if (!response.ok || !body.json?.token) {
      setMessage(`Регистрация выполнена, но вход не выполнен: ${body.text}`)
      return
    }

    onAuth(body.json.token, login)
    navigate('/')
  }

  return (
    <CardPage title='Регистрация'>
      <form onSubmit={submit} className='d-grid gap-3'>
        <MDBInput label='Логин' value={login} onChange={(e) => setLogin(e.target.value)} required />
        <MDBInput type='password' label='Пароль' value={password} onChange={(e) => setPassword(e.target.value)} required />
        <MDBBtn type='submit'>Создать аккаунт</MDBBtn>
        {message && <p className='text-danger mb-0'>{message}</p>}
      </form>
    </CardPage>
  )
}
