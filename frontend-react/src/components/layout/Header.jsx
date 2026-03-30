import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  MDBBadge,
  MDBBtn,
  MDBCollapse,
  MDBContainer,
  MDBNavbar,
  MDBNavbarBrand,
  MDBNavbarItem,
  MDBNavbarNav,
  MDBNavbarToggler
} from 'mdb-react-ui-kit'

export function Header({ token, cartCount, onLogout }) {
  const [showNav, setShowNav] = useState(false)

  return (
    <MDBNavbar expand='lg' light bgColor='light' className='shadow-2 rounded-4 px-3 mt-3'>
      <MDBContainer fluid>
        <MDBNavbarBrand tag={Link} to='/'>
          <span className='logo-dot' /> NovaShop
        </MDBNavbarBrand>
        <MDBNavbarToggler onClick={() => setShowNav(!showNav)}>
          <span className='navbar-toggler-icon'></span>
        </MDBNavbarToggler>
        <MDBCollapse navbar open={showNav} className='justify-content-end'>
          <MDBNavbarNav fullWidth={false} className='ms-auto align-items-lg-center gap-lg-2'>
            <MDBNavbarItem>
              <Link className='nav-link' to='/'>Витрина</Link>
            </MDBNavbarItem>
            <MDBNavbarItem>
              <Link className='nav-link' to='/cabinet'>Личный кабинет</Link>
            </MDBNavbarItem>
            <MDBNavbarItem>
              <Link className='nav-link' to='/admin'>Админ-панель</Link>
            </MDBNavbarItem>
            {token ? (
              <MDBNavbarItem>
                <MDBBtn size='sm' color='danger' onClick={onLogout}>Выйти</MDBBtn>
              </MDBNavbarItem>
            ) : (
              <>
                <MDBNavbarItem>
                  <MDBBtn size='sm' color='secondary' tag={Link} to='/login'>Вход</MDBBtn>
                </MDBNavbarItem>
                <MDBNavbarItem>
                  <MDBBtn size='sm' color='primary' tag={Link} to='/register'>Регистрация</MDBBtn>
                </MDBNavbarItem>
              </>
            )}
            <MDBNavbarItem className='ms-lg-2 mt-1'>
              <MDBBadge color='info'>Корзина: {cartCount}</MDBBadge>
            </MDBNavbarItem>
          </MDBNavbarNav>
        </MDBCollapse>
      </MDBContainer>
    </MDBNavbar>
  )
}
