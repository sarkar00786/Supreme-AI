// scripts/gemini-chat.js
// This script contains functions to interact directly with the Gemini chat UI.
// IMPORTANT: CSS selectors can change, so regular verification is recommended.

console.log('Aura AI: gemini-chat.js loaded for UI interactions.');

/**
 * Injects text into the Gemini chat input field and optionally appends selected text.
 * @param {string} promptText The main prompt text to inject.
 * @param {string} [selectionText=''] Optional text selected by the user to append.
 * @returns {boolean} True if the text was injected, false otherwise.
 */
function injectPromptIntoGemini(promptText, selectionText = '') {
  // ***UPDATED: Gemini Input Selector - Using aria-label for robustness***
  // This selector is less likely to break with minor UI changes.
  const inputElement = document.querySelector('div[contenteditable="true"][aria-label="Enter a prompt here"]');

  if (inputElement) {
    const finalPrompt = promptText + (selectionText ? `\n\n${selectionText}` : '');

    // Focus the input element first
    inputElement.focus();

    // Set the text content
    inputElement.textContent = finalPrompt;

    // Dispatch an 'input' event to ensure Gemini's internal state updates
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));

    // Trigger a keyboard event as some applications also listen for key presses
    // to detect input or enable the send button. 'Enter' is a good universal trigger.
    // Ensure the key and code are correctly set.
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true,
    });
    inputElement.dispatchEvent(event);

    console.log('Aura AI: Prompt text set in Gemini input and events dispatched:', finalPrompt);
    return true;
  } else {
    console.error('Aura AI: Gemini input field NOT FOUND. Please update the selector in gemini-chat.js after inspecting the live Gemini page.');
    return false;
  }
}

/**
 * Clicks the Gemini chat send button.
 * @returns {boolean} True if the button was clicked, false otherwise.
 */
function clickGeminiSendButton() {
  // ***UPDATED: Gemini Send Button Selector - Using aria-label for robustness***
  const sendButton = document.querySelector('button[aria-label="Send message"]');

  if (sendButton) {
    sendButton.click();
    console.log('Aura AI: Gemini send button clicked.');
    return true;
  } else {
    console.error('Aura AI: Gemini send button NOT FOUND. Please update the selector in gemini-chat.js after inspecting the live Gemini page.');
    return false;
  }
}

/**
 * Handles the injection of a screenshot for Gemini.
 * Client-side injection is highly unstable due to frequent UI changes.
 * Recommended approach is to send the image to your serverless backend
 * which then calls the Gemini Vision API.
 * @param {string} imageDataUrl The base64 encoded image data URL.
 */
function handleScreenshotInjection(imageDataUrl) {
  console.warn('Aura AI: Client-side screenshot injection into Gemini is highly unstable and not directly implemented.');
  console.log('Aura AI: For screenshot processing, send this image data to your serverless backend to call the Gemini Vision API.');
  console.log('Aura AI: Received image data for potential backend processing:', imageDataUrl.substring(0, 50) + '...'); // Log first 50 chars

  // TODO: In a real application, you would send 'imageDataUrl' to your serverless backend here
  // For example:
  // fetch('YOUR_SERVERLESS_ENDPOINT/process-screenshot', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //   },
  //   body: JSON.stringify({ image: imageDataUrl }),
  // })
  // .then(response => response.json())
  // .then(data => console.log('Aura AI: Serverless backend response for screenshot:', data))
  // .catch(error => console.error('Aura AI: Error sending screenshot to serverless backend:', error));
}

// Expose functions globally for content.js to call them (or use messaging)
// This is typically done for content scripts to interact with other injected scripts
// or the page context. For module-based content scripts, you'd export them.
// For simplicity and direct compatibility with existing structure, keeping them globally accessible.
window.injectPromptIntoGemini = injectPromptIntoGemini;
window.clickGeminiSendButton = clickGeminiSendButton;
window.handleScreenshotInjection = handleScreenshotInjection;
