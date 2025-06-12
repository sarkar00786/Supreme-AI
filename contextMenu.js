/* global addCustomPromptContextMenu, checkHasPermission, askForPermisson, removePermission, sendScreenshotToAuraAI, getAuraPrompts */
chrome.contextMenus.onClicked.addListener(genericOnClick);
let newChat = true; // Default behavior: start a new chat

// Helper functions for checking and requesting permissions
async function checkHasPermission(permissions) {
  const hasPermission = await chrome.permissions.contains({ permissions });
  return hasPermission;
}

async function askForPermisson(permissions) {
  const granted = await chrome.permissions.request({ permissions });
  return granted;
}

async function removePermission(permissions) {
  const removed = await chrome.permissions.remove({ permissions });
  return removed;
}

/**
 * Generic onClick handler for all context menu items.
 * @param {object} info - Information about the clicked menu item.
 * @param {object} tab - The tab where the click occurred.
 */
async function genericOnClick(info, tab) {
  if (info.menuItemId === 'learnMore') {
    // Direct link to Aura AI home page or general documentation
    chrome.tabs.create({ url: 'https://aura-ai.com', active: true });
  } else if (info.menuItemId === 'newChat') {
    newChat = true;
  } else if (info.menuItemId === 'currentChat') {
    newChat = false;
  } else if (info.menuItemId === 'requestScreenshotPermission') {
    // Request 'tabs' and 'activeTab' permissions for screenshot functionality
    const granted = await askForPermisson(['tabs', 'activeTab']);
    if (granted) {
      // If permission granted, rebuild context menu to show 'Send Screenshot'
      chrome.contextMenus.removeAll(() => {
        addCustomPromptContextMenu();
      });
    }
  } else if (info.menuItemId === 'takeScreenshot') {
    // Send message to background script to handle screenshot capture and sending to Aura AI backend
    chrome.runtime.sendMessage({
      type: 'takeScreenshot',
      detail: {
        tabId: tab.id,
        newChat: newChat,
      },
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error sending screenshot message:', chrome.runtime.lastError.message);
      } else {
        console.log('Screenshot message sent to background:', response);
      }
    });
  } else if (info.menuItemId.startsWith('userPrompt-')) {
    // Handle user-defined prompts
    const promptId = info.menuItemId.replace('userPrompt-', '');
    // Send message to background script to get prompt details and then inject into Gemini
    chrome.runtime.sendMessage({
      type: 'getAuraPrompt', // Using the new Aura AI backend prompt fetching
      detail: { promptId: parseInt(promptId, 10) },
    }, (response) => {
      if (response && response.id) {
        console.log('Prompt fetched for context menu:', response);
        // Send message to content script to inject prompt into Gemini UI
        chrome.tabs.query({ url: 'https://chat.gemini.google.com/*' }, (tabs) => { // Target Gemini for content injection
          let targetTab = tabs[0];
          if (targetTab) {
            chrome.tabs.update(targetTab.id, { active: true }).then(() => {
              chrome.tabs.sendMessage(targetTab.id, {
                newChat, // Boolean to start new chat or continue current
                action: 'injectPrompt', // Action for content script
                prompt: response.instruction, // The actual prompt text
                selectionText: info.selectionText, // Any selected text on the page
              });
            });
          } else {
            // If no Gemini tab is open, create one and then send the message
            chrome.tabs.create({ url: 'https://chat.gemini.google.com/' }).then((tab) => {
              chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
                if (tabId === tab.id && changeInfo.status === 'complete') {
                  setTimeout(() => { // Give Gemini time to load
                    chrome.tabs.sendMessage(tab.id, {
                      newChat,
                      action: 'injectPrompt',
                      prompt: response.instruction,
                      selectionText: info.selectionText,
                    });
                  }, 3000); // 3-second delay
                  chrome.tabs.onUpdated.removeListener(listener); // Remove listener to prevent multiple calls
                }
              });
            });
          }
        });
        // Increment prompt use count via Aura AI backend
        chrome.runtime.sendMessage({ type: 'incrementAuraPromptUseCount', detail: { promptId: response.id } });
      } else {
        console.error('Failed to fetch prompt:', response);
      }
    });
  }
}

/**
 * Attaches context menu items when the extension is installed or updated.
 * This listener calls `addCustomPromptContextMenu` to build the menus.
 */
chrome.runtime.onInstalled.addListener(() => {
  addCustomPromptContextMenu();
});

/**
 * Function to add custom context menu items for Aura AI.
 * This function clears existing menus and rebuilds them.
 */
async function addCustomPromptContextMenu() {
  chrome.contextMenus.removeAll(); // Clear existing menus first

  const hasScreenshotPermission = await checkHasPermission(['tabs', 'activeTab']);

  // Create main "Aura AI" parent menu
  const auraAIMenu = chrome.contextMenus.create({
    title: 'Aura AI',
    contexts: ['page', 'selection', 'image'], // Show on page, text selection, or image
    id: 'auraAIMenu',
  });

  // Add "Send to Aura AI Chat" sub-menu for selected text
  chrome.contextMenus.create({
    title: 'Send selected text to Aura AI Chat',
    contexts: ['selection'],
    parentId: auraAIMenu,
    id: 'sendToAuraAIChat',
  });

  // Add "Send Screenshot to Aura AI Chat" sub-menu (conditional on permission)
  chrome.contextMenus.create({
    title: hasScreenshotPermission ? 'Send Screenshot to Aura AI Chat' : 'Allow to Send Screenshot to Aura AI Chat',
    contexts: ['page', 'selection'],
    parentId: auraAIMenu,
    id: hasScreenshotPermission ? 'takeScreenshot' : 'requestScreenshotPermission',
  });

  // Separator
  chrome.contextMenus.create({
    id: 'divider1',
    type: 'separator',
    contexts: ['page', 'selection', 'image'],
    parentId: auraAIMenu,
  });

  // Add prompt-related items
  const promptsMenu = chrome.contextMenus.create({
    title: 'Prompts',
    contexts: ['page', 'selection'],
    parentId: auraAIMenu,
    id: 'promptsMenu',
  });

  // Fetch favorite prompts from Aura AI backend
  const favoritePromptsResponse = await chrome.runtime.sendMessage({ type: 'getAllAuraFavoritePrompts' });
  const favoritePrompts = favoritePromptsResponse.results || [];

  if (favoritePrompts.length > 0) {
    // Add default favorite prompt
    const defaultFavoritePromptResponse = await chrome.runtime.sendMessage({ type: 'getDefaultAuraFavoritePrompt' });
    const defaultFavoritePrompt = defaultFavoritePromptResponse || favoritePrompts[0]; // Fallback to first if no default

    if (defaultFavoritePrompt && defaultFavoritePrompt.id) {
      chrome.contextMenus.create({
        title: `Default Prompt: "${defaultFavoritePrompt.title}"`,
        contexts: ['page', 'selection'],
        parentId: promptsMenu,
        id: `userPrompt-${defaultFavoritePrompt.id}`,
      });
      chrome.contextMenus.create({
        id: 'divider2',
        type: 'separator',
        contexts: ['page', 'selection'],
        parentId: promptsMenu,
      });
    }

    // Add other favorite prompts as sub-menus
    favoritePrompts.forEach((prompt) => {
      if (prompt.id !== defaultFavoritePrompt?.id) { // Avoid duplicating the default
        chrome.contextMenus.create({
          title: prompt.title,
          contexts: ['page', 'selection'],
          parentId: promptsMenu,
          id: `userPrompt-${prompt.id}`,
        });
      }
    });
  } else {
    // If no favorite prompts, add a placeholder
    chrome.contextMenus.create({
      title: 'No favorite prompts set. Add some from the popup!',
      contexts: ['page', 'selection'],
      parentId: promptsMenu,
      id: 'noFavoritePrompts',
      enabled: false, // Make it non-clickable
    });
  }

  // Separator
  chrome.contextMenus.create({
    id: 'divider3',
    type: 'separator',
    contexts: ['page', 'selection', 'image'],
    parentId: auraAIMenu,
  });

  // "When you send a prompt or screenshot" settings
  const newChatSettingsMenu = chrome.contextMenus.create({
    title: 'When you send a prompt or screenshot',
    contexts: ['page', 'selection'],
    id: 'newChatSettings',
    parentId: auraAIMenu,
  });

  chrome.contextMenus.create({
    title: 'Start a New Chat',
    contexts: ['page', 'selection'],
    parentId: newChatSettingsMenu,
    id: 'newChat',
    type: 'radio',
    checked: newChat,
  });

  chrome.contextMenus.create({
    title: 'Continue Current Chat',
    contexts: ['page', 'selection'],
    parentId: newChatSettingsMenu,
    id: 'currentChat',
    type: 'radio',
    checked: !newChat,
  });

  // Learn more link (updated to general Aura AI website)
  chrome.contextMenus.create({
    title: 'Learn more ➜',
    contexts: ['page', 'selection'],
    parentId: auraAIMenu,
    id: 'learnMore',
  });
}
