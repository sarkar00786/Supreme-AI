// popup.js
// This script runs in the context of the popup.html page for Aura AI.

// Removed LiveKit imports from here as voice chat UI is moving to content script
// import { Room, LocalParticipant, RemoteParticipant, RemoteTrack, Track, createLocalTracks } from 'livekit-client';

let currentView = 'main'; // Tracks the currently active view

document.addEventListener('DOMContentLoaded', () => {
  console.log('Aura AI Popup Loaded! Starting redesign for launcher mode...');
  setupNavigation();
  renderView(currentView); // Render the initial view (Dashboard)
  setupSettingsListeners(); // Setup listeners for settings view
});

/**
 * Sets up event listeners for navigation elements in the popup.
 * This function should be called once the DOM is loaded.
 */
function setupNavigation() {
  const navButtons = document.querySelectorAll('.nav-button');

  navButtons.forEach(button => {
    button.addEventListener('click', () => {
      const viewId = button.id.replace('Button', ''); // e.g., 'mainViewButton' -> 'mainView'
      let newView;
      if (viewId === 'mainView') {
        newView = 'main';
      } else if (viewId === 'settingsView') {
        newView = 'settings';
      }

      if (newView && newView !== currentView) {
        currentView = newView;
        renderView(currentView);
        updateActiveNavButton(currentView);
      }
    });
  });

  const settingsGear = document.querySelector('.gear-icon');
  if (settingsGear) {
    settingsGear.addEventListener('click', () => {
      // Direct link to options.html as intended
      // No specific action needed here beyond what href provides
      console.log('Settings gear clicked, options.html will open.');
    });
  }
}

/**
 * Updates the 'active' class on navigation buttons based on the current view.
 * @param {string} activeView The ID of the currently active view ('main', 'settings').
 */
function updateActiveNavButton(activeView) {
  const navButtons = document.querySelectorAll('.nav-button');
  navButtons.forEach(button => {
    const buttonViewId = button.id.replace('Button', '');
    if (buttonViewId === `${activeView}View`) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}

/**
 * Renders the appropriate view based on the view ID.
 * @param {string} viewName The name of the view to render ('main', 'settings').
 */
async function renderView(viewName) {
  const viewContentContainer = document.getElementById('viewContentContainer');
  if (!viewContentContainer) {
    console.error("View content container (viewContentContainer) not found.");
    return;
  }

  // Fade out current content
  viewContentContainer.style.opacity = '0';
  viewContentContainer.style.transform = 'translateY(10px)';

  setTimeout(async () => {
    let contentHtml = '';
    switch (viewName) {
      case 'main':
        contentHtml = `
          <h2 class="text-lg font-semibold mb-3 text-white">Aura AI Dashboard</h2>
          <button id="openSuperGeminiButton" class="w-full bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-lg shadow-md transition duration-200 mb-2">
            Open SuperGemini
          </button>
          <a target="_blank" href="https://aura-ai.com/" class="block mb-2">
            <button class="w-full bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-lg shadow-md transition duration-200">Aura AI Website</button>
          </a>
          <a target="_blank" href="https://www.youtube.com/@spchatgpt" class="block mb-2">
            <button class="w-full bg-red-600 hover:bg-red-700 text-white p-3 rounded-lg shadow-md transition duration-200">Video Tutorials</button>
          </a>
          <a target="_blank" href="https://calendly.com/ezii/20min" class="block mb-2">
            <button class="w-full bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg shadow-md transition duration-200">Book a Call</button>
          </a>

          <div class="mt-4 p-4 bg-gray-700 rounded-lg shadow-inner">
              <p class="text-sm text-gray-300 mb-1">Account Status: <span id="accountStatus" class="font-medium text-white">Loading...</span></p>
              <p class="text-xs text-gray-400">Last Conversation: <span id="lastConversation" class="font-light text-gray-300">N/A</span></p>
          </div>
        `;
        break;
      case 'settings':
        contentHtml = `
          <h2 class="text-lg font-semibold mb-3 text-white">Settings</h2>
          <div class="chat-behavior-setting p-4 bg-gray-700 rounded-lg shadow-md mb-4">
            <h3 class="font-medium text-white mb-2">When you send a prompt:</h3>
            <label class="flex items-center text-gray-300 cursor-pointer mb-2">
                <input type="radio" id="newChatRadio" name="chatBehavior" class="mr-2 h-4 w-4 text-blue-500 border-gray-500 focus:ring-blue-500">
                Start a New Chat
            </label>
            <label class="flex items-center text-gray-300 cursor-pointer">
                <input type="radio" id="currentChatRadio" name="chatBehavior" class="mr-2 h-4 w-4 text-blue-500 border-gray-500 focus:ring-blue-500">
                Continue Current Chat
            </label>
          </div>
          <div class="setting-item p-4 bg-gray-700 rounded-lg shadow-md mb-4">
            <label for="autoSendToggle" class="text-gray-300">Auto-send after injection</label>
            <input type="checkbox" id="autoSendToggle" class="h-5 w-5 rounded border-gray-500 text-blue-500 focus:ring-blue-500">
          </div>
          <div class="auth-section p-4 bg-gray-700 rounded-lg shadow-md">
            <h3 class="font-medium text-white mb-2">Aura AI API Key</h3>
            <input type="text" id="auraApiKeyInput" placeholder="Enter your Aura AI API Key" class="w-full p-2 bg-gray-800 text-white rounded-md border border-gray-600 focus:outline-none focus:border-blue-500">
            <button id="saveApiKeyButton" class="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg shadow-md transition duration-200">Save Key</button>
          </div>
        `;
        break;
      default:
        contentHtml = `<p class="text-red-400 text-center">Error: View not found.</p>`;
    }

    viewContentContainer.innerHTML = contentHtml;
    // Fade in new content
    viewContentContainer.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
    viewContentContainer.style.opacity = '1';
    viewContentContainer.style.transform = 'translateY(0)';

    // Attach listeners for newly rendered content
    if (viewName === 'main') {
        updateAccountInfo();
        document.getElementById('openSuperGeminiButton').addEventListener('click', openSuperGeminiTab);
    } else if (viewName === 'settings') {
        loadSettings(); // Load settings values from storage
        setupSettingsListeners(); // Re-attach settings listeners
    }

  }, 100); // Small delay for fade-out animation
}

/**
 * Opens a new tab to Gemini and signals content script to inject UI.
 */
async function openSuperGeminiTab() {
  console.log('Aura AI: Opening SuperGemini tab...');
  const geminiUrl = 'https://gemini.google.com/';

  // Query existing Gemini tabs
  chrome.tabs.query({ url: geminiUrl }, (tabs) => {
    if (tabs.length > 0) {
      // If a Gemini tab exists, activate it
      chrome.tabs.update(tabs[0].id, { active: true }, () => {
        console.log('Aura AI: Activated existing Gemini tab.');
      });
    } else {
      // Otherwise, create a new Gemini tab
      chrome.tabs.create({ url: geminiUrl, active: true }, (newTab) => {
        console.log('Aura AI: Created new SuperGemini tab.');
      });
    }
  });
  // The content script on the Gemini page will handle injecting the UI
  // once it detects the page is fully loaded and ready.
}


/**
 * Fetches and updates account and last conversation info from storage.
 */
function updateAccountInfo() {
  chrome.storage.local.get(['auraAccount', 'auraLastSelectedConversation'], (result) => {
    const accountStatusSpan = document.getElementById('accountStatus');
    const lastConversationSpan = document.getElementById('lastConversation');

    if (accountStatusSpan) {
      if (result.auraAccount && result.auraAccount.email) {
        accountStatusSpan.textContent = `Logged in as: ${result.auraAccount.email}`;
      } else {
        accountStatusSpan.textContent = `Not logged in`;
      }
    }
    if (lastConversationSpan) {
      if (result.auraLastSelectedConversation) {
        lastConversationSpan.textContent = result.auraLastSelectedConversation;
      } else {
        lastConversationSpan.textContent = 'No recent conversation.';
      }
    }
  });
}

/**
 * Loads settings from chrome.storage.local and updates the UI.
 */
function loadSettings() {
    chrome.storage.local.get('settings', (result) => {
        const settings = result.settings || {};

        document.getElementById('newChatRadio').checked = (settings.chatBehavior === 'newChat' || settings.chatBehavior === undefined);
        document.getElementById('currentChatRadio').checked = (settings.chatBehavior === 'currentChat');
        document.getElementById('autoSendToggle').checked = settings.autoSendAfterInjection || false;
    });

    chrome.storage.sync.get('auraApiKey', (result) => {
        if (result.auraApiKey) {
            document.getElementById('auraApiKeyInput').value = result.auraApiKey;
        }
    });
}

/**
 * Sets up event listeners for settings controls.
 */
function setupSettingsListeners() {
    const newChatRadio = document.getElementById('newChatRadio');
    const currentChatRadio = document.getElementById('currentChatRadio');
    const autoSendToggle = document.getElementById('autoSendToggle');
    const auraApiKeyInput = document.getElementById('auraApiKeyInput');
    const saveApiKeyButton = document.getElementById('saveApiKeyButton');

    if (newChatRadio) {
        newChatRadio.addEventListener('change', () => saveSetting('chatBehavior', 'newChat'));
    }
    if (currentChatRadio) {
        currentChatRadio.addEventListener('change', () => saveSetting('chatBehavior', 'currentChat'));
    }
    if (autoSendToggle) {
        autoSendToggle.addEventListener('change', () => saveSetting('autoSendAfterInjection', autoSendToggle.checked));
    }
    if (saveApiKeyButton) {
        saveApiKeyButton.addEventListener('click', () => {
            const apiKey = auraApiKeyInput.value.trim();
            chrome.storage.sync.set({ auraApiKey: apiKey }, () => {
                alert('Aura AI API Key saved!');
            });
        });
    }
}

/**
 * Saves a single setting to chrome.storage.local.
 * @param {string} key The key of the setting to save.
 * @param {*} value The value of the setting.
 */
function saveSetting(key, value) {
    chrome.storage.local.get('settings', (result) => {
        const settings = result.settings || {};
        settings[key] = value;
        chrome.storage.local.set({ settings }, () => {
            console.log(`Setting ${key} saved: ${value}`);
        });
    });
}
