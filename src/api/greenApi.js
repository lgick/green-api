import axios from 'axios';

// Клиент GREEN-API: отправка и приём текстовых сообщений.
// https://green-api.com/v3/docs/
export function createGreenApiClient({ apiUrl, idInstance, apiTokenInstance }) {
  const base = `${apiUrl.replace(/\/+$/, '')}/waInstance${idInstance}`;

  return {
    async getStateInstance() {
      const response = await axios.get(`${base}/getStateInstance/${apiTokenInstance}`);
      return response.data;
    },

    // Long polling: запрос висит до receiveTimeout секунд и возвращает пусто, если очередь пуста.
    async receiveNotification(receiveTimeout, signal) {
      const response = await axios.get(
        `${base}/receiveNotification/${apiTokenInstance}`,
        { params: { receiveTimeout }, signal },
      );
      return response.data;
    },

    async deleteNotification(receiptId) {
      const response = await axios.delete(
        `${base}/deleteNotification/${apiTokenInstance}/${receiptId}`,
      );
      return response.data;
    },

    async sendMessage(chatId, message) {
      const response = await axios.post(
        `${base}/sendMessage/${apiTokenInstance}`,
        { chatId, message },
      );
      return response.data;
    },

    // https://green-api.com/v3/docs/api/service/CheckAccount/
    async checkAccount(phoneNumber) {
      const response = await axios.post(
        `${base}/checkAccount/${apiTokenInstance}`,
        { phoneNumber: Number(phoneNumber) },
      );
      return response.data;
    },
  };
}

export const describeError = err => (err.response ? err.response.data : err.message);

// Текст ошибки для пользователя; action — что пытались сделать.
export const apiErrorText = (err, action) => {
  const status = err.response?.status;
  const data = err.response?.data;
  const apiMessage = typeof data === 'string' ? data : data?.message;
  const isPlainMessage = typeof apiMessage === 'string' && !/^\s*</.test(apiMessage);

  if (isPlainMessage) {
    return `${action}: ${apiMessage}`;
  }

  if (status === 401 || status === 403) {
    return `${action}: check idInstance and apiTokenInstance.`;
  }

  if (status === 404) {
    return `${action}: instance not found, check idInstance.`;
  }

  if (status === 466) {
    return `${action}: quota exceeded.`;
  }

  if (status === 469) {
    return `${action}: contact check limit reached, try again later.`;
  }

  if (status) {
    return `${action} (HTTP ${status}).`;
  }

  if (!err.request) {
    return `${action}: ${err.message}`;
  }

  return `${action}: no connection to GREEN-API.`;
};
