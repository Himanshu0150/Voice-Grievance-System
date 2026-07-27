import { Link } from 'react-router-dom'
import Button from '../../components/common/Button'

export default function Home() {
  const features = [
    { icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z', title: 'Voice Recording', desc: 'Record your complaint using voice in your native language.' },
    { icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z', title: 'Image Upload', desc: 'Attach images to provide visual evidence of the issue.' },
    { icon: 'M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z', title: 'GPS Location', desc: 'Automatically detect your location for precise mapping.' },
    { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', title: 'Track Status', desc: 'Track your complaint status in real-time from submission to resolution.' }
  ]

  const steps = [
    { number: '1', title: 'Register', desc: 'Create your account with basic details.' },
    { number: '2', title: 'Submit Complaint', desc: 'Describe your issue with voice, text, or images.' },
    { number: '3', title: 'Track Progress', desc: 'Monitor resolution status in real time.' },
    { number: '4', title: 'Get Resolution', desc: 'Receive updates when your issue is resolved.' }
  ]

  return (
    <>
      <section className="hero">
        <div className="hero-overlay" />
        <div className="hero-content">
          <div className="hero-badge">Panchayati Raj Department</div>
          <h1>Voice Your Concerns,<br />Get Them Resolved</h1>
          <p>Submit your grievances to the Gram Panchayat using voice, text, or images. Track resolution in real-time.</p>
          <div className="hero-actions">
            <Link to="/login"><Button size="lg" className="portal-btn citizen-btn">Citizen Login</Button></Link>
            <Link to="/admin/login"><Button variant="outline-light" size="lg" className="portal-btn admin-btn">Administrator Login</Button></Link>
          </div>
          <p className="hero-portal-hint">Citizens register and log in here &nbsp;&nbsp;|&nbsp;&nbsp; Administrators manage grievances</p>
        </div>
      </section>

      <section className="section features-section">
        <div className="container">
          <div className="section-header">
            <h2>Key Features</h2>
            <p>Modern tools designed for rural citizens</p>
          </div>
          <div className="features-grid">
            {features.map((f, i) => (
              <div key={i} className="feature-card">
                <div className="feature-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d={f.icon} />
                  </svg>
                </div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section how-it-works">
        <div className="container">
          <div className="section-header">
            <h2>How It Works</h2>
            <p>Simple 4-step process</p>
          </div>
          <div className="steps-grid">
            {steps.map((s, i) => (
              <div key={i} className="step-card">
                <div className="step-number">{s.number}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <h3>10,000+</h3>
              <p>Complaints Resolved</p>
            </div>
            <div className="stat-item">
              <h3>5,000+</h3>
              <p>Active Users</p>
            </div>
            <div className="stat-item">
              <h3>95%</h3>
              <p>Resolution Rate</p>
            </div>
            <div className="stat-item">
              <h3>500+</h3>
              <p>Villages Covered</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section contact-section">
        <div className="container">
          <div className="section-header">
            <h2>Contact Us</h2>
            <p>Get in touch with your Gram Panchayat</p>
          </div>
          <div className="contact-grid">
            <div className="contact-info">
              <div className="contact-item">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0B5ED7" strokeWidth="2"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                <div><h4>Phone</h4><p>1800-123-4567</p></div>
              </div>
              <div className="contact-item">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0B5ED7" strokeWidth="2"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                <div><h4>Email</h4><p>support@panchayat.gov.in</p></div>
              </div>
              <div className="contact-item">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0B5ED7" strokeWidth="2"><path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <div><h4>Address</h4><p>Panchayati Raj Department, Secretariat, State Capital</p></div>
              </div>
            </div>
            <div className="cta-card">
              <h3>Ready to Get Started?</h3>
              <p>Register now and submit your first complaint in minutes.</p>
              <Link to="/register"><Button size="lg">Register Now</Button></Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
