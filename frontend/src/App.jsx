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

  const [isMentor, setIsMentor] = useState(false);
  const [mentorName, setMentorName] = useState('');
  const [mentorFields, setMentorFields] = useState('');
  const [mentorBackground, setMentorBackground] = useState('');
  const [mentorContact, setMentorContact] = useState('');

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

    const payload = {
      email,
      password,
      role: isMentor && authMode === 'signup' ? 'mentor' : 'mentee'
    };

    if (isMentor && authMode === 'signup') {
      payload.mentor_data = {
        name: mentorName,
        fields: mentorFields,
        background: mentorBackground,
        contact: mentorContact
      };
    }

    try {
      const res = await fetch(`http://localhost:8000/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
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
    const name = (mentor["טוויטר / שם"] || mentor.name || "").toLowerCase();
    const fields = (mentor["באיזה תחומים אתם מציעים מנטורינג?"] || mentor.fields || "").toLowerCase();
    const background = (mentor["רקע רלוונטי"] || mentor.background || "").toLowerCase();
    const summary = (mentor.summary || "").toLowerCase();
    const tags = (mentor.tags || []).join(" ").toLowerCase();
    const role = (mentor.role || "").toLowerCase();

    return (
      name.includes(searchLow) ||
      fields.includes(searchLow) ||
      background.includes(searchLow) ||
      summary.includes(searchLow) ||
      tags.includes(searchLow) ||
      role.includes(searchLow)
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

          {authMode === 'signup' && (
            <div className="mentor-signup-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={isMentor}
                  onChange={e => setIsMentor(e.target.checked)}
                />
                אני רוצה להצטרף כמנטור
              </label>
            </div>
          )}

          {authMode === 'signup' && isMentor && (
            <div className="mentor-extra-fields">
              <div className="form-group">
                <input
                  type="text"
                  placeholder="שם / טוויטר"
                  value={mentorName}
                  onChange={e => setMentorName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="תחומי מנטורינג (למשל: Frontend, Python)"
                  value={mentorFields}
                  onChange={e => setMentorFields(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <textarea
                  placeholder="רקע רלוונטי"
                  value={mentorBackground}
                  onChange={e => setMentorBackground(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="איך ליצור קשר (לינק או פרטים)"
                  value={mentorContact}
                  onChange={e => setMentorContact(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <button type="submit">
            {authMode === 'login' ? 'התחברות' : (isMentor ? 'הרשמה כמנטור' : 'יצירת חשבון')}
          </button>

          <div className="toggle-auth">
            {authMode === 'login' ? (
              <p>אין לכם חשבון? <span onClick={() => { setAuthMode('signup'); setIsMentor(false); }}>הירשמו כאן</span></p>
            ) : (
              <p>כבר יש לכם חשבון? <span onClick={() => { setAuthMode('login'); setIsMentor(false); }}>התחברו כאן</span></p>
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
            <div className="mentor-card-header">
              <div className="mentor-name">{mentor["טוויטר / שם"] || mentor.name || "אנונימי"}</div>
              {mentor.role && <div className="mentor-role-badge">{mentor.role}</div>}
            </div>

            {mentor.summary && <div className="mentor-summary">{mentor.summary}</div>}

            <div className="mentor-fields">
              <strong>תחומי התמחות:</strong> {mentor["באיזה תחומים אתם מציעים מנטורינג?"] || mentor.fields}
            </div>

            <div className="mentor-background">
              <strong>רקע:</strong> {mentor["רקע רלוונטי"] || mentor.background}
            </div>

            {mentor.tags && mentor.tags.length > 0 && (
              <div className="mentor-tags">
                {mentor.tags.map((tag, i) => (
                  <span key={i} className="tag-chip" onClick={() => setSearchTerm(tag.replace('#', ''))}>
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="mentor-contact-container">
              {mentor.contact && typeof mentor.contact === 'object' ? (
                <>
                  {mentor.contact.email && <a href={`mailto:${mentor.contact.email}`} className="contact-link email">📧 אימייל</a>}
                  {mentor.contact.calendar && <a href={mentor.contact.calendar} className="contact-link calendar" target="_blank" rel="noreferrer">📅 יומן</a>}
                  {mentor.contact.phone && <span className="contact-link phone">📞 {mentor.contact.phone}</span>}
                  {mentor.contact.free_text && <div className="contact-free-text">{mentor.contact.free_text}</div>}
                </>
              ) : (
                mentor["איך ליצור קשר בנוסף ל-DM?"] && (
                  <a href={mentor["איך ליצור קשר בנוסף ל-DM?"]} className="contact-link generic" target="_blank" rel="noreferrer">
                    צרו קשר
                  </a>
                )
              )}
            </div>
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
