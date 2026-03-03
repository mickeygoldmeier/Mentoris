import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function ChatWindow({
    chatOpen,
    setChatOpen,
    messages,
    chatInput,
    setChatInput,
    handleSendMessage,
    loadingChat
}) {
    return (
        <>
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
        </>
    );
}

export default ChatWindow;
