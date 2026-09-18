import React, {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import MessageList from './MessageList.jsx';
import MessageInput from './MessageInput.jsx';
import {
  apiErrorText,
  createGreenApiClient,
  describeError,
} from './api/greenApi.js';

const RECEIVE_TIMEOUT = 5; // секунд, long polling
const DELETE_RETRY_LIMIT = 3;
const SEEN_LIMIT = 500; // сколько идентификаторов держим для дедупликации

const Chat = ({ messenger, credentials, onBack }) => {
  const [messages, setMessages] = useState([]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const lastMessageRef = useRef(null); // Реф для доступа к последнему сообщению
  const seenIdsRef = useRef(new Set()); // Дедупликация входящих по idMessage
  const chatIdsRef = useRef(new Map()); // Кэш checkAccount: номер -> chatId | null
  const client = useMemo(() => createGreenApiClient(credentials), [credentials]);

  useEffect(() => {
    const timers = new Set();
    const controller = new AbortController();
    let cancelled = false;

    const wait = ms =>
      new Promise(resolve => {
        const timer = setTimeout(() => {
          timers.delete(timer);
          resolve();
        }, ms);
        timers.add(timer);
      });

    const remember = id => {
      const seen = seenIdsRef.current;
      seen.add(id);
      if (seen.size > SEEN_LIMIT) {
        // Set сохраняет порядок вставки — выкидываем самый старый идентификатор
        seen.delete(seen.values().next().value);
      }
    };

    const deleteNotification = async receiptId => {
      for (let attempt = 0; attempt < DELETE_RETRY_LIMIT && !cancelled; attempt += 1) {
        try {
          await client.deleteNotification(receiptId);
          return;
        } catch (err) {
          if (attempt === DELETE_RETRY_LIMIT - 1) {
            console.error('Error deleting notification:', describeError(err));
            return;
          }
          await wait(1000);
        }
      }
    };

    const poll = async () => {
      while (!cancelled) {
        try {
          const data = await client.receiveNotification(RECEIVE_TIMEOUT, controller.signal);

          if (cancelled) {
            return;
          }

          // Пауза, чтобы не разогнать цикл, если сервер отвечает пусто мгновенно
          if (!data || data.receiptId == null) {
            await wait(1000);
            continue;
          }

          const { receiptId, body } = data;
          const idMessage = body?.idMessage ?? `receipt-${receiptId}`;
          const messageData = body?.messageData;
          const textMessage =
            messageData?.textMessageData?.textMessage ??
            messageData?.extendedTextMessageData?.text;
          const isIncoming = body?.typeWebhook === 'incomingMessageReceived';
          const typeInstance = body?.instanceData?.typeInstance;
          const isOwnMessenger = !typeInstance || typeInstance === messenger.typeInstance;

          if (
            isIncoming &&
            isOwnMessenger &&
            textMessage &&
            !seenIdsRef.current.has(idMessage)
          ) {
            remember(idMessage);
            setMessages(prev => [
              ...prev,
              { id: idMessage, text: textMessage, sender: 'other' },
            ]);
          }

          // Уведомление удаляем в любом случае, иначе очередь встанет
          await deleteNotification(receiptId);
        } catch (err) {
          if (cancelled) {
            return;
          }
          console.error('Error fetching messages:', describeError(err));
          await wait(2000);
        }
      }
    };

    poll();

    return () => {
      cancelled = true;
      controller.abort();
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, [client, messenger.typeInstance]);

  useLayoutEffect(() => {
    // Проматываем к последнему сообщению при обновлении списка сообщений
    if (lastMessageRef.current) {
      requestAnimationFrame(() => {
        if (lastMessageRef.current) {
          lastMessageRef.current.scrollIntoView({
            behavior: 'auto',
            block: 'end',
          });
        }
      });
    }
  }, [messages]);

  const resolveChatId = async phone => {
    if (messenger.chatIdSuffix) {
      return `${phone}${messenger.chatIdSuffix}`;
    }

    // Кэшируем, в т.ч. отсутствие аккаунта: частые проверки блокируются мессенджером
    const cache = chatIdsRef.current;
    if (!cache.has(phone)) {
      const data = await client.checkAccount(phone);
      if (typeof data?.exist !== 'boolean') {
        throw new Error(data?.reason || 'unexpected checkAccount response');
      }
      cache.set(phone, data.exist ? data.chatId : null);
    }
    return cache.get(phone);
  };

  const sendMessage = async () => {
    const phone = phoneNumber.replace(/\D/g, '');

    if (!phone || !message) {
      setError('Please enter a phone number and a message.');
      return;
    }

    if (sending) {
      return;
    }

    const text = message;
    setSending(true);

    try {
      const chatId = await resolveChatId(phone);
      if (!chatId) {
        setError(`No ${messenger.name} account for this phone number.`);
        return;
      }

      const data = await client.sendMessage(chatId, text);
      setError('');
      setMessages(prev => [
        ...prev,
        { id: data?.idMessage || crypto.randomUUID(), text, sender: 'self' },
      ]);
      setMessage(''); // Очищаем поле ввода после отправки
    } catch (err) {
      // Ответ с кодом ошибки — ожидаемый сценарий GREEN-API, а не сбой кода.
      const log = err.response ? console.warn : console.error;
      log('Error sending message:', describeError(err));
      setError(apiErrorText(err, 'Failed to send message'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat">
      <div className="chat-header">
        <div className="chat-header-row">
          <button
            type="button"
            className="back-button"
            onClick={onBack}
            aria-label="Back">
            &#8592;
          </button>
          <h2>Chat with {phoneNumber}</h2>
          <span className="messenger-badge">{messenger.name}</span>
        </div>
        <input
          type="text"
          placeholder="Enter phone number"
          value={phoneNumber}
          onChange={e => setPhoneNumber(e.target.value)}
          required
        />
      </div>
      <div className="chat-body">
        <MessageList messages={messages} lastMessageRef={lastMessageRef} />
      </div>
      {error ? <div className="chat-error">{error}</div> : null}
      <div className="chat-footer">
        <MessageInput
          onSendMessage={sendMessage}
          setMessage={setMessage}
          message={message}
          disabled={sending}
        />
      </div>
    </div>
  );
};

export default Chat;
