import React, { useState, useEffect } from 'react';

const DirectMessages = ({ currentUser, isOpen, onClose }) => {
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && currentUser) {
            fetchConversations();
        }
    }, [isOpen, currentUser]);

    useEffect(() => {
        if (activeConversation) {
            fetchMessages(activeConversation._id);
        }
    }, [activeConversation]);

    const fetchConversations = async () => {
        try {
            const res = await fetch(`http://localhost:8000/messaging/conversations/${currentUser.user_id}`, {
                headers: { 'Authorization': `Bearer ${currentUser.access_token}` }
            });
            const data = await res.json();
            setConversations(data);
        } catch (err) {
            console.error("Error fetching conversations:", err);
        }
    };

    const fetchMessages = async (convId) => {
        try {
            const res = await fetch(`http://localhost:8000/messaging/history/${convId}`, {
                headers: { 'Authorization': `Bearer ${currentUser.access_token}` }
            });
            const data = await res.json();
            setMessages(data);
        } catch (err) {
            console.error("Error fetching messages:", err);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeConversation) return;

        const recipientId = activeConversation.participants.find(p => p !== currentUser.user_id);

        try {
            setLoading(true);
            const res = await fetch(`http://localhost:8000/messaging/send?recipient_id=${recipientId}&sender_id=${currentUser.user_id}&content=${encodeURIComponent(newMessage)}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${currentUser.access_token}` }
            });
            const data = await res.json();
            setMessages([...messages, data]);
            setNewMessage('');
            fetchConversations(); // Refresh last message in sidebar
        } catch (err) {
            console.error("Error sending message:", err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="dm-overlay">
            <div className="dm-container glass">
                <div className="dm-sidebar">
                    <div className="dm-sidebar-header">
                        <h3>הודעות</h3>
                        <button className="close-btn" onClick={onClose}>&times;</button>
                    </div>
                    <div className="conversation-list">
                        {conversations.map(conv => (
                            <div
                                key={conv._id}
                                className={`conversation-item ${activeConversation?._id === conv._id ? 'active' : ''}`}
                                onClick={() => setActiveConversation(conv)}
                            >
                                <div className="conv-user">{conv.participants.find(p => p !== currentUser.user_id)}</div>
                                <div className="conv-last-msg">{conv.last_message?.content}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="dm-main">
                    {activeConversation ? (
                        <>
                            <div className="dm-header">
                                <h4>{activeConversation.participants.find(p => p !== currentUser.user_id)}</h4>
                            </div>
                            <div className="dm-messages">
                                {messages.map((msg, i) => (
                                    <div key={i} className={`dm-message ${msg.sender_id === currentUser.user_id ? 'sent' : 'received'}`}>
                                        <div className="msg-content">{msg.content}</div>
                                        <div className="msg-time">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                    </div>
                                ))}
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
                            <p>בחר שיחה כדי להתחיל</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DirectMessages;
