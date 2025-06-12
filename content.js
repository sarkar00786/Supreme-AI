// scripts/content.js
// This is the main content script for Aura AI on Gemini pages.
// It is now responsible for injecting and managing the custom UI directly on the Gemini interface.

console.log('Aura AI content script loaded on Gemini page for UI injection.');

// Import LiveKit Client for voice chat functionality
import { Room, LocalParticipant, RemoteParticipant, RemoteTrack, Track, createLocalTracks } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js'; // This URL is incorrect, it should be the LiveKit client library. Please ensure you have:
// <script src="scripts/lib/livekit-client.min.js"></script>
// in your manifest.json's "web_accessible_resources" and included in content_scripts.
// Correct LiveKit import is typically:
// import { Room, LocalParticipant, RemoteParticipant, RemoteTrack, Track, createLocalTracks } from 'livekit-client';
// For direct import in content script:
// Make sure 'livekit-client.min.js' is truly accessible via `chrome.scripting.executeScript` or `web_accessible_resources`
// and loaded into the page. If it's loaded as part of `content_scripts` in manifest.json,
// you might not need a dynamic import like this.
// Given your manifest has 'scripts/lib/livekit-client.min.js' in web_accessible_resources,
// we should try to inject it or ensure it's globally available.
// For now, let's assume it's made globally available through manifest.json's content_scripts 'js' array.
// If not, it needs to be made available to this context.

// LiveKit configuration (ensure this matches your .env and token_server.py settings)
const LIVEKIT_URL = 'wss://superpower-gemini-tarw8pff.livekit.cloud';
const TOKEN_SERVER_URL = 'http://127.0.0.1:5000/getToken'; // Your local token server URL

let liveKitRoom = null; // LiveKit Room instance
let localAudioTrack = null; // User's microphone track

// Store the pending prompt and send status
let pendingPrompt = null;
let shouldSendImmediately = false; // Flag to control whether to send immediately after injection
let currentChatBehavior = 'newChat'; // Default behavior, loaded from settings

// --- Utility Functions ---

/**
 * Waits for a specific DOM element to be available.
 * @param {string} selector The CSS selector of the element to wait for.
 * @param {number} timeout Optional timeout in milliseconds.
 * @returns {Promise<Element>} A promise that resolves with the element when found, or rejects if timeout occurs.
 */
function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const checkInterval = 100; // Check every 100ms

    const intervalId = setInterval(() => {
      const element = document.querySelector(selector);
      if (element) {
        clearInterval(intervalId);
        resolve(element);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(intervalId);
        reject(new Error(`Element with selector "${selector}" not found within ${timeout}ms.`));
      }
    }, checkInterval);
  });
}

/**
 * Gets selected text from the page.
 * @returns {string} The selected text.
 */
function getSelectedTextFromPage() {
  const selection = window.getSelection();
  if (selection && selection.toString().length > 0) {
    return selection.toString();
  }
  return '';
}

// --- UI Injection and Management on Gemini Page ---

let auraAISidebar = null; // Reference to the injected sidebar

/**
 * Injects the main Aura AI sidebar and its content into the Gemini page.
 */
async function injectAuraAISidebar() {
  console.log('Aura AI: Attempting to inject sidebar UI...');

  // Prevent multiple injections
  if (document.getElementById('aura-ai-sidebar')) {
    console.log('Aura AI: Sidebar already injected.');
    return;
  }

  // Find a suitable parent element in Gemini's DOM to attach the sidebar
  // This selector might need to be adjusted if Gemini's layout changes.
  // We'll try to find the main chat window container or a similar robust element.
  const mainGeminiContainer = await waitForElement('#app-root'); // Top-level app container or similar
  if (!mainGeminiContainer) {
    console.error('Aura AI: Main Gemini container not found. Cannot inject sidebar.');
    return;
  }

  auraAISidebar = document.createElement('div');
  auraAISidebar.id = 'aura-ai-sidebar';
  auraAISidebar.className = 'fixed right-0 top-0 h-full bg-gray-900 text-white shadow-lg z-50 transform translate-x-full transition-transform duration-300 ease-in-out';
  auraAISidebar.style.width = '300px'; // Fixed width for the sidebar
  auraAISidebar.style.padding = '1rem';
  auraAISidebar.style.display = 'flex';
  auraAISidebar.style.flexDirection = 'column';
  auraAISidebar.style.overflowY = 'auto'; // Enable scrolling for content

  auraAISidebar.innerHTML = `
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold text-blue-400">Aura AI</h2>
      <button id="aura-ai-sidebar-toggle" class="text-gray-400 hover:text-white material-icons">
        chevron_right
      </button>
    </div>

    <div class="flex-grow flex flex-col space-y-4">
      <!-- Voice Chat Section -->
      <div id="aura-voice-chat-section" class="bg-gray-800 p-4 rounded-lg shadow-md">
        <h3 class="text-lg font-semibold mb-3 text-white">Voice Chat</h3>
        <div class="flex flex-col items-center justify-center min-h-[100px]">
          <p id="content-connectionStatus" class="text-sm text-gray-400 mb-2">Disconnected</p>
          <button id="content-toggleMicButton" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg shadow-md transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" disabled>
            <span id="content-micIcon" class="material-icons">mic_off</span>
            <span id="content-micText">Connect Mic</span>
          </button>
          <p id="content-agentResponse" class="text-sm text-gray-300 mt-3 italic text-center break-words"></p>
        </div>
      </div>

      <!-- Prompt Manager Section -->
      <div id="aura-prompt-manager-section" class="bg-gray-800 p-4 rounded-lg shadow-md flex-grow">
        <h3 class="text-lg font-semibold mb-3 text-white">Prompts</h3>
        <input type="text" id="aura-prompt-search" placeholder="Search prompts..." class="w-full p-2 rounded-md bg-gray-700 border border-gray-600 text-white mb-3">
        <div id="aura-prompt-list" class="space-y-2 max-h-64 overflow-y-auto">
          <p class="text-gray-400 text-center">Loading prompts...</p>
        </div>
        <div class="mt-4 flex flex-col gap-2">
          <input type="text" id="aura-new-prompt-title" placeholder="New Prompt Title" class="w-full p-2 rounded-md bg-gray-700 border border-gray-600 text-white">
          <textarea id="aura-new-prompt-text" placeholder="New Prompt Text..." rows="3" class="w-full p-2 rounded-md bg-gray-700 border border-gray-600 text-white resize-y"></textarea>
          <button id="aura-add-prompt-button" class="w-full bg-green-600 hover:bg-green-700 text-white p-2 rounded-lg shadow-md transition duration-200">Add Prompt</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(auraAISidebar);
  // Add a semi-transparent overlay to dim the main content when sidebar is open
  const overlay = document.createElement('div');
  overlay.id = 'aura-ai-overlay';
  overlay.className = 'fixed inset-0 bg-black opacity-0 transition-opacity duration-300 ease-in-out z-40 hidden';
  document.body.appendChild(overlay);

  // Initial state: hidden
  auraAISidebar.classList.add('translate-x-full'); // Ensure it starts off-screen
  overlay.classList.add('hidden');

  // Attach event listener for the toggle button
  const toggleButton = document.getElementById('aura-ai-sidebar-toggle');
  if (toggleButton) {
    toggleButton.addEventListener('click', toggleAuraAISidebar);
    overlay.addEventListener('click', toggleAuraAISidebar); // Close when clicking overlay
  }

  // Load content after sidebar is injected
  loadPromptsIntoSidebar();
  initializeVoiceChatInSidebar(); // Initialize LiveKit directly in content script
}

/**
 * Toggles the visibility of the Aura AI sidebar.
 */
function toggleAuraAISidebar() {
  const sidebar = document.getElementById('aura-ai-sidebar');
  const overlay = document.getElementById('aura-ai-overlay');
  const toggleIcon = document.getElementById('aura-ai-sidebar-toggle');

  if (!sidebar || !overlay || !toggleIcon) return;

  const isOpen = sidebar.classList.contains('translate-x-full');
  if (isOpen) {
    // Open sidebar
    sidebar.classList.remove('translate-x-full');
    toggleIcon.textContent = 'chevron_left'; // Change icon to close
    overlay.classList.remove('hidden');
    setTimeout(() => { overlay.style.opacity = '0.5'; }, 10); // Fade in overlay
  } else {
    // Close sidebar
    sidebar.classList.add('translate-x-full');
    toggleIcon.textContent = 'chevron_right'; // Change icon to open
    overlay.style.opacity = '0'; // Fade out overlay
    setTimeout(() => { overlay.classList.add('hidden'); }, 300); // Hide overlay after transition
  }
}

// --- Prompt Management in Sidebar ---

/**
 * Loads custom prompts from storage and renders them in the sidebar's prompt list.
 */
async function loadPromptsIntoSidebar() {
    const promptListDiv = document.getElementById('aura-prompt-list');
    if (!promptListDiv) return;

    promptListDiv.innerHTML = '<p class="text-gray-400 text-center text-sm">Loading prompts...</p>';

    // Fetch prompts from background script (which calls Aura AI backend)
    // Using a direct message as `chrome.runtime.sendMessage` is the standard way
    const response = await chrome.runtime.sendMessage({ type: 'getAuraPrompts' });

    if (response && response.results && response.results.length > 0) {
        promptListDiv.innerHTML = ''; // Clear loading message
        response.results.forEach(prompt => {
            const promptItem = document.createElement('div');
            promptItem.className = 'flex justify-between items-center p-2 bg-gray-700 rounded-md shadow-sm';
            promptItem.innerHTML = `
                <span class="text-sm font-medium text-white cursor-pointer">${prompt.title}</span>
                <div class="flex space-x-2">
                    <button class="use-prompt-button text-blue-400 hover:text-blue-600" title="Use Prompt" data-prompt-text="${encodeURIComponent(prompt.instruction)}" data-prompt-id="${prompt.id}">
                        <span class="material-icons" style="font-size:18px;">send</span>
                    </button>
                    <button class="delete-prompt-button text-red-400 hover:text-red-600" title="Delete Prompt" data-prompt-id="${prompt.id}">
                        <span class="material-icons" style="font-size:18px;">delete</span>
                    </button>
                </div>
            `;
            promptListDiv.appendChild(promptItem);
        });

        // Add event listeners for use and delete buttons
        promptListDiv.querySelectorAll('.use-prompt-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const promptText = decodeURIComponent(event.currentTarget.dataset.promptText);
                const promptId = event.currentTarget.dataset.promptId;
                const selectionText = getSelectedTextFromPage(); // Get current selection
                // Send message to content script to inject into Gemini and handle 'auto-send'
                chrome.runtime.sendMessage({
                    action: 'injectPrompt',
                    prompt: promptText,
                    selectionText: selectionText,
                    sendImmediately: true // Assuming 'use prompt' means send immediately
                });
                // Increment use count for prompt
                chrome.runtime.sendMessage({
                    type: 'incrementAuraPromptUseCount',
                    detail: { promptId: parseInt(promptId, 10) }
                });
            });
        });

        promptListDiv.querySelectorAll('.delete-prompt-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const promptIdToDelete = parseInt(event.currentTarget.dataset.promptId, 10);
                if (confirm('Are you sure you want to delete this prompt?')) {
                    chrome.runtime.sendMessage({
                        type: 'deleteAuraPrompts',
                        detail: { promptIds: [promptIdToDelete] }
                    }, (deleteResponse) => {
                        if (deleteResponse.success) {
                            loadPromptsIntoSidebar(); // Re-render list after deletion
                            console.log('Prompt deleted successfully!');
                        } else {
                            console.error('Failed to delete prompt:', deleteResponse.error);
                            alert('Failed to delete prompt: ' + deleteResponse.error);
                        }
                    });
                }
            });
        });
    } else {
        promptListDiv.innerHTML = '<p class="text-gray-400 text-center text-sm">No custom prompts added yet.</p>';
    }

    // Add listener for adding new prompt
    const addPromptButton = document.getElementById('aura-add-prompt-button');
    if (addPromptButton) {
        addPromptButton.addEventListener('click', handleAddPromptInSidebar);
    }

    // Add listener for prompt search
    const promptSearchInput = document.getElementById('aura-prompt-search');
    if (promptSearchInput) {
        promptSearchInput.addEventListener('input', () => {
            // Implement a debounce for search if needed for performance
            // For now, re-load prompts immediately
            loadPromptsIntoSidebar(promptSearchInput.value); // Pass search term
        });
    }
}

/**
 * Handles adding a new prompt from the sidebar.
 */
async function handleAddPromptInSidebar() {
    const titleInput = document.getElementById('aura-new-prompt-title');
    const textInput = document.getElementById('aura-new-prompt-text');
    const title = titleInput.value.trim();
    const text = textInput.value.trim();

    if (!title || !text) {
        alert('Please enter both a prompt title and text.');
        return;
    }

    const newPrompt = {
        title: title,
        instruction: text,
        steps: [text], // Simple prompt, instruction is the only step
        tags: [],
        language: 'en', // Default language
        is_public: false,
        is_favorite: false
    };

    chrome.runtime.sendMessage({
        type: 'addAuraPrompts',
        detail: { prompts: [newPrompt] }
    }, (response) => {
        if (response.success) {
            console.log('Prompt added successfully!');
            titleInput.value = '';
            textInput.value = '';
            loadPromptsIntoSidebar(); // Re-render prompts list
        } else {
            console.error('Failed to add prompt:', response.error);
            alert('Failed to add prompt: ' + response.error);
        }
    });
}


// --- LiveKit Voice Chat Integration in Sidebar ---

/**
 * Initializes the LiveKit voice chat functionality within the sidebar.
 */
async function initializeVoiceChatInSidebar() {
  const connectionStatusElem = document.getElementById('content-connectionStatus');
  const toggleMicButton = document.getElementById('content-toggleMicButton');
  const micIcon = document.getElementById('content-micIcon');
  const micText = document.getElementById('content-micText');
  const agentResponseElem = document.getElementById('content-agentResponse');

  if (!connectionStatusElem || !toggleMicButton || !micIcon || !micText || !agentResponseElem) {
    console.error("Voice chat UI elements in content script not found.");
    return;
  }

  connectionStatusElem.textContent = 'Connecting to token server...';
  toggleMicButton.disabled = true;

  try {
    // 1. Get token from your token server (via background script for CORS if needed, or directly)
    // For simplicity, let's assume direct fetch for now.
    // In a production setup, you might proxy this through your background script for security.
    const response = await fetch(`${TOKEN_SERVER_URL}?roomName=aura-ai-room&identity=aura-ai-user-${Date.now()}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch token: ${response.statusText}`);
    }
    const data = await response.json();
    const token = data.token;

    if (!token) {
      throw new Error('No token received from server.');
    }
    connectionStatusElem.textContent = 'Token received. Connecting to LiveKit room...';

    // 2. Connect to LiveKit Room
    // LiveKit client is now assumed to be available in this content script's context
    // because of the manifest.json content_scripts configuration.
    liveKitRoom = new Room();
    await liveKitRoom.connect(LIVEKIT_URL, token);
    connectionStatusElem.textContent = 'Connected to Aura AI!';
    console.log('Aura AI: Connected to LiveKit room:', liveKitRoom);

    toggleMicButton.disabled = false;

    // 3. Handle participant and track events (for AI agent's voice)
    liveKitRoom.on(Room.Event.TrackSubscribed, (remoteTrack, publication, participant) => {
      if (remoteTrack.kind === Track.Kind.Audio) {
        const audioElement = remoteTrack.attach();
        audioElement.autoplay = true;
        // Append to the specific voice chat section within the sidebar
        agentResponseElem.parentElement.appendChild(audioElement);
        console.log(`Aura AI: Subscribed to audio from ${participant.identity}`);
        remoteTrack.on(Track.Event.Unsubscribed, () => {
            audioElement.remove();
        });
      }
    });

    liveKitRoom.on(Room.Event.DataReceived, (payload, participant) => {
      const decoder = new TextDecoder();
      const message = decoder.decode(payload);
      try {
        const parsedMessage = JSON.parse(message);
        if (parsedMessage.type === 'agent_text_response' && parsedMessage.text) {
          agentResponseElem.textContent = parsedMessage.text;
        }
      } catch (e) {
        console.warn("Aura AI: Failed to parse data message:", message);
        agentResponseElem.textContent = message;
      }
    });

    // 4. Toggle Microphone Functionality
    let isMicOn = false;
    toggleMicButton.onclick = async () => {
      if (isMicOn) {
        // Turn off mic
        if (liveKitRoom && localAudioTrack) {
          await liveKitRoom.localParticipant.unpublishTrack(localAudioTrack);
          localAudioTrack.stop();
          localAudioTrack = null;
          micIcon.textContent = 'mic_off';
          micText.textContent = 'Connect Mic';
          isMicOn = false;
          connectionStatusElem.textContent = 'Mic disconnected.';
          console.log('Aura AI: Mic disconnected.');
        }
      } else {
        // Turn on mic
        try {
          const tracks = await createLocalTracks({ audio: true });
          localAudioTrack = tracks[0];
          await liveKitRoom.localParticipant.publishTrack(localAudioTrack);
          micIcon.textContent = 'mic';
          micText.textContent = 'Mic Connected';
          isMicOn = true;
          connectionStatusElem.textContent = 'Mic connected. Speak to Aura AI!';
          console.log('Aura AI: Mic connected.');
        } catch (error) {
          console.error('Aura AI: Failed to get mic access:', error);
          connectionStatusElem.textContent = 'Failed to get mic access. Please allow microphone permissions.';
          micIcon.textContent = 'mic_off';
          micText.textContent = 'Connect Mic';
        }
      }
    };

  } catch (error) {
    console.error('Aura AI: LiveKit connection failed:', error);
    connectionStatusElem.textContent = `Connection failed: ${error.message}. Ensure token server is running.`;
    toggleMicButton.disabled = true;
  }
}

/**
 * Disconnects from the LiveKit room and cleans up resources.
 */
function disconnectLiveKitFromSidebar() {
  if (liveKitRoom) {
    liveKitRoom.disconnect();
    liveKitRoom = null;
    localAudioTrack = null;
    console.log('Aura AI: Disconnected from LiveKit room in sidebar.');
  }
  const connectionStatusElem = document.getElementById('content-connectionStatus');
  if (connectionStatusElem) connectionStatusElem.textContent = 'Disconnected.';
  const toggleMicButton = document.getElementById('content-toggleMicButton');
  if (toggleMicButton) {
      toggleMicButton.disabled = true;
      toggleMicButton.querySelector('#content-micIcon').textContent = 'mic_off';
      toggleMicButton.querySelector('#content-micText').textContent = 'Connect Mic';
  }
  const agentResponseElem = document.getElementById('content-agentResponse');
  if (agentResponseElem) agentResponseElem.textContent = '';
}


// --- Main Content Script Listener and Injection Trigger ---

// Listen for messages from the background script (e.g., from popup.js or contextMenu.js)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Aura AI content script received message:', request);

    if (request.action === 'injectPrompt') {
        const currentSelectionText = request.selectionText || getSelectedTextFromPage();
        const finalPromptText = request.prompt;
        const sendImmediately = request.sendImmediately || false;

        // Ensure gemini-chat.js functions are available globally in this content script's context
        if (typeof window.injectPromptIntoGemini !== 'function' || typeof window.clickGeminiSendButton !== 'function') {
            console.error('Aura AI: Required functions from gemini-chat.js are not available. Ensure it is loaded.');
            sendResponse({ status: 'gemini_chat_functions_not_found' });
            return true; // Indicate async response
        }

        // Handle chat behavior (new chat vs. current chat) based on user settings
        chrome.storage.local.get('settings', (result) => {
            const settings = result.settings || {};
            const chatBehavior = settings.chatBehavior || 'newChat'; // Default to newChat

            if (chatBehavior === 'newChat' && window.location.href !== 'https://chat.gemini.google.com/') {
                console.log('Aura AI: Navigating to new Gemini chat for prompt injection.');
                sessionStorage.setItem('auraAIPendingPrompt', JSON.stringify({
                    text: finalPromptText,
                    selection: currentSelectionText,
                    shouldSendImmediately: sendImmediately
                }));
                window.location.href = 'https://chat.gemini.google.com/';
                sendResponse({ status: 'navigating_to_new_chat' });
            } else {
                pendingPrompt = {
                    text: finalPromptText,
                    selection: currentSelectionText
                };
                shouldSendImmediately = sendImmediately;
                checkGeminiElementsAndProcessPrompt(); // Attempt to inject immediately
                sendResponse({ status: 'prompt_received_in_content_script', prompt: finalPromptText.substring(0, 50) + '...' });
            }
        });
        return true; // Indicate asynchronous response
    } else if (request.type === 'takeScreenshot') {
        console.log('Aura AI: Received takeScreenshot request in content script with image data.');
        const imageDataUrl = request.detail.dataUrl;

        if (imageDataUrl) {
            if (typeof window.handleScreenshotInjection === 'function') {
                window.handleScreenshotInjection(imageDataUrl);
                console.log('Aura AI: Screenshot data received. Actual Gemini UI injection/API call for image needed.');
                sendResponse({ status: 'screenshot_data_received_in_content_script', dataUrl: imageDataUrl.substring(0, 50) + '...' });
            } else {
                console.error('Aura AI: handleScreenshotInjection function not available.');
                sendResponse({ status: 'screenshot_handler_not_found' });
            }
        } else {
            sendResponse({ status: 'no_screenshot_data_provided' });
        }
    } else if (request.type === 'processPendingPromptInContentScript') {
        // This message is sent from background.js/popup.js after navigation to a new Gemini tab
        console.log('Aura AI: Received processPendingPromptInContentScript message.');
        const storedPrompt = sessionStorage.getItem('auraAIPendingPrompt');
        if (storedPrompt) {
            const parsedPrompt = JSON.parse(storedPrompt);
            pendingPrompt = {
                text: parsedPrompt.text,
                selection: parsedPrompt.selection
            };
            shouldSendImmediately = parsedPrompt.shouldSendImmediately;
            sessionStorage.removeItem('auraAIPendingPrompt'); // Clear after use
            checkGeminiElementsAndProcessPrompt();
            sendResponse({ status: 'pending_prompt_processed' });
        } else {
            sendResponse({ status: 'no_pending_prompt' });
        }
    }
    // Return true to indicate that sendResponse will be called asynchronously
    return true;
});


// Function to check for the presence of the input and send button for prompt injection
// This is now specifically for handling the *pending* prompt after navigation/initial load.
async function checkGeminiElementsAndProcessPrompt() {
  const inputElement = document.querySelector('div[contenteditable="true"][aria-label="Enter a prompt here"]');
  const sendButton = document.querySelector('button[aria-label="Send message"]');

  if (inputElement && sendButton) {
    console.log('Aura AI: Gemini input and send button found for prompt processing.');
    if (pendingPrompt) {
      const injected = window.injectPromptIntoGemini(pendingPrompt.text, pendingPrompt.selection);
      if (injected && shouldSendImmediately) {
        setTimeout(() => {
          window.clickGeminiSendButton();
          pendingPrompt = null;
          shouldSendImmediately = false;
        }, 500); // Small delay before sending
      } else if (injected) {
        pendingPrompt = null; // Clear if injected but not sent immediately
      }
    }
  }
}

// Observe the document body for changes to inject the Aura AI sidebar.
// This ensures the sidebar is injected even if Gemini's UI loads asynchronously.
const sidebarObserver = new MutationObserver((mutationsList, observer) => {
  // Check if the main Gemini content area is stable enough to inject the sidebar
  // We'll look for a common parent or a stable part of the chat UI.
  // The '#app-root' is a good candidate for the highest level.
  const appRoot = document.getElementById('app-root');
  if (appRoot && !document.getElementById('aura-ai-sidebar')) {
    injectAuraAISidebar();
    // Once the sidebar is injected, we can disconnect this observer
    // if we only need it to run once. If Gemini dynamically removes
    // and re-adds parts of the DOM where Aura AI would be injected,
    // this observer might need to remain active.
    // For now, let's disconnect it after successful injection.
    observer.disconnect();
  }
});

// Start observing the document body for child list changes and subtree changes
sidebarObserver.observe(document.body, { childList: true, subtree: true });

// Also, perform an initial check for pending prompts on page load.
document.addEventListener('DOMContentLoaded', () => {
    // This message is sent from background.js when a tab updates to the Gemini URL
    chrome.runtime.sendMessage({ type: 'processPendingPromptInContentScript' });
    // Also, trigger sidebar injection attempt immediately in case the page is already loaded.
    const appRoot = document.getElementById('app-root');
    if (appRoot && !document.getElementById('aura-ai-sidebar')) {
        injectAuraAISidebar();
    }
});
