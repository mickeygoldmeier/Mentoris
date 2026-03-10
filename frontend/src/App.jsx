import React, { useState, useEffect } from 'react';
import './index.css';
import { useAuth } from './context/AuthContext.jsx';
import { API_BASE_URL } from './config';
import Auth from './components/Auth';
import Header from './components/Header';
import MentorCard from './components/MentorCard';
import ChatWindow from './components/ChatWindow';
import DirectMessages from './components/DirectMessages';
import MentorDashboard from './components/MentorDashboard';
import BookingModal from './components/BookingModal';

function App() {
  const { currentUser, logout } = useAuth();

  const [mentors, setMentors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'ai', text: 'היי! אני העוזר החכם של Mentoris. איך אוכל לעזור לך למצוא מנטור היום?' }]);
  const [chatInput, setChatInput] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const [dmOpen, setDmOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [initialRecipientId, setInitialRecipientId] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingMentorId, setBookingMentorId] = useState(null);
  const [bookingMentorName, setBookingMentorName] = useState('');

  useEffect(() => {
    fetch(`${API_BASE_URL}/mentors/`)
      .then(res => res.json())
      .then(data => setMentors(data))
      .catch(err => console.error("Error fetching mentors:", err));

    if (currentUser?.access_token && currentUser.access_token !== 'undefined') {
      loadHistory(currentUser.user_id);
    }
  }, [currentUser]);

  // Poll for unread count if logged in
  useEffect(() => {
    let interval;
    if (currentUser?.user_id && currentUser?.access_token) {
      const fetchUnread = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/messaging/conversations/${encodeURIComponent(currentUser.user_id)}`, {
            headers: { 'Authorization': `Bearer ${currentUser.access_token}` }
          });
          const data = await res.json();
          if (Array.isArray(data)) {
            const count = data.filter(c => c.unread_by?.includes(currentUser.user_id)).length;
            setUnreadCount(count);
          }
        } catch (err) {
          console.error("Error fetching unread count:", err);
        }
      };
      fetchUnread();
      interval = setInterval(fetchUnread, 10000);
    }
    return () => clearInterval(interval);
  }, [currentUser]);

  const loadHistory = async (userId) => {
    if (!currentUser?.access_token || String(currentUser.access_token) === 'undefined' || String(currentUser.access_token) === 'null') return;
    try {
      const encodedId = encodeURIComponent(userId);
      const res = await fetch(`${API_BASE_URL}/chat/history/${encodedId}`, {
        headers: {
          'Authorization': `Bearer ${currentUser.access_token}`
        }
      });
      if (res.status === 401) {
        console.warn("Session expired (401). Logging out.");
        logout();
        return;
      }
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
    if (!chatInput.trim() || !currentUser || !currentUser.access_token || currentUser.access_token === 'undefined') return;

    const newMessages = [...messages, { role: 'user', text: chatInput }];
    setMessages(newMessages);
    setChatInput('');
    setLoadingChat(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.access_token}`
        },
        body: JSON.stringify({
          message: chatInput,
          user_id: currentUser.user_id
        })
      });
      const data = await response.json();
      setMessages([...newMessages, { role: 'ai', text: data.response }]);
    } catch {
      setMessages([...newMessages, { role: 'ai', text: 'מצטער, חלה שגיאה בחיבור לשרת.' }]);
    } finally {
      setLoadingChat(false);
    }
  };

  if (!currentUser) {
    return <Auth />;
  }

  return (
    <div className="container">
      <Header
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onOpenDMs={() => setDmOpen(true)}
        onOpenDashboard={() => setDashboardOpen(true)}
        unreadCount={unreadCount}
      />

      <div className="mentor-grid">
        {filteredMentors.map((mentor, index) => (
          <MentorCard
            key={index}
            mentor={mentor}
            index={index}
            setSearchTerm={setSearchTerm}
            onOpenDMs={(mentorId) => {
              setInitialRecipientId(mentorId);
              setDmOpen(true);
            }}
            onBookSession={(mentorId, mentorName) => {
              setBookingMentorId(mentorId);
              setBookingMentorName(mentorName);
              setBookingOpen(true);
            }}
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

      <DirectMessages
        isOpen={dmOpen}
        onClose={() => {
          setDmOpen(false);
          setInitialRecipientId(null);
        }}
        initialRecipientId={initialRecipientId}
        onClearInitialRecipient={() => setInitialRecipientId(null)}
      />

      <MentorDashboard
        isOpen={dashboardOpen}
        onClose={() => setDashboardOpen(false)}
      />

      <BookingModal
        isOpen={bookingOpen}
        onClose={() => {
          setBookingOpen(false);
          setBookingMentorId(null);
          setBookingMentorName('');
        }}
        mentorId={bookingMentorId}
        mentorName={bookingMentorName}
      />
    </div>
  );
}

export default App;
