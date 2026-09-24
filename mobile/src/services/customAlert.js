/**
 * SwiftRFQ Custom Alert Service
 * Replaces native Alert.alert with custom themed popups.
 */

let alertHandler = null;

export function registerAlertHandler(handler) {
  alertHandler = handler;
  return () => {
    if (alertHandler === handler) {
      alertHandler = null;
    }
  };
}

/**
 * Universal custom alert popup trigger.
 * Supports both signatures:
 *   showCustomAlert(title, message, buttons, options)
 * and:
 *   showCustomAlert({ title, message, type, buttons, ... })
 */
export function showCustomAlert(titleOrConfig, message, buttons, options) {
  if (!alertHandler) {
    console.warn('[CustomAlert] No CustomPopupHost mounted to display alert.');
    return;
  }

  if (typeof titleOrConfig === 'object' && titleOrConfig !== null) {
    alertHandler(titleOrConfig);
  } else {
    alertHandler({
      title: titleOrConfig,
      message,
      buttons,
      ...options,
    });
  }
}

export default {
  show: showCustomAlert,
};
