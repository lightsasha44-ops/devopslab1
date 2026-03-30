import { MDBCard, MDBCardBody } from 'mdb-react-ui-kit'

export function CardPage({ title, children }) {
  return (
    <MDBCard className='shadow-2 mt-4'>
      <MDBCardBody>
        <h3 className='mb-4'>{title}</h3>
        {children}
      </MDBCardBody>
    </MDBCard>
  )
}
