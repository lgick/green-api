// Реестр поддерживаемых мессенджеров GREEN-API.

export const MESSENGERS = {
  max: {
    id: 'max',
    name: 'MAX',
    apiUrl: 'https://3100.api.green-api.com',
    typeInstance: 'v3',
    // В v3 префиксы @c.us/@g.us не используются, chatId получаем через checkAccount
    chatIdSuffix: null,
  },
  whatsapp: {
    id: 'whatsapp',
    name: 'WhatsApp',
    apiUrl: 'https://7107.api.greenapi.com',
    typeInstance: 'whatsapp',
    chatIdSuffix: '@c.us',
  },
};

// MAX включён по умолчанию.
export const DEFAULT_MESSENGER = 'max';

export const MESSENGER_LIST = Object.values(MESSENGERS);

export const getMessenger = id => MESSENGERS[id] || MESSENGERS[DEFAULT_MESSENGER];
