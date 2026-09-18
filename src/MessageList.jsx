import React from 'react';

const MessageList = ({ messages, lastMessageRef }) => {
  return (
    <div className="message-list">
      {messages.map((msg, index) => (
        <div key={msg.id} className={`message-container ${msg.sender}`}>
          <div
            className={`message ${msg.sender}`}
            ref={index === messages.length - 1 ? lastMessageRef : null}>
            {msg.text}
          </div>
        </div>
      ))}
    </div>
  );
};

export default MessageList;
