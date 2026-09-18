import React, { useEffect, useState } from 'react';
import Login from './Login.jsx';
import Chat from './Chat.jsx';
import { DEFAULT_MESSENGER, getMessenger } from './messengers.js';

function App() {
  const [messengerId, setMessengerId] = useState(DEFAULT_MESSENGER);
  const [credentials, setCredentials] = useState(null);

  // Токены темы объявлены на :root, чтобы перекрашивался и фон страницы
  useEffect(() => {
    document.documentElement.dataset.messenger = messengerId;
  }, [messengerId]);

  return (
    <div className="App">
      {!credentials ? (
        <Login
          messengerId={messengerId}
          onMessengerChange={setMessengerId}
          onLogin={setCredentials}
        />
      ) : (
        <Chat
          messenger={getMessenger(messengerId)}
          credentials={credentials}
          onBack={() => setCredentials(null)}
        />
      )}
    </div>
  );
}

export default App;
