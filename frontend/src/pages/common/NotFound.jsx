import { Link } from 'react-router-dom'
import Button from '../../components/common/Button'

export default function NotFound() {
  return (
    <div className="error-page">
      <div className="error-page-content">
        <h1 className="error-code">404</h1>
        <h2>Page Not Found</h2>
        <p>The page you are looking for does not exist or has been moved.</p>
        <div className="error-actions">
          <Link to="/"><Button>Go Home</Button></Link>
          <Link to="/dashboard"><Button variant="secondary">Dashboard</Button></Link>
        </div>
      </div>
    </div>
  )
}
