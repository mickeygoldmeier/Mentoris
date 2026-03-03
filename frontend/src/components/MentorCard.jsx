import React from 'react';

function MentorCard({ mentor, index, setSearchTerm }) {
    return (
        <div className="mentor-card" style={{ animationDelay: `${index * 0.05}s` }}>
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
    );
}

export default MentorCard;
