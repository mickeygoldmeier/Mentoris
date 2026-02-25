import React, { useState, useEffect } from 'react';
import './index.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function App() {
  const [mentors, setMentors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'ai', text: 'היי! אני העוזר החכם של Mentoris. איך אוכל לעזור לך למצוא מנטור היום?' }]);
  const [chatInput, setChatInput] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);

  // Auth State
  const [currentUser, setCurrentUser] = useState(JSON.parse(localStorage.getItem('mentoris_user')));
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    fetch('http://localhost:8000/mentors')
      .then(res => res.json())
      .then(data => setMentors(data))
      .catch(err => console.error("Error fetching mentors:", err));

    // If logged in, fetch history
    if (currentUser) {
      loadHistory(currentUser.user_id);
    }
  }, [currentUser]);

  const loadHistory = async (userId) => {
    try {
      const res = await fetch(`http://localhost:8000/history/${userId}`);
      const data = await res.json();
      if (data.length > 0) {
        const formatted = data.flatMap(chat => [
          { role: 'user', text: chat.user_message },
          { role: 'ai', text: chat.ai_response }
        ]);
        setMessages([{ role: 'ai', text: 'ברוך הבא חזרה! הנה ההיסטוריה שלנו:' }, ...formatted]);
      }
    } catch (err) {
      console.error("Error loading history:", err);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = authMode === 'login' ? 'login' : 'signup';
    try {
      const res = await fetch(`http://localhost:8000/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('mentoris_user', JSON.stringify(data));
        setCurrentUser(data);
      } else {
        setAuthError(data.detail || 'שגיאה בתהליך ההתחברות');
      }
    } catch (err) {
      setAuthError('מצטער, חלה שגיאה בחיבור לשרת.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mentoris_user');
    setCurrentUser(null);
    setMessages([{ role: 'ai', text: 'היי! אני העוזר החכם של Mentoris. איך אוכל לעזור לך למצוא מנטור היום?' }]);
  };

  const filteredMentors = mentors.filter(mentor => {
    const searchLow = searchTerm.toLowerCase();
    return (
      mentor["רקע רלוונטי"]?.toLowerCase().includes(searchLow) ||
      mentor["באיזה תחומים אתם מציעים מנטורינג?"]?.toLowerCase().includes(searchLow) ||
      mentor["טוויטר / שם"]?.toLowerCase().includes(searchLow)
    );
  });

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !currentUser) return;

    const newMessages = [...messages, { role: 'user', text: chatInput }];
    setMessages(newMessages);
    setChatInput('');
    setLoadingChat(true);

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: chatInput,
          user_id: currentUser.user_id
        })
      });
      const data = await response.json();
      setMessages([...newMessages, { role: 'ai', text: data.response }]);
    } catch (err) {
      setMessages([...newMessages, { role: 'ai', text: 'מצטער, חלה שגיאה בחיבור לשרת.' }]);
    } finally {
      setLoadingChat(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="auth-overlay">
        <form className="auth-form" onSubmit={handleAuth}>
          <div className="auth-header">
            <h2>Mentoris</h2>
            <p className="subtitle">
              {authMode === 'login'
                ? 'התחברו כדי למצוא את המנטור המושלם עבורכם'
                : 'הצטרפו לקהילה שלנו ומצאו מנטור עוד היום'}
            </p>
          </div>

          {authError && <div style={{ color: '#ef4444', textAlign: 'center', fontSize: '0.9rem' }}>{authError}</div>}

          <div className="form-group">
            <input
              type="email"
              placeholder="אימייל"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <input
              type="password"
              placeholder="סיסמה"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit">
            {authMode === 'login' ? 'התחברות' : 'יצירת חשבון'}
          </button>

          <div className="toggle-auth">
            {authMode === 'login' ? (
              <p>אין לכם חשבון? <span onClick={() => setAuthMode('signup')}>הירשמו כאן</span></p>
            ) : (
              <p>כבר יש לכם חשבון? <span onClick={() => setAuthMode('login')}>התחברו כאן</span></p>
            )}
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="user-profile">
        <span className="user-email">{currentUser.user_id}</span>
        <button className="logout-btn" onClick={handleLogout}>התנתקות</button>
      </div>
      <header>
        <h1>Mentoris</h1>
        <p>מצאו את המנטור המושלם עבורכם</p>
      </header>

      <section className="search-section">
        <input
          type="text"
          placeholder="חפשו לפי טכנולוגיה, תחום או שם..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </section>

      <div className="mentor-grid">
        {filteredMentors.map((mentor, index) => (
          <div className="mentor-card" key={index} style={{ animationDelay: `${index * 0.05}s` }}>
            <div className="mentor-name">{mentor["טוויטר / שם"] || "אנונימי"}</div>
            <div className="mentor-fields">{mentor["באיזה תחומים אתם מציעים מנטורינג?"]}</div>
            <div className="mentor-background">{mentor["רקע רלוונטי"]}</div>
            {mentor["איך ליצור קשר בנוסף ל-DM?"] && (
              <a href={mentor["איך ליצור קשר בנוסף ל-DM?"]} className="mentor-contact" target="_blank" rel="noreferrer">
                צרו קשר
              </a>
            )}
          </div>
        ))}
      </div>

      <div className="chat-bubble-toggle" onClick={() => setChatOpen(!chatOpen)}>
        {chatOpen ? '✕' : '💬'}
      </div>

      {chatOpen && (
        <div className="chat-window">
          <div className="chat-header">Matchmaker AI</div>
          <div className="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`message ${m.role}`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.text}</ReactMarkdown>
              </div>
            ))}
            {loadingChat && <div className="message ai">חושב...</div>}
          </div>
          <div className="chat-input-area">
            <input
              type="text"
              placeholder="כתבו הודעה..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button onClick={handleSendMessage}>שלח</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
