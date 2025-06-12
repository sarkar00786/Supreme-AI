// scripts/selectionHandler.js
// This script handles text selection events on the Gemini page.

console.log('Aura AI: selectionHandler.js loaded.');

// You can add logic here to listen for selection events,
// and potentially send selected text to the background script
// for processing (e.g., via chrome.runtime.sendMessage).

// Example: Get selected text
function getSelectedText() {
  const selection = window.getSelection();
  if (selection && selection.toString().length > 0) {
    return selection.toString();
  }
  return '';
}

// You might add an event listener here if direct interaction with selection
// is needed for real-time features. For now, the background script will
// send the selected text when a context menu item is clicked.
