import React, { useState, useEffect } from 'react';

const API_BASE_URL = 'http://localhost:8000/api/v1';

const DirectMessages = ({ currentUser, isOpen, onClose, initialRecipientId }) => {
    const [conversations, setConversations] = useState([]);
    const [activeConversation, setActiveConversation] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let socket;
        if (isOpen && currentUser?.user_id && currentUser?.access_token && String(currentUser.access_token) !== 'undefined') {
            fetchConversations();

            const wsUrl = `ws://localhost:8000/api/v1/messaging/ws/${encodeURIComponent(currentUser.user_id)}`;
            socket = new WebSocket(wsUrl);

            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'new_message') {
                    // Update conversation list to show new last message
                    fetchConversations();

                    // If this message belongs to the current conversation, update messages
                    if (activeConversation && activeConversation._id === data.conversation_id) {
                        setMessages(prev => [...prev, data.message]);
                    }
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

    // Handle opening DM with a specific person from a mentor card
    useEffect(() => {
        if (isOpen && initialRecipientId) {
            const existing = conversations.find(c => c.participants.includes(initialRecipientId));
            if (existing) {
                setActiveConversation(existing);
            } else {
                // Temporary "phantom" conversation for new recipient
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
            } else {
                setMessages([]);
            }
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
            const res = await fetch(`${API_BASE_URL}/messaging/send?recipient_id=${encodeURIComponent(recipientId)}&sender_id=${encodeURIComponent(currentUser.user_id)}&content=${encodeURIComponent(newMessage)}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${currentUser.access_token}` }
            });
            const data = await res.json();

            if (activeConversation.isNew) {
                // For new conversations, we still refresh to get the real ID
                await fetchConversations();
                setNewMessage('');
            } else {
                setNewMessage('');
                // We no longer manually setMessages(prev => [...prev, data]);
                // The WebSocket notification 'new_message' will handle it for consistency.
                fetchConversations(); // Still refresh sidebar last message
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
            <div className="dm-container glass">
                <div className="dm-sidebar">
                    <div className="dm-sidebar-header">
                        <h3>הודעות</h3>
                        <button className="close-btn" onClick={onClose}>&times;</button>
                    </div>
                    <div className="conversation-list">
                        {conversations.length === 0 && !activeConversation?.isNew && (
                            <div className="dm-empty-sidebar">אין שיחות פעילות</div>
                        )}
                        {conversations.map(conv => (
                            <div
                                key={conv._id}
                                className={`conversation-item ${activeConversation?._id === conv._id ? 'active' : ''}`}
                                onClick={() => setActiveConversation(conv)}
                            >
                                <div className="conv-user">
                                    {conv.participants.find(p => p.toLowerCase() !== currentUser.user_id.toLowerCase())}
                                </div>
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
                                {activeConversation.isNew && (
                                    <div className="new-convo-hint">התחל שיחה חדשה עם מנטור זה</div>
                                )}
                                {messages.map((msg, i) => (
                                    <div key={i} className={`dm-message ${msg.sender_id === currentUser.user_id ? 'sent' : 'received'}`}>
                                        <div className="msg-content">{msg.content}</div>
                                        <div className="msg-time">{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'כרגע'}</div>
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
