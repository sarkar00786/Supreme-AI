// initialize.js
// This script initializes environment variables, global settings, and handles core background logic for Aura AI.
/* global addCustomPromptContextMenu */ // addCustomPromptContextMenu is needed for context menu resets
/* eslint-disable no-unused-vars, prefer-const, no-await-in-loop */ // Temporarily disable linter rules for full implementation

// --- Aura AI API Endpoints and Configuration ---
// IMPORTANT: These URLs should point to YOUR serverless backend services for Aura AI.
// For security, sensitive operations (like paid features or API key management)
// should be proxied through YOUR backend, not directly from the extension.
// Example: If using AWS Lambda via API Gateway: 'https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/prod'
// Example: If using Google Cloud Functions: 'https://your-region-your-project.cloudfunctions.net/your-function-name'
let AURA_AI_API_URL = 'https://api.aura-ai.com'; // Placeholder: Replace with your deployed serverless API Gateway/Function URL
let AURA_AI_DEV_API_URL = 'https://dev.api.aura-ai.com:8000'; // Placeholder: Replace with your development serverless API URL

// --- Authentication Headers for Aura AI Backend ---
// This will store your hashed access token or other authentication credentials for your backend.
// 'Aura-Token' is a placeholder header name.
const defaultAuraAIHeaders = {};

// --- Payment Gateway Configuration ---
// Removed all specific Stripe IDs and payment-related logic.
// If you implement a payment gateway in Pakistan (e.g., JazzCash, Easypaisa),
// its configuration and processing should be handled entirely by YOUR backend server.
// The browser extension will communicate with your backend, not directly with payment providers.

// Set initial environment variables in local storage
chrome.storage.local.set({ AURA_AI_API_URL });

// Adjust API URLs based on extension install type (development vs. production)
chrome.management.getSelf(
  (extensionInfo) => {
    if (extensionInfo.installType === 'development') {
      AURA_AI_API_URL = AURA_AI_DEV_API_URL;
    }
    chrome.storage.local.set({ AURA_AI_API_URL });
  },
);

/**
 * Initializes default local storage settings upon extension install.
 * This ensures common data structures are present for Aura AI.
 * All settings are now prefixed with 'aura' or adapted to Aura AI's context.
 */
function initializeStorageOnInstall() {
  chrome.storage.local.set({
    auraAccount: {}, // Stores Aura AI user account info
    auraLastSelectedConversation: null, // Tracks last selected conversation ID
    auraCustomInstructionProfiles: [], // Stores custom instruction profiles for Aura AI
    auraDiscovery: {}, // For Aura AI's discovery features (e.g., community prompts/tools)
    auraModels: [], // Stores available AI models from your backend
    auraSelectedModel: null, // Tracks the currently selected AI model
    readNewsletterIds: [], // Tracks read newsletters/announcements
    userInputValueHistory: [], // Stores user input history
    settings: {
      // General Aura AI UI/UX settings
      animateFavicon: false,
      dontShowPromptManagerMoveHelper: false,
      promptHistoryUpDownKey: true,
      copyMode: false, // For copying Aura AI generated content
      exportMode: true, // For exporting Aura AI generated content
      autoResetTopNav: true,
      showFavoritePromptsButton: true,
      hideNewsletter: true,
      hideReleaseNote: true,
      hideUpdateNotification: false,
      chatEndedSound: false,
      customConversationWidth: false,
      conversationWidth: 50,
      submitPromptOnEnter: true,
      promptTemplate: true,
      autoClick: false,
      showLanguageSelector: false,
      showToneSelector: false,
      showWritingStyleSelector: false,
      selectedLanguage: { code: 'default', name: 'Default' },
      selectedTone: { code: 'default', name: 'Default', description: 'No specific tone instruction' },
      selectedWritingStyle: { code: 'default', name: 'Default', description: 'No specific writing style instruction' },
      selectedNotesSortBy: { name: 'Update date', code: 'updated_at' },
      selectedNotesView: 'grid', // list, grid
      selectedConversationsManagerSortBy: { name: 'Update date', code: 'updated_at' },
      selectedPromptsManagerSortBy: { name: 'Update date', code: 'updated_at' },
      selectedPromptsManagerTag: { name: 'All', code: 'all' },
      selectedPromptsManagerLanguage: { name: 'All', code: 'all' },
      selectedPromptEditorLanguage: { name: 'Select', code: 'select' },
      autoContinueWhenPossible: true,
      autoSpeak: false, // For Aura AI voice responses
      speechToTextLanguage: { name: 'English (United Kingdom)', code: 'en-GB' }, // For user's speech input
      speechToTextInterimResults: true,
      autoSubmitWhenReleaseAlt: false,
      managerSidebarWidth: 220,
      excludeConvInFolders: false,

      autoReloadOnUpdate: true,
      showSidebarNoteButton: true,
      showSidebarFolderButton: true,

      showMemoryTogglesInInput: true,

      showMessageTimestamp: false,
      showMessageCharWordCount: false,
      showConversationTimestampInSidebar: false,
      showConversationIndicatorsInSidebar: false,
      showCustomInstructionProfileSelector: true,
      autoFolderCustomGPTs: false, // Renamed from GPTs to be general tools/AI types
      showFoldersInLeftSidebar: false,
      syncGizmos: false, // For syncing Aura AI specific tools/AI configurations
      reorderGPTs: false, // For reordering Aura AI tools/AI configurations
      sidebysideVoice: false, // For side-by-side voice chat UIs
      showMiniMap: false,
      overrideModelSwitcher: false, // For overriding model selection UI
      syncProjects: false, // For syncing Aura AI projects/workspaces
      syncHistoryResponses: true, // For syncing Aura AI conversation history
      triggerEndOfConvOnEvent: false,
      autoDelete: false,
      autoDeleteNumDays: 7,
      autoDeleteExcludeFolders: true,
      autoArchive: false,
      autoArchiveNumDays: 7,
      autoArchiveExcludeFolders: true,
      autoSummarize: false,
      autoSplit: false,
      autoSplitLimit: 24000,
      autoSplitInitialPrompt: `Act like a document/text loader until you load and remember the content of the next text/s or document/s.
There might be multiple files, each file is marked by name in the format ### DOCUMENT NAME.
I will send them to you in chunks. Each chunk starts will be noted as [START CHUNK x/TOTAL], and the end of this chunk will be noted as [END CHUNK x/TOTAL], where x is the number of current chunks, and TOTAL is the number of all chunks I will send you.
I will split the message in chunks, and send them to you one by one. For each message follow the instructions at the end of the message.
Let's begin:
`,
      autoSplitChunkPrompt: `Reply with OK: [CHUNK x/TOTAL]
Don't reply with anything else!`,
    },
  });
}

// Listen for extension install/update to run initialization
chrome.runtime.onInstalled.addListener((detail) => {
  chrome.management.getSelf(
    (extensionInfo) => {
      chrome.storage.local.get({ installDate: null }, (result) => {
        if (!result.installDate) {
          chrome.storage.local.set({ installDate: Date.now() });
        }
      });

      if (detail.reason === 'update') {
        // Clear old sync related storage keys if they exist from a previous version
        chrome.storage.sync.remove('lastUserSync');
        // Reload Gemini/Aura AI tabs if autoReloadOnUpdate is true
        chrome.storage.local.get({ settings: null }, (result) => {
          const autoReloadOnUpdate = result.settings?.autoReloadOnUpdate;
          if (autoReloadOnUpdate) {
            chrome.tabs.query({ url: 'https://chat.gemini.google.com/*' }, (tabs) => { // Targeting Gemini for content injection
              tabs.forEach((tab) => {
                chrome.tabs.reload(tab.id);
              });
            });
            // If you build a specific Aura AI chat UI, you'd reload that too:
            // chrome.tabs.query({ url: 'https://chat.aura-ai.com/*' }, (tabs) => {
            //   tabs.forEach((tab) => {
            //     chrome.tabs.reload(tab.id);
            //   });
            // });
          }
        });
        // Rebuild context menus on update to reflect new features/permissions
        chrome.contextMenus.removeAll(() => {
          addCustomPromptContextMenu();
        });
      }
      if (detail.reason === 'install') {
        clearAllCache(); // Clear all cache for a fresh install
        initializeStorageOnInstall(); // Initialize all Aura AI specific storage
        if (extensionInfo.installType !== 'development') {
          // On fresh install, open Aura AI website/chat UI
          chrome.tabs.create({ url: 'https://aura-ai.com', active: true }); // Your main Aura AI landing page
          // Removed old Superpower Daily/FAQ/Video tutorials links
        }
      }
      // Removed specific uninstall URL tracking for old API
      // If you need uninstall tracking for Aura AI, implement it with your own backend
    },
  );
});

/**
 * Creates a SHA-256 hash of a given string.
 * This is used for generating an authentication token for your backend.
 * @param {string} token The string to hash.
 * @returns {Promise<string>} The hexadecimal representation of the SHA-256 hash.
 */
async function createHash(token) {
  const msgBuffer = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Placeholder for registering user data with your Aura AI serverless backend.
 * This function needs to be implemented to send relevant user data (e.g., from Google auth or other SSO)
 * to your own secure Aura AI serverless function. It replaces the old 'registerUser' and 'apiGetAccount' logic.
 * The `meData.accessToken` here would ideally be a token *your backend* generates for the client,
 * not a raw Google token, as direct use of Google's user access tokens in your custom backend
 * requires careful OAuth setup and validation.
 * @param {object} meData User data obtained after authentication (e.g., from a Google Sign-In on your backend).
 */
async function registerUserWithAuraAI(meData) {
  console.log('Registering user with Aura AI serverless backend (placeholder):', meData);
  // This is where you would send the user's details (e.g., email, user_id)
  // to your AURA_AI_API_URL/aura/register endpoint.
  // You would also generate and store your Aura AI specific authentication token here,
  // which your serverless function would then validate for subsequent API calls.

  if (!meData?.accessToken) {
    console.warn("No access token provided for Aura AI registration. Ensure your backend handles auth.");
    // In a real serverless setup, you might trigger a login flow to get an Aura AI specific token
    return;
  }

  // Assuming `meData.accessToken` is a token issued by *your* Aura AI backend
  // or a validated token from a third-party SSO that your backend has verified.
  const auraAccessTokenHash = await createHash(meData.accessToken.split('Bearer ')[1] || meData.accessToken); // Handle 'Bearer ' prefix if present
  defaultAuraAIHeaders['Aura-Token'] = auraAccessTokenHash; // Use your custom header for Aura AI backend

  const body = {
    user_id: meData.id, // Or a new unique ID generated by your Aura AI backend
    email: meData.email,
    name: meData.name || meData.email,
    // Add other relevant user data for Aura AI (e.g., avatar, language preferences)
  };

  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/register/`, { // Your serverless endpoint for user registration
      method: 'POST',
      headers: {
        ...defaultAuraAIHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000) // Timeout for API call
    });
    const newData = await response.json();
    console.log('Aura AI registration response:', newData);

    // Update chrome.storage.sync with Aura AI specific user info
    await chrome.storage.sync.set({
      aura_user_id: newData.id, // Your Aura AI backend's user ID
      auraAccessToken: meData.accessToken, // Store the original token for subsequent use if needed
      auraAccessTokenHash, // Store the hashed token for your backend
      auraUserName: newData.name,
      auraUserEmail: newData.email,
      auraUserAvatar: newData.avatar,
      auraLastSync: Date.now(), // Track last sync time for Aura AI data
      auraVersion: chrome.runtime.getManifest().version, // Store extension version with user
    });

    // Handle any banning logic if your Aura AI backend has it
    if (newData.is_banned) {
      await chrome.storage.local.clear(); // Clear all local data on ban
      await chrome.storage.sync.set({ isBanned: true });
      console.warn("Aura AI user account is banned.");
    }
    // Removed sendScreenshot call tied to registration as it's separate feature

  } catch (error) {
    console.error('Aura AI user registration failed:', error);
    // Potentially show user a message about login failure
  }
}

/**
 * Utility to convert Data URI to Blob.
 * @param {string} dataURI The data URI string.
 * @param {string} [type] The MIME type of the Blob.
 * @returns {Blob} The Blob object.
 */
function dataURItoBlob(dataURI, type) {
  const byteString = atob(dataURI.split(',')[1]);
  const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);

  for (let i = 0; i < byteString.length; i += 1) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: type || mimeString });
}

/**
 * Utility to convert Blob to Data URI.
 * @param {Blob} blob The Blob object.
 * @returns {Promise<string>} The Data URI string.
 */
async function blobToDataURI(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Sends a screenshot to your Aura AI serverless backend for processing (e.g., with Gemini Vision API).
 * @param {string} userId The user's ID from Aura AI backend.
 */
async function sendScreenshotToAuraAI(userId) {
  const hasPermission = await chrome.permissions.contains({
    permissions: ['tabs', 'activeTab'],
  });

  if (!hasPermission) {
    console.warn("Screenshot permission not granted. Cannot capture screenshot for Aura AI.");
    return;
  }

  chrome.tabs.captureVisibleTab(null, { format: 'png' }, async (dataUrl) => {
    if (!dataUrl) {
      console.error("Failed to capture visible tab.");
      return;
    }

    const blob = dataURItoBlob(dataUrl);
    const file = new File([blob], 'screenshot.png', { type: 'image/png' });

    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('screenshot', file);

    try {
      // Use your Aura AI serverless endpoint for screenshot processing (e.g., API Gateway -> Lambda)
      const response = await fetch(`${AURA_AI_API_URL}/aura/process-screenshot/`, {
        method: 'POST',
        headers: {
          ...defaultAuraAIHeaders, // Include your Aura AI auth header
          // 'Content-Type': 'multipart/form-data' is typically set automatically with FormData
        },
        body: formData,
        signal: AbortSignal.timeout(60000) // Extend timeout for image upload to serverless
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      console.log('Screenshot processed by Aura AI serverless backend:', result);
      // You would then send this result to the relevant tab (e.g., a Gemini chat UI)
      // For now, we'll log, but this needs specific content script integration
      // if targeting Gemini's existing UI or a custom UI.
    } catch (error) {
      console.error('Failed to send screenshot to Aura AI serverless backend:', error);
    }
  });
}

// --- Message Listener for Communication Between Extension Parts ---
chrome.runtime.onMessage.addListener(
  // eslint-disable-next-line no-unused-vars
  (request, sender, sendResponse) => {
    (async () => {
      const requestType = request.type;
      const forceRefresh = request.forceRefresh || false;
      const data = request.detail || {};

      // Authentication check for Aura AI backend calls
      await chrome.storage.sync.get(['auraAccessTokenHash'], async (result) => {
        if (result.auraAccessTokenHash) {
          defaultAuraAIHeaders['Aura-Token'] = result.auraAccessTokenHash;
        } else {
          console.warn('No Aura AI access token found. Some features may not work. Please ensure user is registered with Aura AI backend.');
          // You might trigger a re-authentication flow here if needed
          // sendResponse({ error: 'No Aura AI access token found' });
          // return;
        }

        const cacheKey = await makeCacheKey(requestType, data);
        const cachedResponse = getCache(cacheKey);

        // Serve from cache if available and not forced refresh
        if (cachedResponse && !forceRefresh) {
          sendResponse(cachedResponse);
          return;
        }

        // --- Core Aura AI Message Handlers (mapping original features to new backend) ---

        // User and Authentication
        if (requestType === 'authReceived') {
          const meData = request.detail; // User data from whatever authentication method you use
          if (meData?.id) {
            await registerUserWithAuraAI(meData);
          }
          sendResponse({ status: 'success' }); // Respond immediately for auth
        } else if (requestType === 'signoutReceived') {
          await flushStorage();
          sendResponse({ status: 'success' });
        }
        // Screenshot and Image Handling
        else if (requestType === 'takeScreenshot') {
          const auraUserId = (await chrome.storage.sync.get('aura_user_id'))?.aura_user_id || 'anonymous';
          await sendScreenshotToAuraAI(auraUserId);
          sendResponse({ status: 'success' });
        } else if (requestType === 'sendImage') {
          // This assumes `sendImage` is implemented similarly to `sendScreenshotToAuraAI`
          // You'll need a serverless backend endpoint for this that can handle image data.
          console.log('Sending image to Aura AI serverless backend (placeholder):', data.imageUrl);
          sendResponse({ status: 'success' }); // Placeholder response
        }
        // Prompts Management (All calls redirected to Aura AI serverless backend)
        else if (requestType === 'addPrompts') {
          addAuraPrompts(data.prompts).then((res) => {
            clearCache('getPrompts'); clearCache('getPrompt'); clearCache('getPromptFolders');
            clearCache('getAllPromptFolders'); clearCache('getAllFavoritePrompts');
            sendResponse(res);
          });
        } else if (requestType === 'updatePrompt') {
          updateAuraPrompt(data.promptData).then((res) => {
            clearCache('getPrompts'); clearCache('getPrompt'); clearCache('getAllFavoritePrompts');
            clearCache('getDefaultFavoritePrompt');
            sendResponse(res);
          });
        } else if (requestType === 'getPrompt') {
          getAuraPrompt(data.promptId).then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'getPromptsCount') {
          getAuraPromptsCount().then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'getPrompts') {
          getAuraPrompts(data.pageNumber, data.searchTerm, data.sortBy, data.language, data.tag, data.folderId, data.isFavorite, data.isPublic).then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'getAllPrompts') {
          getAllAuraPrompts(data.folderId).then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'getPromptByTitle') {
          getAuraPromptByTitle(data.title).then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'getAllFavoritePrompts') {
          getAllAuraFavoritePrompts().then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'deletePrompts') {
          deleteAuraPrompts(data.promptIds).then((res) => {
            clearCache('getPrompts'); clearCache('getPrompt'); clearCache('getPromptFolders');
            clearCache('getAllPromptFolders'); clearCache('getAllFavoritePrompts'); clearCache('getDefaultFavoritePrompt');
            sendResponse(res);
          });
        } else if (requestType === 'movePrompts') {
          moveAuraPrompts(data.folderId, data.promptIds).then((res) => {
            clearCache('getPrompts'); clearCache('getPrompt'); clearCache('getPromptFolders'); clearCache('getAllPromptFolders');
            sendResponse(res);
          });
        } else if (requestType === 'togglePromptPublic') {
          toggleAuraPromptPublic(data.promptId).then((res) => { clearCache('getPrompts'); clearCache('getPrompt'); sendResponse(res); });
        } else if (requestType === 'toggleFavoritePrompt') {
          toggleAuraFavoritePrompt(data.promptId).then((res) => {
            clearCache('getPrompts'); clearCache('getPrompt'); clearCache('getAllFavoritePrompts'); clearCache('getDefaultFavoritePrompt');
            sendResponse(res);
          });
        } else if (requestType === 'resetAllFavoritePrompts') {
          resetAllAuraFavoritePrompts().then((res) => {
            clearCache('getPrompts'); clearCache('getPrompt'); clearCache('getAllFavoritePrompts');
            sendResponse(res);
          });
        } else if (requestType === 'setDefaultFavoritePrompt') {
          setDefaultAuraFavoritePrompt(data.promptId).then((res) => {
            clearCache('getPrompts'); clearCache('getPrompt'); clearCache('getAllFavoritePrompts'); clearCache('getDefaultFavoritePrompt');
            sendResponse(res);
          });
        } else if (requestType === 'getDefaultFavoritePrompt') {
          getDefaultAuraFavoritePrompt().then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'duplicatePrompt') {
          duplicateAuraPrompt(data.promptId).then((res) => {
            clearCache('getPrompts'); clearCache('getPrompt'); clearCache('getPromptFolders');
            clearCache('getAllPromptFolders'); clearCache('getAllFavoritePrompts'); clearCache('getDefaultFavoritePrompt');
            sendResponse(res);
          });
        } else if (requestType === 'incrementPromptUseCount') {
          incrementAuraPromptUseCount(data.promptId).then((res) => { sendResponse(res); });
        } else if (requestType === 'votePrompt') {
          voteAuraPrompt(data.promptId, data.voteType).then((res) => { sendResponse(res); });
        } else if (requestType === 'reportPrompt') {
          reportAuraPrompt(data.promptId).then((res) => { sendResponse(res); });
        } else if (requestType === 'getPromptTags') {
          getAuraPromptTags().then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'getPromptFolders') {
          getAuraPromptFolders(data.parentFolderId, data.sortBy, data.searchTerm).then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'getAllPromptFolders') {
          getAllAuraPromptFolders(data.sortBy).then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'addPromptFolders') {
          addAuraPromptFolders(data.folders).then((res) => { clearCache('getPromptFolders'); clearCache('getAllPromptFolders'); sendResponse(res); });
        } else if (requestType === 'deletePromptFolder') {
          deleteAuraPromptFolder(data.folderId).then((res) => {
            clearCache('getPromptFolders'); clearCache('getAllPromptFolders'); clearCache('getPrompts');
            clearCache('getPrompt'); clearCache('getAllFavoritePrompts'); clearCache('getDefaultFavoritePrompt');
            sendResponse(res);
          });
        } else if (requestType === 'updatePromptFolder') {
          updateAuraPromptFolder(data.folderId, data.newData).then((res) => { clearCache('getPromptFolders'); clearCache('getAllPromptFolders'); sendResponse(res); });
        } else if (requestType === 'removePromptFolderImage') {
          removeAuraPromptFolderImage(data.folderId).then((res) => { clearCache('getPromptFolders'); clearCache('getAllPromptFolders'); clearCache('getPromptFolder'); sendResponse(res); });
        }
        // Notes Management (All calls redirected to Aura AI serverless backend)
        else if (requestType === 'updateNote') {
          updateAuraNote(data.conversationId, data.name, data.text).then((res) => { clearCache('getNote'); clearCache('getNotes'); clearCache('getAllNoteConversationIds'); sendResponse(res); });
        } else if (requestType === 'renameNote') {
          renameAuraNote(data.noteId, data.newName).then((res) => { clearCache('getNote'); clearCache('getNotes'); sendResponse(res); });
        } else if (requestType === 'deleteNote') {
          deleteAuraNote(data.noteId).then((res) => { clearCache('getNote'); clearCache('getNotes'); clearCache('getAllNoteConversationIds'); sendResponse(res); });
        } else if (requestType === 'getNote') {
          getAuraNote(data.conversationId).then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'getNoteForIds') {
          getAuraNoteForIds(data.conversationIds).then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'getNotes') {
          getAuraNotes(data.page, data.searchTerm, data.sortBy).then((res) => { setCache(cacheKey, res); sendResponse(res); });
        }
        // Announcements/Newsletters (All calls redirected to Aura AI serverless backend)
        else if (requestType === 'getNewsletters') {
          getAuraNewsletters(data.page).then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'getNewsletter') {
          getAuraNewsletter(data.id).then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'getLatestNewsletter') {
          getLatestAuraNewsletter().then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'openPromoLink') {
          openAuraPromoLink(data.link); sendResponse({ status: 'success' }); // No backend call needed for opening link
        } else if (requestType === 'getReleaseNote') {
          getAuraReleaseNote(data.version).then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'getLatestVersion') {
          getLatestAuraVersion().then((res) => { sendResponse(res); });
        } else if (requestType === 'reloadExtension') {
          reloadAuraExtension().then((res) => { sendResponse(res); });
        } else if (requestType === 'getLatestAnnouncement') {
          getLatestAuraAnnouncement().then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'incrementOpenRate') {
          incrementAuraOpenRate(data.announcementId).then((res) => { sendResponse(res); });
        } else if (requestType === 'incrementClickRate') {
          incrementAuraClickRate(data.announcementId).then((res) => { sendResponse(res); });
        } else if (requestType === 'incrementPromoLinkClickRate') {
          incrementAuraPromoLinkClickRate(data.announcementId, data.promoLink).then((res) => { sendResponse(res); });
        }
        // "Gizmos" / Tools Management (All calls redirected to Aura AI serverless backend)
        else if (requestType === 'getRandomGizmo') {
          getRandomAuraTool().then((res) => { sendResponse(res); });
        } else if (requestType === 'getSuperpowerGizmos') { // Renamed to getAuraTools
          getAuraTools(data.pageNumber, data.searchTerm, data.sortBy, data.category).then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'submitSuperpowerGizmos') { // Renamed to submitAuraTools
          submitAuraTools(data.gizmos, data.category).then((res) => { clearCache('getAuraTools'); sendResponse(res); });
        } else if (requestType === 'updateGizmoMetrics') { // Renamed to updateAuraToolMetrics
          updateAuraToolMetrics(data.gizmoId, data.metricName, data.direction).then((res) => { clearCache('getAuraTools'); sendResponse(res); });
        } else if (requestType === 'deleteSuperpowerGizmo') { // Renamed to deleteAuraTool
          deleteAuraTool(data.gizmoId).then((res) => { clearCache('getAuraTools'); sendResponse(res); });
        }
        // Gallery Images (All calls redirected to Aura AI serverless backend)
        else if (requestType === 'addGalleryImages') {
          addAuraGalleryImages(data.images).then((res) => { clearCache('getGalleryImages'); clearCache('getGalleryImagesByDateRange'); sendResponse(res); });
        } else if (requestType === 'getGalleryImages') {
          getAuraGalleryImages(data.showAll, data.pageNumber, data.searchTerm, data.byUserId, data.sortBy, data.category, data.isPublic).then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'getSelectedGalleryImages') {
          getSelectedAuraGalleryImages(data.category, data.imageIds, data.conversationId).then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'getGalleryImagesByDateRange') {
          getAuraGalleryImagesByDateRange(data.startDate, data.endDate, data.category).then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'deleteGalleryImages') {
          deleteAuraGalleryImages(data.imageIds, data.category).then((res) => {
            clearCache('getGalleryImages'); clearCache('getGalleryImagesByDateRange'); clearCache('getSelectedGalleryImages');
            sendResponse(res);
          });
        } else if (requestType === 'shareGalleryImages') {
          shareAuraGalleryImages(data.imageIds, data.category).then((res) => { sendResponse(res); });
        } else if (requestType === 'downloadImage') {
          downloadAuraImage(data.url).then((res) => { sendResponse(res); });
        }
        // Custom Instruction Profiles (All calls redirected to Aura AI serverless backend)
        else if (requestType === 'getCustomInstructionProfile') {
          getAuraCustomInstructionProfile(data.profileId).then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'getEnabledCustomInstructionProfile') {
          getEnabledAuraCustomInstructionProfile().then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'getCustomInstructionProfiles') {
          getAuraCustomInstructionProfiles(data.pageNumber, data.searchTerm, data.sortBy).then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'addCustomInstructionProfile') {
          addAuraCustomInstructionProfile(data.profile).then((res) => {
            clearCache('getCustomInstructionProfile'); clearCache('getEnabledCustomInstructionProfile'); clearCache('getCustomInstructionProfiles');
            sendResponse(res);
          });
        } else if (requestType === 'updateCustomInstructionProfile') {
          updateAuraCustomInstructionProfile(data.profileId, data.profile).then((res) => {
            clearCache('getCustomInstructionProfile'); clearCache('getEnabledCustomInstructionProfile'); clearCache('getCustomInstructionProfiles');
            sendResponse(res);
          });
        } else if (requestType === 'updateCustomInstructionProfileByData') {
          updateAuraCustomInstructionProfileByData(data.profile).then((res) => {
            clearCache('getCustomInstructionProfile'); clearCache('getEnabledCustomInstructionProfile'); clearCache('getCustomInstructionProfiles');
            sendResponse(res);
          });
        } else if (requestType === 'deleteCustomInstructionProfile') {
          deleteAuraCustomInstructionProfile(data.profileId).then((res) => {
            clearCache('getCustomInstructionProfile'); clearCache('getEnabledCustomInstructionProfile'); clearCache('getCustomInstructionProfiles');
            sendResponse(res);
          });
        }
        // Pinned Messages (All calls redirected to Aura AI serverless backend)
        else if (requestType === 'getPinnedMessages') {
          getPinnedAuraMessages(data.pageNumber, data.conversationId, data.searchTerm).then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'getAllPinnedMessagesByConversationId') {
          getAllPinnedAuraMessagesByConversationId(data.conversationId).then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'addPinnedMessages') {
          addPinnedAuraMessages(data.pinnedMessages).then((res) => { clearCache('getPinnedMessages'); clearCache('getAllPinnedMessagesByConversationId'); sendResponse(res); });
        } else if (requestType === 'addPinnedMessage') {
          addPinnedAuraMessage(data.conversationId, data.messageId, data.message).then((res) => { clearCache('getPinnedMessages'); clearCache('getAllPinnedMessagesByConversationId'); sendResponse(res); });
        } else if (requestType === 'deletePinnedMessage') {
          deletePinnedAuraMessage(data.messageId).then((res) => { clearCache('getPinnedMessages'); clearCache('getAllPinnedMessagesByConversationId'); sendResponse(res); });
        }
        // Conversation Folders (All calls redirected to Aura AI serverless backend)
        else if (requestType === 'getConversationFolder') {
          getAuraConversationFolder(data.folderId).then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'getConversationFolderByGizmoId') { // Renamed to ByAuraToolId
          getAuraConversationFolderByAuraToolId(data.gizmoId).then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'getConversationFolders') {
          getAuraConversationFolders(data.parentFolderId, data.sortBy, data.searchTerm).then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'addConversationFolders') {
          addAuraConversationFolders(data.folders).then((res) => {
            clearCache('getConversationFolders'); clearCache('getConversationFolder'); clearCache('getConversationFolderByGizmoId');
            sendResponse(res);
          });
        } else if (requestType === 'deleteConversationFolders') {
          deleteAuraConversationFolders(data.folderIds).then((res) => {
            clearCache('getConversationFolders'); clearCache('getConversationFolder'); clearCache('getConversationFolderByGizmoId');
            clearCache('getConversations'); clearCache('getConversationIds');
            sendResponse(res);
          });
        } else if (requestType === 'updateConversationFolder') {
          updateAuraConversationFolder(data.folderId, data.newData).then((res) => {
            clearCache('getConversationFolders'); clearCache('getConversationFolder'); clearCache('getConversationFolderByGizmoId');
            clearCache('getConversations'); clearCache('getConversationIds');
            sendResponse(res);
          });
        } else if (requestType === 'removeConversationFolderImage') {
          removeAuraConversationFolderImage(data.folderId).then((res) => { clearCache('getConversationFolders'); clearCache('getConversationFolder'); clearCache('getConversationFolderByGizmoId'); sendResponse(res); });
        } else if (requestType === 'moveConversationsToFolder') {
          moveAuraConversationsToFolder(data.folderId, data.conversations).then((res) => {
            clearCache('getConversations'); clearCache('getConversationIds'); clearCache('getAllFolderConversationIds');
            clearCache('getConversationFolders'); clearCache('getConversationFolder'); clearCache('getConversationFolderByGizmoId');
            sendResponse(res);
          });
        } else if (requestType === 'removeConversationsFromFolder') {
          removeAuraConversationsFromFolder(data.conversationIds).then((res) => {
            clearCache('getConversations'); clearCache('getConversationIds'); clearCache('getAllFolderConversationIds');
            clearCache('getConversationFolders'); clearCache('getConversationFolder'); clearCache('getConversationFolderByGizmoId');
            sendResponse(res);
          });
        } else if (requestType === 'moveConversationIdsToFolder') {
          moveAuraConversationIdsToFolder(data.folderId, data.conversationIds).then((res) => {
            clearCache('getConversations'); clearCache('getConversationIds'); clearCache('getAllFolderConversationIds');
            clearCache('getConversationFolders'); clearCache('getConversationFolder'); clearCache('getConversationFolderByGizmoId');
            sendResponse(res);
          });
        }
        // Conversations Management (All calls redirected to Aura AI serverless backend)
        else if (requestType === 'getConversations') {
          getAuraConversations(data.folderId, data.sortBy, data.pageNumber, data.fullSearch, data.searchTerm, data.isFavorite, data.isArchived, data.excludeConvInFolders).then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'getConversationIds') {
          getAuraConversationIds(data.startDate, data.endDate, data.includeArchived, data.excludeConvInFolders).then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'getNonSyncedConversationIds') {
          getNonSyncedAuraConversationIds().then((res) => { sendResponse(res); });
        } else if (requestType === 'getNonSyncedConversationCount') {
          getNonSyncedAuraConversationCount().then((res) => { sendResponse(res); });
        } else if (requestType === 'getSyncedConversationCount') {
          getSyncedAuraConversationCount().then((res) => { sendResponse(res); });
        } else if (requestType === 'initializeConversationSync' && sender.tab) {
          initializeAuraConversationSync(sender.tab.id);
        } else if (requestType === 'initConvHistorySync' && sender.tab) {
          initAuraConvHistorySync(sender.tab.id, data.syncIntervalTime);
        } else if (requestType === 'getConversation') {
          getAuraConversation(data.conversationId).then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'getTotalConversationsCount') {
          getTotalAuraConversationsCount().then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'getTotalArchivedConversationsCount') {
          getTotalAuraArchivedConversationsCount().then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'getAllFavoriteConversationIds') {
          getAllFavoriteAuraConversationIds().then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'getAllFolderConversationIds') {
          getAllFolderAuraConversationIds(data.folderId).then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'getAllNoteAuraConversationIds') {
          getAllNoteAuraConversationIds().then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'getRandomConversationId') {
          getRandomAuraConversationId().then((res) => { sendResponse(res); });
        } else if (requestType === 'addConversations') {
          addAuraConversations(data.conversations).then((res) => {
            clearCache('getConversations'); clearCache('getConversationIds'); clearCache('getConversation');
            sendResponse(res);
          });
        } else if (requestType === 'addConversation') {
          addAuraConversation(data.conversation).then((res) => { sendResponse(res); });
        } else if (requestType === 'renameConversation') {
          renameAuraConversation(data.conversationId, data.title).then((res) => {
            clearCache('getConversations'); clearCache('getConversationIds'); clearCache('getConversation');
            sendResponse(res);
          });
        } else if (requestType === 'toggleConversationFavorite') {
          toggleAuraConversationFavorite(data.conversation).then((res) => {
            clearCache('getConversations'); clearCache('getConversationIds'); clearCache('getConversation');
            clearCache('getAllFavoriteConversationIds');
            sendResponse(res);
          });
        } else if (requestType === 'updateConversationProject') { // Renamed to updateAuraConversationTool
          updateAuraConversationTool(data.conversationId, data.gizmoId).then((res) => {
            clearCache('getConversations'); clearCache('getConversationIds'); clearCache('getConversation');
            sendResponse(res);
          });
        } else if (requestType === 'resetAllFavoriteConversations') {
          resetAllFavoriteAuraConversations().then((res) => {
            clearCache('getConversations'); clearCache('getConversationIds'); clearCache('getConversation'); clearCache('getAllFavoriteConversationIds');
            sendResponse(res);
          });
        } else if (requestType === 'deleteConversations') {
          deleteAuraConversations(data.conversationIds).then((res) => {
            clearCache('getConversations'); clearCache('getConversationIds'); clearCache('getConversation');
            clearCache('getAllFavoriteConversationIds'); clearCache('getConversationFolders'); clearCache('getConversationFolder'); clearCache('getConversationFolderByGizmoId');
            sendResponse(res);
          });
        } else if (requestType === 'deleteAllConversations') {
          deleteAllAuraConversations().then((res) => {
            clearCache('getConversations'); clearCache('getConversationIds'); clearCache('getConversation');
            clearCache('getAllFavoriteConversationIds'); clearCache('getConversationFolders'); clearCache('getConversationFolder'); clearCache('getConversationFolderByGizmoId');
            sendResponse(res);
          });
        } else if (requestType === 'deleteAllArchivedConversations') {
          deleteAllArchivedAuraConversations().then((res) => {
            clearCache('getConversations'); clearCache('getConversationIds'); clearCache('getConversation');
            clearCache('getAllFavoriteConversationIds'); clearCache('getConversationFolders'); clearCache('getConversationFolder'); clearCache('getConversationFolderByGizmoId');
            sendResponse(res);
          });
        } else if (requestType === 'archiveConversations') {
          archiveAuraConversations(data.conversationIds).then((res) => {
            clearCache('getConversations'); clearCache('getConversationIds'); clearCache('getConversation');
            clearCache('getAllFavoriteConversationIds'); clearCache('getConversationFolders'); clearCache('getConversationFolder'); clearCache('getConversationFolderByGizmoId');
            sendResponse(res);
          });
        } else if (requestType === 'unarchiveConversations') {
          unarchiveAuraConversations(data.conversationIds).then((res) => {
            clearCache('getConversations'); clearCache('getConversationIds'); clearCache('getConversation');
            clearCache('getConversationFolders'); clearCache('getConversationFolder'); clearCache('getConversationFolderByGizmoId');
            sendResponse(res);
          });
        } else if (requestType === 'archiveAllConversations') {
          archiveAllAuraConversations().then((res) => {
            clearCache('getConversations'); clearCache('getConversationIds'); clearCache('getConversation');
            clearCache('getAllFavoriteConversationIds'); clearCache('getConversationFolders'); clearCache('getConversationFolder'); clearCache('getConversationFolderByGizmoId');
            sendResponse(res);
          });
        }
        // General Remote Settings and Cache Management
        else if (requestType === 'getRemoteSettings') { // Renamed to getRemoteAuraSettings
          getRemoteAuraSettings().then((res) => { setCache(cacheKey, res); sendResponse(res); });
        } else if (requestType === 'resetContextMenu') {
          resetContextMenu(); sendResponse({ status: 'success' });
        } else if (requestType === 'clearCaches') {
          clearCaches(data.targetKeys); sendResponse({ status: 'success' });
        } else if (requestType === 'clearAllCache') {
          clearAllCache(); sendResponse({ status: 'success' });
        } else if (requestType === 'flushStorage') {
          flushStorage().then(() => { sendResponse({ status: 'success' }); });
        }
        // If an unknown request type arrives
        else {
          console.warn(`Unknown request type received in initialize.js: ${requestType}`);
          sendResponse({ error: `Unknown request type: ${requestType}` });
        }
      });
    })();
    return true; // Indicates an asynchronous response
  },
);

/**
 * Flushes most local and sync storage data, resetting the extension to a clean Aura AI state.
 * Keeps only essential settings like install date and basic URLs.
 */
async function flushStorage() {
  clearAllCache(); // Clear in-memory cache
  await chrome.storage.local.get(['settings', 'readNewsletterIds', 'userInputValueHistory', 'installDate'], (res) => {
    const {
      settings, readNewsletterIds, userInputValueHistory, installDate,
    } = res;
    chrome.storage.local.clear(() => {
      chrome.storage.local.set({
        AURA_AI_API_URL, // Keep your Aura AI API URL
        settings, // Keep Aura AI specific settings
        readNewsletterIds,
        userInputValueHistory,
        installDate,
      });
    });
  });

  // Clear sync storage as well for a clean slate
  await chrome.storage.sync.clear(() => { });
}

// --- Placeholder/Adapted Backend API Functions for Aura AI ---
// These functions are designed to mimic the original Superpower ChatGPT API calls
// but now point to your hypothetical Aura AI backend endpoints.
// You MUST implement these endpoints on your actual Aura AI backend server.

/**
 * Placeholder for fetching remote settings for Aura AI from your backend.
 * @returns {Promise<object>} An object containing remote settings.
 */
async function getRemoteAuraSettings() {
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/settings/`, { // Example endpoint
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    const settings = {};
    data?.forEach((setting) => {
      settings[setting.key] = setting.value;
    });
    return settings;
  } catch (error) {
    console.error('Failed to fetch Aura AI remote settings:', error);
    return {};
  }
  // Return dummy data for initial development if backend is not ready
  // return { dummy_setting: "value" };
}

/**
 * Placeholder for fetching custom prompts from your Aura AI backend.
 * @param {number} [pageNumber=1] Page number for pagination.
 * @param {string} [searchTerm=''] Search term for filtering.
 * @param {string} [sortBy='created_at'] Field to sort by.
 * @param {string} [language='all'] Language filter.
 * @param {string} [tag='all'] Tag filter.
 * @param {number} [folderId=null] Folder ID filter.
 * @param {boolean} [isFavorite=null] Favorite status filter.
 * @param {boolean} [isPublic=null] Public status filter.
 * @returns {Promise<Array>} An array of custom prompt objects.
 */
async function getAuraPrompts(pageNumber, searchTerm, sortBy, language, tag, folderId, isFavorite, isPublic) {
  console.log('Fetching Aura AI prompts (placeholder)');
  // Construct URL with query parameters based on inputs
  let url = `${AURA_AI_API_URL}/aura/prompts/?order_by=${sortBy || 'created_at'}`;
  if (pageNumber) url += `&page=${pageNumber}`;
  if (searchTerm && searchTerm.trim().length > 0) url += `&search=${searchTerm}`;
  if (language && language !== 'all') url += `&language=${language}`;
  if (tag && tag !== 'all') url += `&tag=${tag}`;
  if (folderId) url += `&folder_id=${folderId}`;
  if (isFavorite !== null) url += `&is_favorite=${isFavorite}`;
  if (isPublic !== null) url += `&is_public=${isPublic}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
      // Return empty array with error message if API fails
      return { results: [], count: 0, error: 'Failed to fetch prompts from Aura AI backend.' };
    }
    const data = await response.json();
    // Assuming backend returns {results: [], count: 0} structure
    return data;
  } catch (error) {
    console.error('Error fetching Aura AI prompts:', error);
    return { results: [], count: 0, error: 'Network error or backend issue.' };
  }
  // Return dummy data for initial development if backend is not ready
  // return {
  //   results: [
  //     { id: '1', title: 'Aura Summarize', instruction: 'Summarize this text concisely.', steps: ['Summarize the following: {selectionText}'], tags: [], language: 'en', steps_delay: 200, is_public: true, is_favorite: false },
  //     { id: '2', title: 'Aura Idea Generator', instruction: 'Generate creative ideas.', steps: ['Generate 5 creative ideas for: {selectionText}'], tags: [], language: 'en', steps_delay: 200, is_public: false, is_favorite: true }
  //   ],
  //   count: 2
  // };
}
async function addAuraPrompts(prompts) {
  const body = {
    prompts: prompts.map(({
      steps, title, instruction, tags = [], language, model_slug: modelSlug, steps_delay: stepsDelay = 2000, is_public: isPublic = false, is_favorite: isFavorite = false, folder = null,
    }) => ({
      steps,
      steps_delay: stepsDelay,
      title: title.trim(),
      instruction,
      is_public: isPublic,
      is_favorite: isFavorite,
      model_slug: modelSlug,
      tags: tags?.map((tag) => parseInt(tag, 10)),
      language: language && language !== 'select' ? language : 'en',
      folder,
    })),
  };
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/add-prompts/`, {
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const res = await response.json();
    if (typeof addCustomPromptContextMenu === 'function') addCustomPromptContextMenu();
    return res;
  } catch (error) { console.error('Error adding Aura prompts:', error); return { success: false, error: error.message }; }
}
async function deleteAuraPrompts(promptIds) {
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/delete-prompts/`, {
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt_ids: promptIds }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const res = await response.json();
    if (typeof addCustomPromptContextMenu === 'function') addCustomPromptContextMenu();
    return res;
  } catch (error) { console.error('Error deleting Aura prompts:', error); return { success: false, error: error.message }; }
}
async function moveAuraPrompts(folderId, promptIds) {
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/move-prompts/`, {
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_id: parseInt(folderId, 10), prompt_ids: promptIds }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error moving Aura prompts:', error); return { success: false, error: error.message }; }
}
async function toggleAuraPromptPublic(promptId) {
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/toggle-prompt-public/`, {
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt_id: promptId }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error toggling Aura prompt public status:', error); return { success: false, error: error.message }; }
}
async function toggleAuraFavoritePrompt(promptId) {
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/toggle-favorite-prompt/`, {
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt_id: promptId }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const res = await response.json();
    if (typeof addCustomPromptContextMenu === 'function') addCustomPromptContextMenu();
    return res;
  } catch (error) { console.error('Error toggling Aura favorite prompt:', error); return { success: false, error: error.message }; }
}
async function resetAllAuraFavoritePrompts() {
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/reset-all-favorite-prompts/`, {
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error resetting all Aura favorite prompts:', error); return { success: false, error: error.message }; }
}
async function setDefaultAuraFavoritePrompt(promptId) {
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/set-default-favorite-prompt/`, {
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt_id: promptId }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error setting default Aura favorite prompt:', error); return { success: false, error: error.message }; }
}
async function getDefaultAuraFavoritePrompt() {
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/get-default-favorite-prompt/`, {
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error getting default Aura favorite prompt:', error); return { success: false, error: error.message }; }
}
async function updateAuraNote(conversationId, name, text) {
  const body = { conversation_id: conversationId, name, text };
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/update-note/`, {
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error updating Aura note:', error); return { success: false, error: error.message }; }
}
async function renameAuraNote(noteId, newName) {
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/rename-note/`, {
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ note_id: noteId, new_name: newName }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error renaming Aura note:', error); return { success: false, error: error.message }; }
}
async function deleteAuraNote(noteId) {
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/delete-note/`, {
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ note_id: noteId }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error deleting Aura note:', error); return { success: false, error: error.message }; }
}
async function getAuraNote(conversationId) {
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/get-note/?conversation_id=${conversationId}`, {
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error getting Aura note:', error); return { success: false, error: error.message }; }
}
async function getAuraNoteForIds(conversationIds) {
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/get-note-for-ids/`, {
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_ids: conversationIds }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error getting Aura notes for IDs:', error); return { success: false, error: error.message }; }
}
async function getAuraNotes(page, searchTerm = '', sortBy = 'created_at') {
  if (sortBy.startsWith('-')) sortBy = sortBy.substring(1);
  let url = `${AURA_AI_API_URL}/aura/get-notes/?page=${page}&order_by=${sortBy}`;
  if (searchTerm && searchTerm.trim().length > 0) url += `&search=${searchTerm.trim()}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error getting Aura notes:', error); return { results: [], count: 0, error: error.message }; }
}
async function getAuraNewsletters(page) {
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/newsletters-paginated/?page=${page}`, {
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error getting Aura newsletters:', error); return { results: [], count: 0, error: error.message }; }
}
async function openAuraPromoLink(link) {
  // This opens an external link directly, no backend call needed for this specific action.
  chrome.tabs.create({ url: link, active: false });
}
async function getAuraNewsletter(id) {
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/${id}/newsletter/`, {
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error getting Aura newsletter:', error); return { success: false, error: error.message }; }
}
async function getLatestAuraNewsletter() {
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/latest-newsletter/`, {
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error getting latest Aura newsletter:', error); return { success: false, error: error.message }; }
}
async function getLatestAuraAnnouncement() {
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/announcements/`, {
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error getting latest Aura announcement:', error); return { success: false, error: error.message }; }
}
async function getAuraReleaseNote(version) {
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/release-notes/`, {
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ version }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error getting Aura release note:', error); return { success: false, error: error.message }; }
}
async function getLatestAuraVersion() {
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/latest-version/`, {
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const res = await response.json();
    const currentVersion = chrome.runtime.getManifest().version;
    const latestVersion = res?.latest_version;
    if (latestVersion && currentVersion !== latestVersion) {
      return chrome.runtime.requestUpdateCheck().then((updateCheck) => {
        if (updateCheck.status === 'update_available' && updateCheck.version === latestVersion) {
          return updateCheck;
        }
        return { status: 'no_update', version: '' };
      });
    }
    return { status: 'no_update', version: '' };
  } catch (error) { console.error('Error getting latest Aura version:', error); return { status: 'error', error: error.message }; }
}
async function reloadAuraExtension() {
  return chrome.runtime.reload().then(() => true);
}
// resetContextMenu is called from contextMenu.js, so its implementation is there.
// Here we just define the method that contextMenu.js expects to be available.
function resetContextMenu() {
  if (typeof addCustomPromptContextMenu === 'function') {
    chrome.contextMenus.removeAll(() => {
      addCustomPromptContextMenu();
    });
  } else {
    console.error("addCustomPromptContextMenu is not defined. Cannot reset context menu.");
  }
}
async function submitAuraTools(tools, category = '') { // Renamed from submitSuperpowerGizmos
  const body = { tools, category };
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/add-tools/`, { // New endpoint
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error submitting Aura tools:', error); return { success: false, error: error.message }; }
}
async function updateAuraToolMetrics(toolId, metricName, direction) { // Renamed from updateGizmoMetrics
  const body = { tool_id: toolId, metric_name: metricName, direction };
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/update-tool-metrics/`, { // New endpoint
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error updating Aura tool metrics:', error); return { success: false, error: error.message }; }
}
async function deleteAuraTool(toolId) { // Renamed from deleteSuperpowerGizmo
  const body = { tool_id: toolId };
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/delete-tool/`, { // New endpoint
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error deleting Aura tool:', error); return { success: false, error: error.message }; }
}
async function getAuraTools(pageNumber, searchTerm, sortBy = 'recent', category = 'all') { // Renamed from getSuperpowerGizmos
  if (sortBy.startsWith('-')) sortBy = sortBy.substring(1);
  let url = `${AURA_AI_API_URL}/aura/get-tools/?order_by=${sortBy}`; // New endpoint
  if (pageNumber) url += `&page=${pageNumber}`;
  if (category !== 'all') url += `&category=${category}`;
  if (searchTerm && searchTerm.trim().length > 0) url += `&search=${searchTerm.trim()}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
      return { results: [], count: 0, error: 'Failed to fetch tools from Aura AI backend.' };
    }
    const res = await response.json();
    // Map response to a generic 'tool' structure instead of 'gizmo'
    res.results = res?.results?.map((tool) => ({
      ...tool,
      id: tool.tool_id, // Assuming your backend returns tool_id
      vanity_metrics: {
        num_conversations_str: tool.num_conversations_str,
        created_ago_str: tool.created_ago_str,
        review_stats: tool.review_stats,
      },
    }));
    return res;
  } catch (error) { console.error('Error getting Aura tools:', error); return { results: [], count: 0, error: error.message }; }
}
async function getRandomAuraTool() { // Renamed from getRandomGizmo
  const url = `${AURA_AI_API_URL}/aura/get-random-tool/`; // New endpoint
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const res = await response.json();
    return { tool: { ...res[0], id: res[0].tool_id } }; // Assuming backend returns array of tools
  } catch (error) { console.error('Error getting random Aura tool:', error); return { success: false, error: error.message }; }
}

// NOTE: getRedirectUrl and apiGetDownloadUrlFromFileId are specific to ChatGPT's internal file system.
// For Aura AI, if you are hosting images, you'd serve them directly or via your backend.
// Removed `getRedirectUrl` as it's not applicable.

async function addAuraGalleryImages(images) { // Renamed from addGalleryImages
  // For Aura AI, this would likely send image data to your backend for storage/processing
  console.log('Adding Aura gallery images (placeholder):', images);
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/add-gallery-images/`, { // New endpoint
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ gallery_images: images }), // Assuming your backend handles the image data directly
      signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error adding Aura gallery images:', error); return { success: false, error: error.message }; }
}
async function getAuraGalleryImages(showAll = false, pageNumber = 1, searchTerm = '', byUserId = '', sortBy = 'created_at', category = 'dalle', isPublic = false) { // Renamed from getGalleryImages
  if (sortBy.startsWith('-')) sortBy = sortBy.substring(1);
  let url = `${AURA_AI_API_URL}/aura/get-gallery-images/?order_by=${sortBy}&category=${category}`; // New endpoint
  if (showAll) url += '&show_all=true';
  if (searchTerm && searchTerm.trim().length > 0) url += `&search=${searchTerm}`;
  if (pageNumber) url += `&page=${pageNumber}`;
  if (byUserId) url += `&by_user_id=${byUserId}`;
  if (isPublic) url += `&is_public=${isPublic}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
      return { results: [], count: 0, error: 'Failed to fetch gallery images from Aura AI backend.' };
    }
    return await response.json();
  } catch (error) { console.error('Error getting Aura gallery images:', error); return { results: [], count: 0, error: error.message }; }
}
async function getSelectedAuraGalleryImages(category = 'dalle', imageIds = [], conversationId = null) { // Renamed from getSelectedGalleryImages
  const url = `${AURA_AI_API_URL}/aura/get-selected-gallery-images/`; // New endpoint
  try {
    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify({ image_ids: imageIds, category, conversation_id: conversationId }),
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error getting selected Aura gallery images:', error); return { success: false, error: error.message }; }
}
async function getAuraGalleryImagesByDateRange(startDate, endDate, category = 'dalle') { // Renamed from getGalleryImagesByDateRange
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/get-gallery-images-by-date-range/?start_date=${startDate}&end_date=${endDate}&category=${category}`, { // New endpoint
      method: 'GET',
      headers: { ...defaultAURA_AI_API_URL, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error getting Aura gallery images by date range:', error); return { success: false, error: error.message }; }
}
async function deleteAuraGalleryImages(imageIds = [], category = 'dalle') { // Renamed from deleteGalleryImages
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/delete-gallery-images/`, { // New endpoint
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_ids: imageIds, category }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error deleting Aura gallery images:', error); return { success: false, error: error.message }; }
}
async function shareAuraGalleryImages(imageIds = [], category = 'dalle') { // Renamed from shareGalleryImages
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/share-gallery-images/`, { // New endpoint
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_ids: imageIds, category }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error sharing Aura gallery images:', error); return { success: false, error: error.message }; }
}
async function downloadAuraImage(url) { // Renamed from downloadImage
  // For Aura AI, this would likely be a proxy through your backend or direct download
  console.log('Downloading image for Aura AI (placeholder):', url);
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...defaultAuraAIHeaders,
        // Removed 'origin: https://chatgpt.com' as it's not applicable to Aura AI
      },
      signal: AbortSignal.timeout(30000) // Extended timeout for large images
    });
    if (!response.ok) throw new Error('Network response was not ok');
    const blob = await response.blob();
    return await blobToDataURI(blob); // Return base64 for use in frontend
  } catch (error) {
    console.error('Failed to download image for Aura AI:', error);
    return null;
  }
}
async function getAuraPromptTags() { // Renamed from getPromptTags
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/get-prompt-tags/`, { // New endpoint
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error getting Aura prompt tags:', error); return { results: [], error: error.message }; }
}
async function getAuraPromptFolders(parentFolderId = null, sortBy = 'created_at', searchTerm = '') { // Renamed from getPromptFolders
  if (sortBy.startsWith('-')) sortBy = sortBy.substring(1);
  let url = `${AURA_AI_API_URL}/aura/get-prompt-folders/?order_by=${sortBy}`; // New endpoint
  if (parentFolderId) url += `&parent_folder_id=${parentFolderId}`;
  if (searchTerm && searchTerm.trim().length > 0) url += `&search=${searchTerm}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error getting Aura prompt folders:', error); return { results: [], count: 0, error: error.message }; }
}
async function getAllAuraPromptFolders(sortBy = 'alphabetical') { // Renamed from getAllPromptFolders
  if (sortBy.startsWith('-')) sortBy = sortBy.substring(1);
  const url = `${AURA_AI_API_URL}/aura/get-all-prompt-folders/?order_by=${sortBy}`; // New endpoint
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error getting all Aura prompt folders:', error); return { results: [], count: 0, error: error.message }; }
}
async function addAuraPromptFolders(folders) { // Renamed from addPromptFolders
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/add-prompt-folders/`, { // New endpoint
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ folders }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error adding Aura prompt folders:', error); return { success: false, error: error.message }; }
}
async function deleteAuraPromptFolder(folderId) { // Renamed from deletePromptFolder
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/delete-prompt-folder/`, { // New endpoint
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_id: parseInt(folderId, 10) }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const res = await response.json();
    if (typeof addCustomPromptContextMenu === 'function') addCustomPromptContextMenu();
    return res;
  } catch (error) { console.error('Error deleting Aura prompt folder:', error); return { success: false, error: error.message }; }
}
async function updateAuraPromptFolder(folderId, newData) { // Renamed from updatePromptFolder
  // This function handles both JSON and FormData for image uploads
  const data = new FormData();
  data.append('folder_id', parseInt(folderId, 10));
  Object.keys(newData).forEach((key) => {
    if (key === 'image' && newData[key]) {
      let blob;
      if (newData.image.base64) {
        const byteString = atob(newData.image.base64);
        const arrayBuffer = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i += 1) {
          arrayBuffer[i] = byteString.charCodeAt(i);
        }
        blob = new Blob([arrayBuffer], { type: newData.image.type });
      } else if (newData.image.blob) {
        blob = newData.image.blob;
      }
      const file = new File([blob], newData.image.name, { type: newData.image.type });
      data.append(key, file); // Append file if image exists
    } else {
      data.append(key, newData[key]); // Append other data as plain text
    }
  });

  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/update-prompt-folder/`, { // New endpoint
      method: 'POST',
      headers: {
        ...defaultAuraAIHeaders,
        // 'Content-Type': 'multipart/form-data' is set automatically with FormData
      },
      body: data,
      signal: AbortSignal.timeout(15000) // Extended timeout for image upload
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error updating Aura prompt folder:', error); return { success: false, error: error.message }; }
}
async function removeAuraPromptFolderImage(folderId) { // Renamed from removePromptFolderImage
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/remove-prompt-folder-image/`, { // New endpoint
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_id: parseInt(folderId, 10) }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error removing Aura prompt folder image:', error); return { success: false, error: error.message }; }
}
async function duplicateAuraPrompt(promptId) { // Renamed from duplicatePrompt
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/duplicate-prompt/`, { // New endpoint
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt_id: promptId }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const res = await response.json();
    if (typeof addCustomPromptContextMenu === 'function') addCustomPromptContextMenu();
    return res;
  } catch (error) { console.error('Error duplicating Aura prompt:', error); return { success: false, error: error.message }; }
}
async function updateAuraPrompt(promptData) { // Renamed from updatePrompt
  const {
    id: promptId, instruction, steps, steps_delay: stepsDelay, title, is_public: isPublic = false, model_slug: modelSlug, tags = [], language, folder, is_favorite: isFavorite = false,
  } = promptData;
  const body = {
    prompt_id: promptId,
    steps,
    steps_delay: stepsDelay,
    title: title.trim(),
    instruction,
    is_public: isPublic,
    is_favorite: isFavorite,
    model_slug: modelSlug,
    tags: tags.map((tag) => parseInt(tag, 10)),
    language: language && language !== 'select' ? language : 'en',
    folder,
  };
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/update-prompt/`, { // New endpoint
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const res = await response.json();
    if (typeof promptData.isFavorite !== 'undefined' && typeof addCustomPromptContextMenu === 'function') {
      addCustomPromptContextMenu(); // Rebuild context menu if favorite status changed
    }
    return res;
  } catch (error) { console.error('Error updating Aura prompt:', error); return { success: false, error: error.message }; }
}
async function getAuraPromptsCount() { // Renamed from getPromptsCount
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/prompts-count/`, { // New endpoint
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error getting Aura prompts count:', error); return { count: 0, error: error.message }; }
}
async function getAllAuraPrompts(folderId = null) { // Renamed from getAllPrompts
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/all-prompts/${folderId ? `?folder_id=${folderId}` : ''}`, { // New endpoint
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error getting all Aura prompts:', error); return { results: [], count: 0, error: error.message }; }
}
async function getAuraPrompt(promptId) { // Renamed from getPrompt
  const url = `${AURA_AI_API_URL}/aura/${promptId}/`; // New endpoint
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error getting Aura prompt:', error); return { success: false, error: error.message }; }
}
async function getAllAuraFavoritePrompts() { // Renamed from getAllFavoritePrompts
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/get-all-favorite-prompts/`, { // New endpoint
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error getting all Aura favorite prompts:', error); return { results: [], error: error.message }; }
}
async function getAuraPromptByTitle(promptTitle) { // Renamed from getPromptByTitle
  const url = `${AURA_AI_API_URL}/aura/prompt-by-title/?title=${encodeURIComponent(promptTitle)}`; // New endpoint
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error getting Aura prompt by title:', error); return { success: false, error: error.message }; }
}
async function incrementAuraPromptUseCount(promptId) { // Renamed from incrementPromptUseCount
  const url = `${AURA_AI_API_URL}/aura/${promptId}/use-count/`; // New endpoint
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error incrementing Aura prompt use count:', error); return { success: false, error: error.message }; }
}
async function voteAuraPrompt(promptId, voteType) { // Renamed from votePrompt
  const url = `${AURA_AI_API_URL}/aura/${promptId}/vote/`; // New endpoint
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ vote_type: voteType }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error voting on Aura prompt:', error); return { success: false, error: error.message }; }
}
async function reportAuraPrompt(promptId) { // Renamed from reportPrompt
  const url = `${AURA_AI_API_URL}/aura/${promptId}/report/`; // New endpoint
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error reporting Aura prompt:', error); return { success: false, error: error.message }; }
}
async function incrementAuraOpenRate(announcementId) { // Renamed from incrementOpenRate
  const url = `${AURA_AI_API_URL}/aura/increment-open-rate/`; // New endpoint
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcement_id: announcementId }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error incrementing Aura open rate:', error); return { success: false, error: error.message }; }
}
async function incrementAuraClickRate(announcementId) { // Renamed from incrementClickRate
  const url = `${AURA_AI_API_URL}/aura/increment-click-rate/`; // New endpoint
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcement_id: announcementId }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error incrementing Aura click rate:', error); return { success: false, error: error.message }; }
}
async function incrementAuraPromoLinkClickRate(announcementId, promoLink) { // Renamed from incrementPromoLinkClickRate
  const url = `${AURA_AI_API_URL}/aura/increment-promo-link-click-rate/`; // New endpoint
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcement_id: announcementId, promo_link: promoLink }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error incrementing Aura promo link click rate:', error); return { success: false, error: error.message }; }
}
async function addAuraTextdocs(conversationId, textdocs) { // Renamed from addTextdocs
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/add-textdocs/`, { // New endpoint
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: conversationId, textdocs }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error adding Aura textdocs:', error); return { success: false, error: error.message }; }
}
async function getAuraCustomInstructionProfile(id) { // Renamed from getCustomInstructionProfile
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/get-custom-instruction-profile/?profile_id=${id}`, { // New endpoint
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error getting Aura custom instruction profile:', error); return { success: false, error: error.message }; }
}
async function getEnabledAuraCustomInstructionProfile() { // Renamed from getEnabledCustomInstructionProfile
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/get-enabled-custom-instruction-profile/`, { // New endpoint
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error getting enabled Aura custom instruction profile:', error); return { success: false, error: error.message }; }
}
async function getAuraCustomInstructionProfiles(pageNumber, searchTerm = '', sortBy = 'created_at') { // Renamed from getCustomInstructionProfiles
  if (sortBy.startsWith('-')) sortBy = sortBy.substring(1);
  let url = `${AURA_AI_API_URL}/aura/get-custom-instruction-profiles/?order_by=${sortBy}`; // New endpoint
  if (pageNumber) url += `&page=${pageNumber}`;
  if (searchTerm && searchTerm.trim().length > 0) url += `&search=${searchTerm}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error getting Aura custom instruction profiles:', error); return { results: [], count: 0, error: error.message }; }
}
async function addAuraCustomInstructionProfile(profile) { // Renamed from addCustomInstructionProfile
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/add-custom-instruction-profile/`, { // New endpoint
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error adding Aura custom instruction profile:', error); return { success: false, error: error.message }; }
}
async function deleteAuraCustomInstructionProfile(profileId) { // Renamed from deleteCustomInstructionProfile
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/delete-custom-instruction-profile/`, { // New endpoint
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: profileId }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error deleting Aura custom instruction profile:', error); return { success: false, error: error.message }; }
}
async function getPinnedAuraMessages(pageNumber, conversationId = null, searchTerm = '') { // Renamed from getPinnedMessages
  let url = `${AURA_AI_API_URL}/aura/get-pinned-messages/`; // New endpoint
  if (pageNumber) url += `?page=${pageNumber}`;
  if (conversationId) url += `&conversation_id=${conversationId}`;
  if (searchTerm && searchTerm.trim().length > 0) url += `&search=${searchTerm}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error getting pinned Aura messages:', error); return { results: [], count: 0, error: error.message }; }
}
async function getAllPinnedAuraMessagesByConversationId(conversationId) { // Renamed from getAllPinnedMessagesByConversationId
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/get-all-pinned-messages-by-conversation-id/?conversation_id=${conversationId}`, { // New endpoint
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error getting all pinned Aura messages by conversation ID:', error); return { results: [], error: error.message }; }
}
async function addPinnedAuraMessages(pinnedMessages) { // Renamed from addPinnedMessages
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/add-pinned-messages/`, { // New endpoint
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned_messages: pinnedMessages }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error adding pinned Aura messages:', error); return { success: false, error: error.message }; }
}
async function addPinnedAuraMessage(conversationId, messageId, message) { // Renamed from addPinnedMessage
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/add-pinned-message/`, { // New endpoint
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_id: conversationId, message_id: messageId, message }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error adding pinned Aura message:', error); return { success: false, error: error.message }; }
}
async function deletePinnedAuraMessage(messageId) { // Renamed from deletePinnedMessage
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/delete-pinned-message/`, { // New endpoint
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message_id: messageId }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error deleting pinned Aura message:', error); return { success: false, error: error.message }; }
}
async function updateAuraCustomInstructionProfile(profileId, profile) { // Renamed from updateCustomInstructionProfile
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/update-custom-instruction-profile/`, { // New endpoint
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: parseInt(profileId, 10), profile }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error updating Aura custom instruction profile:', error); return { success: false, error: error.message }; }
}
async function updateAuraCustomInstructionProfileByData(profile) { // Renamed from updateCustomInstructionProfileByData
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/update-custom-instruction-profile-by-data/`, { // New endpoint
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name_user_message: profile.nameUserMessage,
        role_user_message: profile.roleUserMessage,
        other_user_message: profile.otherUserMessage,
        traits_model_message: profile.traitsModelMessage,
        enabled: profile.enabled,
        disabled_tools: profile.disabledTools,
      }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error updating Aura custom instruction profile by data:', error); return { success: false, error: error.message }; }
}
async function getAuraConversationFolder(folderId) { // Renamed from getConversationFolder
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/get-conversation-folder/?folder_id=${folderId}`, { // New endpoint
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error getting Aura conversation folder:', error); return { success: false, error: error.message }; }
}
async function getAuraConversationFolderByAuraToolId(toolId) { // Renamed from getConversationFolderByGizmoId
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/get-conversation-folder-by-tool-id/?tool_id=${toolId}`, { // New endpoint
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error getting Aura conversation folder by tool ID:', error); return { success: false, error: error.message }; }
}
async function getAuraConversationFolders(parentFolderId = null, sortBy = 'created_at', searchTerm = '') { // Renamed from getConversationFolders
  if (sortBy.startsWith('-')) sortBy = sortBy.substring(1);
  let url = `${AURA_AI_API_URL}/aura/get-conversation-folders/?order_by=${sortBy}`; // New endpoint
  if (parentFolderId) url += `&parent_folder_id=${parentFolderId}`;
  if (searchTerm && searchTerm.trim().length > 0) url += `&search=${searchTerm}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error getting Aura conversation folders:', error); return { results: [], count: 0, error: error.message }; }
}
async function addAuraConversationFolders(folders) { // Renamed from addConversationFolders
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/add-conversation-folders/`, { // New endpoint
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ folders }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error adding Aura conversation folders:', error); return { success: false, error: error.message }; }
}
async function deleteAuraConversationFolders(folderIds) { // Renamed from deleteConversationFolders
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/delete-conversation-folders/`, { // New endpoint
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_ids: folderIds }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error deleting Aura conversation folders:', error); return { success: false, error: error.message }; }
}
async function updateAuraConversationFolder(folderId, newData) { // Renamed from updateConversationFolder
  // This function handles both JSON and FormData for image uploads
  const data = new FormData();
  data.append('folder_id', parseInt(folderId, 10));
  Object.keys(newData).forEach((key) => {
    if (key === 'image' && newData[key]) {
      let blob;
      if (newData.image.base64) {
        const byteString = atob(newData.image.base64);
        const arrayBuffer = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i += 1) {
          arrayBuffer[i] = byteString.charCodeAt(i);
        }
        blob = new Blob([arrayBuffer], { type: newData.image.type });
      } else if (newData.image.blob) {
        blob = newData.image.blob;
      }
      const file = new File([blob], newData.image.name, { type: newData.image.type });
      data.append(key, file); // Append file if image exists
    } else {
      data.append(key, newData[key]); // Append other data as plain text
    }
  });

  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/update-conversation-folder/`, { // New endpoint
      method: 'POST',
      headers: {
        ...defaultAuraAIHeaders,
        // 'Content-Type': 'multipart/form-data' is set automatically with FormData
      },
      body: data,
      signal: AbortSignal.timeout(15000) // Extended timeout for image upload
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error updating Aura conversation folder:', error); return { success: false, error: error.message }; }
}
async function removeAuraConversationFolderImage(folderId) { // Renamed from removeConversationFolderImage
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/remove-conversation-folder-image/`, { // New endpoint
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_id: parseInt(folderId, 10) }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error removing Aura conversation folder image:', error); return { success: false, error: error.message }; }
}
async function moveAuraConversationsToFolder(folderId, conversations) { // Renamed from moveConversationsToFolder
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/move-conversations-to-folder/`, { // New endpoint
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder_id: parseInt(folderId, 10), conversations }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error moving Aura conversations to folder:', error); return { success: false, error: error.message }; }
}
async function removeAuraConversationsFromFolder(conversationIds) { // Renamed from removeConversationsFromFolder
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/remove-conversations-from-folder/`, { // New endpoint
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversation_ids: conversationIds }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error removing Aura conversations from folder:', error); return { success: false, error: error.message }; }
}
async function moveAuraConversationIdsToFolder(folderId, conversationIds) { // Renamed from moveConversationIdsToFolder
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/move-conversation-ids-to-folder/`, { // New endpoint
      method: 'POST',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folder_id: parseInt(folderId, 10),
        conversation_ids: conversationIds,
      }),
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error moving Aura conversation IDs to folder:', error); return { success: false, error: error.message }; }
}
async function getAuraConversations(folderId, sortBy = 'updated_at', pageNumber = 1, fullSearch = false, searchTerm = '', isFavorite = null, isArchived = null, excludeConvInFolders = false) { // Renamed from getConversations
  if (sortBy.startsWith('-')) sortBy = sortBy.substring(1);
  let url = `${AURA_AI_API_URL}/aura/get-conversations/?order_by=${sortBy}`; // New endpoint
  if (folderId) url += `&folder_id=${folderId}`;
  if (pageNumber) url += `&page=${pageNumber}`;
  if (searchTerm && searchTerm.trim().length > 0) url += `&search=${searchTerm}`;
  if (fullSearch) url += '&full_search=true';
  if (isFavorite !== null) url += `&is_favorite=${isFavorite}`;
  if (isArchived !== null) url += `&is_archived=${isArchived}`;
  if (excludeConvInFolders) url += '&exclude_conv_in_folders=true';
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
      return { results: [], count: 0, error: 'Failed to fetch conversations from Aura AI backend.' };
    }
    return await response.json();
  } catch (error) { console.error('Error getting Aura conversations:', error); return { results: [], count: 0, error: error.message }; }
}
async function getAuraConversationIds(startDate = null, endDate = null, includeArchived = true, excludeConvInFolders = false) { // Renamed from getConversationIds
  let url = `${AURA_AI_API_URL}/aura/get-conversation-ids/?include_archived=${includeArchived}&exclude_conv_in_folders=${excludeConvInFolders}`; // New endpoint
  if (startDate) url += `&start_date=${startDate}`;
  if (endDate) url += `&end_date=${endDate}`;
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error getting Aura conversation IDs:', error); return { results: [], error: error.message }; }
}
async function getNonSyncedAuraConversationIds() { // Renamed from getNonSyncedConversationIds
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/get-non-synced-conversation-ids/`, { // New endpoint
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error getting non-synced Aura conversation IDs:', error); return { results: [], error: error.message }; }
}
async function getNonSyncedAuraConversationCount() { // Renamed from getNonSyncedConversationCount
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/get-non-synced-conversation-count/`, { // New endpoint
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error getting non-synced Aura conversation count:', error); return { count: 0, error: error.message }; }
}
async function getSyncedAuraConversationCount() { // Renamed from getSyncedConversationCount
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/get-synced-conversation-count/`, { // New endpoint
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) { console.error('Error getting synced Aura conversation count:', error); return { count: 0, error: error.message }; }
}
// initConvHistorySync & initializeConversationSync will still need their logic adapted
// as they currently fetch from chatgpt.com. This will be updated to fetch from Aura AI backend.

let activeTabId = null;
let convSyncInterval = null;

async function initAuraConvHistorySync(tabId, syncIntervalTime = 5000) { // Renamed from initConvHistorySync
  let syncedHistoryCount = await getTotalAuraConversationsCount();
  // IMPORTANT: The original `apiGetConversations` was fetching directly from ChatGPT.
  // For Aura AI, this would need to fetch conversations from YOUR Aura AI serverless backend.
  // This is a significant change: your backend needs a mechanism to retrieve
  // Gemini conversation history (e.g., via a user's authenticated session, or if you
  // implement a scraping/import feature on your backend).
  console.log('initAuraConvHistorySync: Placeholder - requires serverless backend implementation for full conversation import.');
  // Proceed with periodic sync placeholder, which will now try to fetch from YOUR backend.
  runAuraConversationSync(tabId, syncIntervalTime);
}

function initializeAuraConversationSync(tabId, syncIntervalTime = 5000) { // Renamed from initializeConversationSync
  chrome.storage.local.get(['isRunningConvSync'], (result) => {
    if (result.isRunningConvSync) {
      return;
    }
    chrome.storage.local.set({ isRunningConvSync: true }, () => {
      activeTabId = tabId;
      runAuraConversationSync(tabId, syncIntervalTime);
    });
  });
}
chrome.tabs.onRemoved.addListener((tabId, _removeInfo) => {
  if (tabId === activeTabId) {
    chrome.storage.local.set({ isRunningConvSync: false });
    activeTabId = null;
  }
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo, _tab) => {
  if (tabId === activeTabId && changeInfo.status === 'loading') {
    chrome.storage.local.set({ isRunningConvSync: false });
    activeTabId = null;
  }
});
async function sendAuraSyncIsDoneMessage() { // Renamed from sendSyncIsDoneMessage
  const auraAITabs = await chrome.tabs.query({ url: 'https://chat.gemini.google.com/*' }); // Target your Aura AI chat UI
  const auraAITab = auraAITabs.find((tab) => tab.active) || auraAITabs[0];
  if (auraAITab) {
    chrome.tabs.sendMessage(auraAITab.id, { type: 'auraSyncIsDone', detail: {} });
  }
}
function runAuraConversationSync(tabId, syncIntervalTime) { // Renamed from runConversationSync
  chrome.storage.local.set({ lastConvSyncActivity: Date.now() });

  getNonSyncedAuraConversationIds().then((nonSyncedConvIds) => {
    if (!Array.isArray(nonSyncedConvIds)) {
      sendAuraSyncIsDoneMessage();
      return;
    }
    if (nonSyncedConvIds.length === 0) {
      sendAuraSyncIsDoneMessage();
      return;
    }
    let i = 0;
    clearInterval(convSyncInterval);
    convSyncInterval = setInterval(async () => {
      if (i >= nonSyncedConvIds.length) {
        clearInterval(convSyncInterval);
        chrome.storage.local.set({ isRunningConvSync: false, lastConvSyncActivity: null }, () => {
          activeTabId = null;
        });
        sendAuraSyncIsDoneMessage();
        return;
      }
      const conversationId = nonSyncedConvIds[i];
      try {
        chrome.storage.local.set({ lastConvSyncActivity: Date.now() });
        // `getAuraConversation` now calls your serverless backend
        const conversation = await getAuraConversation(conversationId);
        if (conversation) {
          if (conversation.code === 'conversation_not_found') {
            await deleteAuraConversations([conversationId]);
          } else {
            await addAuraConversations([conversation]);
            // syncAuraConversationImages will also need to call your serverless backend
            await syncAuraConversationImages(conversation);
          }
          clearCache('getConversations'); // These cache clears are still relevant
          clearCache('getConversationIds');
          clearCache('getConversation');
        }
      } catch (error) {
        console.error('Failed to sync Aura conversation', error);
      }
      i += 1;
    }, syncIntervalTime);
  });
}
// backendExtractPromptFromNode and backendExtraxtTitleFromCode are specific to ChatGPT's internal data structure.
// They are kept for completeness if you decide to replicate that structure in your serverless backend,
// but they won't interact with ChatGPT.com anymore.
function backendExtractPromptFromNode(data, nodeId) {
  const node = data[nodeId];
  if (!node || !node.message || !node.message.content || (!node.message.content.parts && !node.message.content.text)) {
    return null;
  }

  try {
    const { parts = [], text, content_type: contentType } = node.message.content;
    if (text) parts.push(text);
    for (const part of parts) {
      try {
        const parsed = JSON.parse(part);
        if (parsed.prompt || contentType === 'code') {
          return parsed.prompt;
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
  } catch (e) {
    console.error('Failed to parse content parts as JSON:', e);
    return null;
  }
  return null;
}
function backendExtraxtTitleFromCode(code) {
  let title = '';
  if (code && code.includes('title')) {
    const titleMatch = code.match(/plt\.title\(['"]([^'"]+)['"]\)/);
    if (titleMatch && titleMatch[1]) {
      title = titleMatch[1];
    }
  }
  return title;
}
async function syncAuraConversationImages(conversation) { // Renamed from syncConversationImages
  // This function now needs to be implemented to work with YOUR Aura AI serverless backend
  // for image storage and retrieval, and potentially for multimodal Gemini analysis.
  console.log('syncAuraConversationImages: Placeholder - requires serverless backend implementation for image sync, and potentially Gemini Image Generation API (Imagen) processing.');
  const allSyncImages = [];
  const mapping = conversation?.mapping;
  const messages = Object.values(mapping || {}); // Ensure mapping is not null/undefined

  for (let j = 0; j < messages.length; j += 1) {
    const { message, parent: parentNodeId } = messages[j];
    // These conditions (`dalle.text2im`, `<<ImageDisplayed>>`) are specific to previous ChatGPT-like responses.
    // You'll need to adapt this logic to how Gemini's multimodal responses (or your own image generation)
    // are structured within the conversation data you store in your backend.
    const shouldAddMessage = message?.author?.name === 'dalle.text2im' || message?.content?.text?.includes('<<ImageDisplayed>>');
    if (!shouldAddMessage) continue;

    const dalleImages = (message?.content?.parts || [])?.filter((part) => part?.content_type === 'image_asset_pointer').map((part) => ({ category: part?.metadata?.dalle || part?.metadata?.generation ? 'dalle' : 'upload', ...part })) || [];
    const chartImages = message?.metadata?.aggregate_result?.messages?.filter((msg) => msg?.message_type === 'image').map((msg) => ({ category: 'chart', ...msg })) || [];

    const allImages = [...dalleImages, ...chartImages];

    for (let k = 0; k < allImages.length; k += 1) {
      const image = allImages[k];
      const imageId = image.category === 'dalle'
        ? image?.asset_pointer?.split('://')[1]
        : image?.image_url?.split('://')[1];
      if (!imageId) continue; // Changed to continue to avoid errors if imageId is null

      const { width, height } = image;
      const prompt = image.category === 'dalle' ? image?.metadata?.dalle?.prompt : message?.metadata?.aggregate_result?.code;

      const title = image?.category === 'dalle' ? message?.metadata?.image_gen_title : backendExtraxtTitleFromCode(message?.metadata?.aggregate_result?.code);

      const promptFromParentNode = backendExtractPromptFromNode(mapping, parentNodeId);

      const genId = image?.metadata?.dalle?.gen_id || image?.metadata?.generation?.gen_id;
      const seed = image?.metadata?.dalle?.seed;
      const imageNode = {
        message_id: message?.id,
        title: title || '',
        conversation_id: conversation.conversation_id,
        image_id: imageId,
        width,
        height,
        prompt: promptFromParentNode || prompt,
        gen_id: genId,
        seed,
        category: image.category,
        is_public: false,
      };

      // `apiGetDownloadUrlFromFileId` was removed as it fetched from chatgpt.com.
      // Your serverless backend should manage image URLs or re-implement a proxy.
      // Placeholder for your image storage solution (e.g., S3, Google Cloud Storage, or a custom image server)
      imageNode.download_url = `${AURA_AI_API_URL}/images/${imageId}.png`; // Placeholder for your image storage

      if (image.creation_time) { // Use image's own creation_time if available
        imageNode.created_at = new Date(image.creation_time);
      } else {
        imageNode.created_at = new Date(formatTime(message?.create_time));
      }
      allSyncImages.push(imageNode);
    }
  }
  if (allSyncImages.length > 0) {
    await addAuraGalleryImages(allSyncImages); // Call the Aura AI specific gallery image addition
    clearCache('getGalleryImages');
    clearCache('getGalleryImagesByDateRange');
  }
}
// `apiGetDownloadUrlFromFileId` was removed as it fetched from chatgpt.com.
// Your serverless backend should manage image URLs or re-implement this.

async function getAuraConversation(conversationId) { // Renamed from apiGetConversation
  try {
    // This will now call your serverless backend endpoint for fetching conversation data.
    // Your backend is responsible for storing and retrieving this.
    const response = await fetch(`${AURA_AI_API_URL}/aura/conversation/${conversationId}`, { // Your serverless endpoint
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      if (response.status === 404) {
        return { code: 'conversation_not_found' };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to get Aura conversation from serverless backend:', error);
    chrome.storage.local.set({ lastConvSyncActivity: Date.now() }); // Keep tracking sync activity
    return { error: error.message }; // Return object with error for consistent handling
  }
}
// `apiGetConversations` was removed as it fetched directly from chatgpt.com via message.
// Your serverless backend should provide this data.

async function getAuraAccount(accessToken) { // Renamed from apiGetAccount - this will be less relevant if using your own auth
  // This function would now fetch Aura AI specific account details from your serverless backend,
  // or verify the token with your own authentication service.
  console.log("getAuraAccount: Placeholder - Aura AI account details fetched from your serverless backend.");
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/account/`, { // Example serverless endpoint for account info
      method: 'GET',
      headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching Aura AI account from serverless backend:', error);
    // Return dummy data for initial development if backend is not ready or failed
    return {
      id: "aura-user-123",
      email: "user@example.com",
      name: "Aura AI User",
      accounts: {
        "default": {
          features: [], // No payment features here unless implemented by your backend
        }
      }
    };
  }
}

function formatTime(time) {
  if (!time) return time;
  if (time.toString().indexOf('T') !== -1) {
    return new Date(time).getTime();
  }
  if (time.toString().indexOf('.') !== -1 && time.toString().split('.')[0].length === 10) {
    return new Date(time * 1000).getTime();
  }
  if (time.toString().length === 13) {
    return new Date(time).getTime();
  }
  if (time.toString().length === 10) {
    return new Date(time * 1000).getTime();
  }
  return time;
}

// Monitor sync health for Aura AI conversations
function monitorAuraSyncHealth() { // Renamed from monitorSyncHealth
  const checkInterval = 30 * 1000; // Check every 30 seconds
  const inactivityThreshold = 60 * 1000; // 1 minute

  setInterval(() => {
    chrome.storage.local.get(['isRunningConvSync', 'lastConvSyncActivity'], (result) => {
      if (!result.isRunningConvSync) return;

      const lastActivity = result.lastConvSyncActivity || 0;
      const currentTime = Date.now();
      const elapsedTime = currentTime - lastActivity;

      if (elapsedTime > inactivityThreshold) {
        console.log('Aura AI sync has been inactive for too long. Resetting state.');
        chrome.storage.local.set({ isRunningConvSync: false, lastConvSyncActivity: null });
      }
    });
  }, checkInterval);
}
monitorAuraSyncHealth();

// --- Caching Utilities ---
let spCache = {}; // Local in-memory cache, can be renamed to auraCache

const CACHE_EXPIRATION_TIME = 6 * 60 * 60 * 1000; // 6 hours
function setCache(key, value) {
  spCache[key] = {
    value,
    expiry: Date.now() + CACHE_EXPIRATION_TIME,
  };
}

function getCache(key) {
  const cachedItem = spCache[key];
  if (cachedItem && cachedItem.expiry > Date.now()) {
    return cachedItem.value;
  }
  delete spCache[key];
  return null;
}

function clearCache(targetKey) {
  Object.keys(spCache).forEach((key) => {
    if (key.includes(targetKey)) {
      delete spCache[key];
    }
  });
}

function clearCaches(targetKeys) {
  targetKeys.forEach((targetKey) => {
    clearCache(targetKey);
  });
}

function clearAllCache() {
  spCache = {};
}

async function makeCacheKey(requestType, data) {
  const hashedData = await createHash(JSON.stringify({ data }));
  return `${requestType}-${hashedData}`;
}

// Renamed and adapted conversation management functions to call Aura AI backend
async function getTotalAuraConversationsCount() { // Renamed from getTotalConversationsCount
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/get-total-conversations-count/`, {
      method: 'GET', headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); return await response.json();
  } catch (error) { console.error('Error getting total Aura conversations count:', error); return { count: 0, error: error.message }; }
}
async function getTotalAuraArchivedConversationsCount() { // Renamed from getTotalArchivedConversationsCount
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/get-total-archived-conversations-count/`, {
      method: 'GET', headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); return await response.json();
  } catch (error) { console.error('Error getting total archived Aura conversations count:', error); return { count: 0, error: error.message }; }
}
async function getAllFavoriteAuraConversationIds() { // Renamed from getAllFavoriteConversationIds
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/get-all-favorite-conversation-ids/`, {
      method: 'GET', headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); return await response.json();
  } catch (error) { console.error('Error getting all favorite Aura conversation IDs:', error); return { results: [], error: error.message }; }
}
async function getAllFolderAuraConversationIds(folderId) { // Renamed from getAllFolderConversationIds
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/get-all-folder-conversation-ids/?folder_id=${folderId}`, {
      method: 'GET', headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); return await response.json();
  } catch (error) { console.error('Error getting all folder Aura conversation IDs:', error); return { results: [], error: error.message }; }
}
async function getAllNoteAuraConversationIds() { // Renamed from getAllNoteConversationIds
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/get-all-note-conversation-ids/`, {
      method: 'GET', headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); return await response.json();
  } catch (error) { console.error('Error getting all note Aura conversation IDs:', error); return { results: [], error: error.message }; }
}
async function getRandomAuraConversationId() { // Renamed from getRandomConversationId
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/get-random-conversation-id/`, {
      method: 'GET', headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); return await response.json();
  } catch (error) { console.error('Error getting random Aura conversation ID:', error); return { success: false, error: error.message }; }
}
async function addAuraConversations(conversations) { // Renamed from addConversations
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/add-conversations/`, {
      method: 'POST', headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ conversations }), signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); return await response.json();
  } catch (error) { console.error('Error adding Aura conversations:', error); return { success: false, error: error.message }; }
}
async function addAuraConversation(conversation) { // Renamed from addConversation
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/add-conversation/`, {
      method: 'POST', headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ conversation }), signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); return await response.json();
  } catch (error) { console.error('Error adding Aura conversation:', error); return { success: false, error: error.message }; }
}
async function renameAuraConversation(conversationId, title) { // Renamed from renameConversation
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/rename-conversation/`, {
      method: 'POST', headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ conversation_id: conversationId, title }), signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); return await response.json();
  } catch (error) { console.error('Error renaming Aura conversation:', error); return { success: false, error: error.message }; }
}
async function toggleAuraConversationFavorite(conversation) { // Renamed from toggleConversationFavorite
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/toggle-conversation-favorite/`, {
      method: 'POST', headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ conversation }), signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); return await response.json();
  } catch (error) { console.error('Error toggling Aura conversation favorite:', error); return { success: false, error: error.message }; }
}
async function updateAuraConversationTool(conversationId, toolId) { // Renamed from updateConversationProject (gizmoId to toolId)
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/update-conversation-tool/`, { // New endpoint
      method: 'POST', headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ conversation_id: conversationId, tool_id: toolId }), signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); return await response.json();
  } catch (error) { console.error('Error updating Aura conversation tool:', error); return { success: false, error: error.message }; }
}
async function resetAllFavoriteAuraConversations() { // Renamed from resetAllFavoriteConversations
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/reset-all-favorite-conversations/`, {
      method: 'POST', headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); return await response.json();
  } catch (error) { console.error('Error resetting all favorite Aura conversations:', error); return { success: false, error: error.message }; }
}
async function deleteAuraConversations(conversationIds) { // Renamed from deleteConversations
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/delete-conversations/`, {
      method: 'POST', headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ conversation_ids: conversationIds }), signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); return await response.json();
  } catch (error) { console.error('Error deleting Aura conversations:', error); return { success: false, error: error.message }; }
}
async function deleteAllAuraConversations() { // Renamed from deleteAllConversations
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/delete-all-conversations/`, {
      method: 'POST', headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); return await response.json();
  } catch (error) { console.error('Error deleting all Aura conversations:', error); return { success: false, error: error.message }; }
}
async function deleteAllArchivedAuraConversations() { // Renamed from deleteAllArchivedConversations
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/delete-all-archived-conversations/`, {
      method: 'POST', headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); return await response.json();
  } catch (error) { console.error('Error deleting all archived Aura conversations:', error); return { success: false, error: error.message }; }
}
async function archiveAuraConversations(conversationIds) { // Renamed from archiveConversations
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/archive-conversations/`, {
      method: 'POST', headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ conversation_ids: conversationIds }), signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); return await response.json();
  } catch (error) { console.error('Error archiving Aura conversations:', error); return { success: false, error: error.message }; }
}
async function unarchiveAuraConversations(conversationIds) { // Renamed from unarchiveConversations
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/unarchive-conversations/`, {
      method: 'POST', headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ conversation_ids: conversationIds }), signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); return await response.json();
  } catch (error) { console.error('Error unarchiving Aura conversations:', error); return { success: false, error: error.message }; }
}
async function archiveAllAuraConversations() { // Renamed from archiveAllConversations
  try {
    const response = await fetch(`${AURA_AI_API_URL}/aura/archive-all-conversations/`, {
      method: 'POST', headers: { ...defaultAuraAIHeaders, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`); return await response.json();
  } catch (error) { console.error('Error archiving all Aura conversations:', error); return { success: false, error: error.message }; }
}