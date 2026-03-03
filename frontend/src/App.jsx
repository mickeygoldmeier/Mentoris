import React, { useState, useEffect } from 'react';
import './index.css';
import Auth from './components/Auth';
import Header from './components/Header';
import MentorCard from './components/MentorCard';
import ChatWindow from './components/ChatWindow';

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
      <Auth
        authMode={authMode}
        setAuthMode={setAuthMode}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        authError={authError}
        handleAuth={handleAuth}
        isMentor={isMentor}
        setIsMentor={setIsMentor}
        mentorName={mentorName}
        setMentorName={setMentorName}
        mentorFields={mentorFields}
        setMentorFields={setMentorFields}
        mentorBackground={mentorBackground}
        setMentorBackground={setMentorBackground}
        mentorContact={mentorContact}
        setMentorContact={setMentorContact}
      />
    );
  }

  return (
    <div className="container">
      <Header
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        currentUser={currentUser}
        handleLogout={handleLogout}
      />

      <div className="mentor-grid">
        {filteredMentors.map((mentor, index) => (
          <MentorCard
            key={index}
            mentor={mentor}
            index={index}
            setSearchTerm={setSearchTerm}
          />
        ))}
      </div>

      <ChatWindow
        chatOpen={chatOpen}
        setChatOpen={setChatOpen}
        messages={messages}
        chatInput={chatInput}
        setChatInput={setChatInput}
        handleSendMessage={handleSendMessage}
        loadingChat={loadingChat}
      />
    </div>
  );
}

export default App;
