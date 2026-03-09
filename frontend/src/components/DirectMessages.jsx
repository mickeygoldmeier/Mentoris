import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { API_BASE_URL } from '../config';

const DirectMessages = ({ isOpen, onClose, initialRecipientId }) => {
    const { currentUser } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        let socket;
        if (isOpen && currentUser?.user_id && currentUser?.access_token && String(currentUser.access_token) !== 'undefined') {
            fetchConversations();

            const wsUrl = `ws://localhost:8000/api/v1/messaging/ws/${encodeURIComponent(currentUser.user_id)}`;
            socket = new WebSocket(wsUrl);

            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'new_message') {
                    if (activeConversation && activeConversation._id === data.conversation_id) {
                        setMessages(prev => [...prev, data.message]);
                        markAsRead(data.conversation_id);
                    }
                    fetchConversations();
                }
            };

            socket.onclose = () => {
                console.log("WebSocket closed");
            };

            socket.onerror = (err) => {
                console.error("WebSocket error:", err);
            };
        }

        return () => {
            if (socket) socket.close();
        };
    }, [isOpen, currentUser?.user_id, currentUser?.access_token, activeConversation?._id]);

    useEffect(() => {
        if (activeConversation && activeConversation._id !== 'new') {
            fetchMessages(activeConversation._id);
        }
    }, [activeConversation?._id]);

    useEffect(() => {
        if (isOpen && initialRecipientId) {
            const existing = conversations.find(c => c.participants.includes(initialRecipientId));
            if (existing) {
                setActiveConversation(existing);
            } else {
                setActiveConversation({
                    _id: 'new',
                    participants: [currentUser.user_id, initialRecipientId],
                    isNew: true
                });
                setMessages([]);
            }
        }
    }, [isOpen, initialRecipientId, conversations]);

    const fetchConversations = async () => {
        if (!currentUser?.user_id || !currentUser?.access_token || String(currentUser.access_token) === 'undefined' || String(currentUser.access_token) === 'null') {
            console.error("Missing or malformed credentials for fetchConversations");
            return;
        }
        try {
            const encodedId = encodeURIComponent(currentUser.user_id);
            const res = await fetch(`${API_BASE_URL}/messaging/conversations/${encodedId}`, {
                headers: { 'Authorization': `Bearer ${currentUser.access_token}` }
            });
            if (!res.ok) {
                console.error(`fetchConversations failed: ${res.status} ${await res.text()}`);
                return;
            }
            const data = await res.json();
            if (Array.isArray(data)) {
                setConversations(data);
            } else {
                setConversations([]);
            }
        } catch (err) {
            console.error("Error fetching conversations:", err);
        }
    };

    const fetchMessages = async (convId) => {
        if (convId === 'new' || !currentUser?.access_token || String(currentUser.access_token) === 'undefined' || String(currentUser.access_token) === 'null') return;
        try {
            const res = await fetch(`${API_BASE_URL}/messaging/history/${convId}`, {
                headers: { 'Authorization': `Bearer ${currentUser.access_token}` }
            });
            if (!res.ok) {
                console.error(`fetchMessages failed: ${res.status} ${await res.text()}`);
                return;
            }
            const data = await res.json();
            if (Array.isArray(data)) {
                setMessages(data);
                markAsRead(convId);
            } else {
                setMessages([]);
            }
        } catch (err) {
            console.error("Error fetching messages:", err);
        }
    };

    const markAsRead = async (convId) => {
        if (!convId || convId === 'new' || !currentUser?.access_token) return;
        try {
            await fetch(`${API_BASE_URL}/messaging/read/${convId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${currentUser.access_token}` }
            });
            setConversations(prev => prev.map(c =>
                c._id === convId ? { ...c, unread_by: (c.unread_by || []).filter(email => email !== currentUser.user_id) } : c
            ));
        } catch (err) {
            console.error("Error marking as read:", err);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeConversation) return;

        const recipientId = activeConversation.participants.find(p => p !== currentUser.user_id);

        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/messaging/send?recipient_id=${encodeURIComponent(recipientId)}&sender_id=${encodeURIComponent(currentUser.user_id)}&content=${encodeURIComponent(newMessage)}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${currentUser.access_token}` }
            });
            await res.json();

            setNewMessage('');

            if (activeConversation.isNew) {
                // Manually fetch the new conversation list to get the real MongoDB _id
                const convRes = await fetch(`${API_BASE_URL}/messaging/conversations/${encodeURIComponent(currentUser.user_id)}`, {
                    headers: { 'Authorization': `Bearer ${currentUser.access_token}` }
                });
                const convData = await convRes.json();
                setConversations(convData);

                // Set the newly created conversation as active so messages stream in
                const newConv = convData.find(c => c.participants.includes(recipientId));
                if (newConv) {
                    setActiveConversation(newConv);
                }
            } else {
                fetchConversations();
            }
        } catch (err) {
            console.error("Error sending message:", err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="dm-overlay">
            <div className={`dm-container glass ${activeConversation ? 'chat-active' : ''}`}>
                <button className="close-btn absolute-close" onClick={onClose}>&times;</button>
                <div className="dm-sidebar">
                    <div className="dm-sidebar-header">
                        <h3>הודעות</h3>
                    </div>
                    <div className="conversation-list">
                        {conversations.length === 0 && !activeConversation?.isNew && (
                            <div className="dm-empty-sidebar">אין שיחות פעילות</div>
                        )}
                        {conversations.map(conv => {
                            const isUnread = conv.unread_by?.includes(currentUser.user_id);
                            return (
                                <div
                                    key={conv._id}
                                    className={`conversation-item ${activeConversation?._id === conv._id ? 'active' : ''} ${isUnread ? 'unread' : ''}`}
                                    onClick={() => setActiveConversation(conv)}
                                >
                                    <div className="conv-content">
                                        <div className="conv-user">
                                            {conv.participants.find(p => p.toLowerCase() !== currentUser.user_id.toLowerCase())}
                                        </div>
                                        <div className="conv-last-msg">{conv.last_message?.content}</div>
                                    </div>
                                    {isUnread && <div className="unread-dot"></div>}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="dm-main">
                    {activeConversation ? (
                        <>
                            <div className="dm-header">
                                <button className="back-btn mobile-only" onClick={() => setActiveConversation(null)}>
                                    &rarr; חזור
                                </button>
                                <h4>{activeConversation.participants.find(p => p !== currentUser.user_id)}</h4>
                            </div>
                            <div className="dm-messages">
                                {activeConversation.isNew && (
                                    <div className="new-convo-hint">התחל שיחה חדשה עם מנטור זה</div>
                                )}
                                {messages.map((msg, i) => (
                                    <div key={i} className={`dm-message ${msg.sender_id === currentUser.user_id ? 'sent' : 'received'}`}>
                                        <div className="msg-content">{msg.content}</div>
                                        <div className="msg-time">{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'כרגע'}</div>
                                    </div>
                                ))}
                                <div ref={messagesEndRef} />
                            </div>
                            <form className="dm-input" onSubmit={handleSendMessage}>
                                <input
                                    type="text"
                                    placeholder="הקלד הודעה..."
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    disabled={loading}
                                />
                                <button type="submit" disabled={loading}>שלח</button>
                            </form>
                        </>
                    ) : (
                        <div className="dm-empty">
                            <div className="empty-state-card">
                                <div className="empty-icon">✉️</div>
                                <h3>ההודעות שלך</h3>
                                <p>בחר שיחה מהרשימה או שלח הודעה למנטור חדש כדי להתחיל.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DirectMessages;
