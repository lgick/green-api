import React, { useState } from 'react';
import { MESSENGER_LIST, getMessenger } from './messengers.js';
import { apiErrorText, createGreenApiClient } from './api/greenApi.js';

const EMPTY_CREDENTIALS = { idInstance: '', apiTokenInstance: '' };

const Login = ({ messengerId, onMessengerChange, onLogin }) => {
  // Раздельные учётные данные по мессенджеру, чтобы MAX и WhatsApp не путались
  // друг с другом (в том числе через автозаполнение браузера).
  const [credentials, setCredentials] = useState({
    max: { ...EMPTY_CREDENTIALS },
    whatsapp: { ...EMPTY_CREDENTIALS },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const current = credentials[messengerId];

  const updateField = (field, value) =>
    setCredentials(prev => ({
      ...prev,
      [messengerId]: { ...prev[messengerId], [field]: value },
    }));

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const session = { ...current, apiUrl: getMessenger(messengerId).apiUrl };

    try {
      const data = await createGreenApiClient(session).getStateInstance();

      if (data?.stateInstance === 'authorized') {
        onLogin(session);
        return;
      }

      console.warn('Instance not authorized:', data?.stateInstance);
      setError(stateErrorText(data?.stateInstance));
    } catch (err) {
      setError(apiErrorText(err, 'Failed to check instance state'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      <div className="messenger-switch" role="radiogroup" aria-label="Messenger">
        {MESSENGER_LIST.map(item => (
          <label
            key={item.id}
            className={
              item.id === messengerId
                ? 'messenger-switch-option is-active'
                : 'messenger-switch-option'
            }>
            <input
              type="radio"
              name="messenger"
              value={item.id}
              checked={item.id === messengerId}
              onChange={() => onMessengerChange(item.id)}
              disabled={loading}
            />
            {item.name}
          </label>
        ))}
      </div>
      <input
        key={`idInstance-${messengerId}`}
        type="text"
        name={`idInstance-${messengerId}`}
        autoComplete="off"
        inputMode="numeric"
        pattern="\d+"
        placeholder="ID Instance"
        value={current.idInstance}
        onChange={e => updateField('idInstance', e.target.value)}
        required
        disabled={loading}
      />
      <input
        key={`apiTokenInstance-${messengerId}`}
        type="password"
        name={`apiTokenInstance-${messengerId}`}
        autoComplete="new-password"
        placeholder="API Token Instance"
        value={current.apiTokenInstance}
        onChange={e => updateField('apiTokenInstance', e.target.value)}
        required
        disabled={loading}
      />
      {error ? <div className="login-error">{error}</div> : null}
      <button type="submit" disabled={loading}>
        {loading ? 'Checking instance...' : 'Login'}
      </button>
    </form>
  );
};

const STATE_MESSAGES = {
  notAuthorized: 'Instance is not authorized. Scan the QR code in your GREEN-API account.',
  blocked: 'Instance is blocked. Contact GREEN-API support.',
  sleepMode: 'Instance is in sleep mode. Wake it up in your GREEN-API account.',
  starting: 'Instance is starting. Try again in a few seconds.',
  yellowCard: 'Instance requires additional verification in your GREEN-API account.',
};

const stateErrorText = state =>
  STATE_MESSAGES[state] || `Instance is not ready (state: ${state ?? 'unknown'}).`;

export default Login;
