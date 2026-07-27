export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-brand">
            <h4>Panchayati Raj Grievance System</h4>
            <p>Empowering citizens through digital grievance resolution.</p>
          </div>
          <div className="footer-links">
            <div className="footer-section">
              <h5>Quick Links</h5>
              <a href="/">Home</a>
              <a href="/login">Login</a>
              <a href="/register">Register</a>
            </div>
            <div className="footer-section">
              <h5>Support</h5>
              <a href="#contact">Contact Us</a>
              <a href="#help">Help</a>
              <a href="#privacy">Privacy Policy</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; {new Date().getFullYear()} Panchayati Raj Department. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
