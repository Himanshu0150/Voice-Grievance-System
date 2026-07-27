import { Link } from 'react-router-dom'
import Button from '../../components/common/Button'

export default function ServerError() {
  return (
    <div className="error-page">
      <div className="error-page-content">
        <h1 className="error-code">500</h1>
        <h2>Server Error</h2>
        <p>Something went wrong on our end. Please try again later.</p>
        <div className="error-actions">
          <Link to="/"><Button>Go Home</Button></Link>
          <Button variant="secondary" onClick={() => window.location.reload()}>
            Refresh Page
          </Button>
        </div>
      </div>
    </div>
  )
}
