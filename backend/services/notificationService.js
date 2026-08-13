const Notification = require('../models/Notification');

/**
 * Creates and persists a Notification for a mechanic in MongoDB
 * @param {object} params
 * @param {any} [params.mechanicId]
 * @param {string} [params.type]
 * @param {string} [params.title]
 * @param {string} [params.message]
 * @param {string} [params.body]
 * @param {any} [params.relatedId]
 * @param {any} [params.data]
 */
const createMechanicNotification = async (params) => {
  try {
    if (!params || !params.mechanicId) return null;
    const { mechanicId, type, title, message, body, relatedId, data } = params;
    const msgText = message || body || title || 'Notification';
    
    const notification = await Notification.create({
      mechanicId,
      recipient: mechanicId,
      recipientModel: 'Mechanic',
      type: type || 'other',
      title: title || 'Roadside Assistance Update',
      body: msgText,
      message: msgText,
      relatedId: relatedId || null,
      data: data || {}
    });

    console.log(`[NOTIFICATION CREATED] Persisted notification for mechanic ${mechanicId} | Type: ${type} | ID: ${notification._id}`);
    return notification;
  } catch (err) {
    console.error('[Notification Service Error]:', err.message);
    return null;
  }
};

const { sendRingingRequestNotification } = require('./pushNotificationService');

/**
 * Send high-priority, DATA-ONLY FCM message to mechanic token for incoming requests
 * @param {string} fcmToken
 * @param {object} payload - { jobId, customerName, price, lat, lng, ... }
 */
const sendIncomingRequestDataNotification = async (fcmToken, payload) => {
  const dataPayload = {
    type: 'incoming_request',
    jobId: payload.jobId || payload.requestId,
    customerName: payload.customerName || 'Customer',
    price: payload.price != null ? String(payload.price) : '0',
    lat: payload.lat != null ? String(payload.lat) : '0',
    lng: payload.lng != null ? String(payload.lng) : '0',
    ...payload,
  };
  return await sendRingingRequestNotification(fcmToken, dataPayload);
};

module.exports = {
  createMechanicNotification,
  sendIncomingRequestDataNotification,
};
