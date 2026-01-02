import { Messaging } from '../shared/messaging';
import { MessageType } from '../shared/types';

/**
 * Popup script
 */
document.addEventListener('DOMContentLoaded', () => {
  const openUIButton = document.getElementById('openUI');
  const parseButton = document.getElementById('parseCurrentPage');

  if (openUIButton) {
    openUIButton.addEventListener('click', async () => {
      await Messaging.sendToBackground({
        type: MessageType.OPEN_UI,
      });
      window.close();
    });
  }

  if (parseButton) {
    parseButton.addEventListener('click', async () => {
      try {
        await Messaging.sendToActiveTab({
          type: MessageType.PARSE_PAGE,
        });
        alert('Parsing page... Check the UI tab to see results.');
        window.close();
      } catch (error) {
        alert('Error: Make sure you are on a ChatGPT conversation page.');
      }
    });
  }
});
