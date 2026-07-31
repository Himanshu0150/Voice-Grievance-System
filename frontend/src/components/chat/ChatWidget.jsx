import { useState, useRef, useEffect } from 'react'
import chatService from '../../services/chatService'

const QUICK_PROMPTS = [
  'How do I file a complaint?',
  'What documents do I need for ration card?',
  'Check my complaint status'
]

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Namaste! I am Sevak AI, your assistant. I can help you file complaints, check their status (e.g. "status of CMP-2026-000001"), and answer questions about government services.'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesRef = useRef(null)

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [messages, open])

  const sendMessage = async (text) => {
    const content = (text || input).trim()
    if (!content || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content }])
    setLoading(true)
    try {
      const res = await chatService.sendMessage(content)
      setMessages(prev => [...prev, { role: 'assistant', content: res.reply || res.message || 'Sorry, I could not answer that.' }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I am having trouble connecting right now. Please try again.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        className={`chat-fab ${open ? 'open' : ''}`}
        onClick={() => setOpen(prev => !prev)}
        aria-label="AI Assistant"
      >
        {open ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        )}
      </button>

      {open && (
        <div className="chat-widget">
          <div className="chat-widget-header">
            <div className="chat-widget-avatar">AI</div>
            <div>
              <strong>Sevak AI Assistant</strong>
              <small>Ask about complaints &amp; services</small>
            </div>
          </div>
          <div className="chat-widget-messages" ref={messagesRef}>
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                <span>{m.content}</span>
              </div>
            ))}
            {loading && (
              <div className="chat-msg assistant">
                <span className="chat-typing">Sevak is thinking<span className="chat-dots">...</span></span>
              </div>
            )}
          </div>
          <div className="chat-quick-prompts">
            {QUICK_PROMPTS.map(q => (
              <button key={q} onClick={() => sendMessage(q)}>{q}</button>
            ))}
          </div>
          <div className="chat-widget-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendMessage() }}
              placeholder="Type your question..."
            />
            <button onClick={() => sendMessage()} disabled={loading || !input.trim()}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  )
}
