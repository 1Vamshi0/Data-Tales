// DOM Elements
const uploadArea = document.querySelector('.upload-area');
const uploadBrowseBtn = document.querySelector('.upload-browse-btn');
const fileInput = document.querySelector('#file-upload');
const uploadInitialPrompt = document.querySelector('.upload-initial-prompt');
const uploadStatusArea = document.querySelector('.upload-status-area');
const fileListContainer = document.querySelector('.file-list-container');
const continueButtonContainer = document.querySelector('.continue-button-container');
const continueBtn = document.querySelector('.continue-btn');
const contentArea = document.querySelector('.content-area'); // Assuming this exists for messages

// API Endpoint
const API_URL = 'http://localhost:5000'; // Ensure this matches your Flask server

// Files state & Upload Controller
let uploadedFileDetails = null; // Stores { name, type, columns, rows, headers } after successful upload
let currentUploadController = null; // To allow cancelling uploads

// --- Event Listeners ---
uploadBrowseBtn?.addEventListener('click', () => fileInput.click());
fileInput?.addEventListener('change', handleFileSelect);
uploadArea?.addEventListener('dragover', handleDragOver);
uploadArea?.addEventListener('dragleave', handleDragLeave);
uploadArea?.addEventListener('drop', handleFileDrop);
continueBtn?.addEventListener('click', proceedToDataViewing);

// --- File Handling ---
function handleFileSelect(e) {
    const files = e.target.files;
    if (files.length > 0) {
        // Allow only one file upload at a time with this new structure
        processFile(files[0]); 
    }
    // Reset file input to allow uploading the same file again
    fileInput.value = '';
}

function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadArea?.classList.add('drag-over');
}

function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadArea?.classList.remove('drag-over');
}

function handleFileDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadArea?.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
         // Allow only one file upload at a time
        processFile(files[0]);
    }
}

// --- NEW: Process and Upload Single File ---
async function processFile(file) {
    const extension = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(extension)) {
        showErrorMessage("Unsupported file format. Please upload CSV or Excel files.");
        return;
    }

    // Reset state for new upload
    uploadedFileDetails = null;
    hideContinueButton();
    resetUploadUI(); // Show initial prompt
    updateUploadProgress(0, `Uploading ${file.name}...`);
    showUploadStatus(); // Show progress bar area

    const formData = new FormData();
    formData.append('file', file); // Key 'file' must match Flask request.files['file']

    // Abort previous upload if any
    if (currentUploadController) {
        currentUploadController.abort();
    }
    currentUploadController = new AbortController();
    const signal = currentUploadController.signal;

    // Show cancel button
    const cancelBtn = uploadStatusArea.querySelector('.cancel-upload-btn');
    if (cancelBtn) {
        cancelBtn.style.display = 'inline-block';
        cancelBtn.onclick = () => {
            if (currentUploadController) currentUploadController.abort();
            updateUploadProgress(0, 'Upload cancelled.');
            setTimeout(resetUploadUI, 2000); // Reset UI after a delay
        };
    }


    try {
        const response = await fetch(`${API_URL}/upload_file`, {
            method: 'POST',
            body: formData,
            signal: signal, // Pass the abort signal
            // Simulate progress (real progress requires server support or XHR)
            // For now, we'll just update based on upload start/end/error
        });

        // Upload finished (successfully or not), hide cancel button
         if (cancelBtn) cancelBtn.style.display = 'none';


        if (signal.aborted) {
             console.log('Upload aborted by user.');
             return; // Stop processing if aborted
        }

        const result = await response.json();

        if (!response.ok) {
             // Use error message from server response if available
            throw new Error(result.error || `Server error: ${response.status}`);
        }

        // --- Success ---
        console.log('Upload successful:', result);
        updateUploadProgress(100, `Successfully processed ${file.name}.`);

        // Store minimal info needed for subsequent pages
        uploadedFileDetails = result.fileInfo; // Store the info returned by the server

         // Save the *minimal* info needed for the next step (filename, type, headers, row/col count)
         // The actual data will be fetched by the viewing/cleaning page from the server state
         sessionStorage.setItem('currentFileBaseInfo', JSON.stringify({
             name: uploadedFileDetails.name,
             type: uploadedFileDetails.type,
             headers: uploadedFileDetails.headers, // Store headers
             rows: uploadedFileDetails.rows,
             columns: uploadedFileDetails.columns
         }));

        displayUploadedFileInfo(uploadedFileDetails); // Show file info in the list area
        showContinueButton(); // Enable navigation

    } catch (error) {
        if (error.name === 'AbortError') {
            console.log('Fetch aborted.');
            updateUploadProgress(0, 'Upload cancelled.');
             setTimeout(resetUploadUI, 2000);
        } else {
            console.error('Upload failed:', error);
            updateUploadProgress(0, `Error: ${error.message}`);
            showErrorMessage(`Upload failed: ${error.message}`);
             setTimeout(resetUploadUI, 3000); // Reset UI after error
        }
        uploadedFileDetails = null; // Ensure state is clear on error
        hideContinueButton();

    } finally {
         currentUploadController = null; // Clear controller
         // Optional: Hide progress bar after a delay on success/error
         // setTimeout(() => {
         //     if (!currentUploadController) { // Only hide if no new upload started
         //         hideUploadStatus();
         //      }
         // }, 3000);
    }
}

// --- UI Update Functions ---

function showUploadStatus() {
    if (uploadInitialPrompt) uploadInitialPrompt.style.display = 'none';
    if (fileListContainer) fileListContainer.style.display = 'none';
    if (uploadStatusArea) uploadStatusArea.style.display = 'flex'; // Use flex for centering
}

function hideUploadStatus() {
     if (uploadStatusArea) uploadStatusArea.style.display = 'none';
}

function updateUploadProgress(percentage, message) {
    if (!uploadStatusArea) return;
    const progressBar = uploadStatusArea.querySelector('.progress-bar');
    const statusMessage = uploadStatusArea.querySelector('.upload-status-message');

    if (progressBar) {
        percentage = Math.max(0, Math.min(100, percentage)); // Clamp 0-100
        progressBar.style.width = `${percentage}%`;
        progressBar.textContent = `${Math.round(percentage)}%`;
    }
    if (statusMessage) {
        statusMessage.textContent = message;
    }
}


// --- Display Uploaded File Info (Replaces displayUploadedFiles) ---
function displayUploadedFileInfo(fileInfo) {
    if (!fileListContainer) return;

    // Hide initial prompt and progress bar
    if (uploadInitialPrompt) uploadInitialPrompt.style.display = 'none';
    if (uploadStatusArea) uploadStatusArea.style.display = 'none';

    fileListContainer.innerHTML = ''; // Clear previous list
    fileListContainer.style.display = 'block'; // Show the container

    // Create header
    const header = document.createElement('h3');
    header.className = 'upload-title';
    header.textContent = 'Uploaded File';
    fileListContainer.appendChild(header);

    // Create file list (ul)
    const fileList = document.createElement('ul');
    fileList.className = 'file-list';

    // Create list item for the single file
    const listItem = document.createElement('li');
    listItem.className = 'file-item';

    // File icon
    const fileIcon = document.createElement('span');
    fileIcon.className = 'file-icon';
    fileIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
            <polyline points="10 9 9 9 8 9"></polyline>
        </svg>`;

    // File name
    const fileName = document.createElement('span');
    fileName.className = 'file-name';
    fileName.textContent = fileInfo.name;

    // File info (rows/columns) - Size isn't relevant anymore as it's processed
    const fileDetails = document.createElement('span');
    fileDetails.className = 'file-size'; // Re-use class for styling
    fileDetails.textContent = `${fileInfo.rows} rows, ${fileInfo.columns} columns`;

    // Remove button (or replace action)
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-file-btn';
    removeBtn.innerHTML = '&times;';
    removeBtn.title = 'Remove file and upload another';
    removeBtn.addEventListener('click', resetForNewUpload);

    // Append elements
    listItem.appendChild(fileIcon);
    listItem.appendChild(fileName);
    listItem.appendChild(fileDetails);
    listItem.appendChild(removeBtn);
    fileList.appendChild(listItem);
    fileListContainer.appendChild(fileList);
}

function resetForNewUpload() {
     uploadedFileDetails = null;
     hideContinueButton();
     resetUploadUI();
     // Clear session storage related to the file
     sessionStorage.removeItem('currentFileBaseInfo');
}

// --- Reset Upload Area ---
function resetUploadUI() {
    if (uploadInitialPrompt) uploadInitialPrompt.style.display = 'block';
    if (uploadStatusArea) uploadStatusArea.style.display = 'none';
    if (fileListContainer) fileListContainer.style.display = 'none';
    updateUploadProgress(0, ''); // Clear progress bar
}


// --- Navigation & Messages ---

function showContinueButton() {
    if (continueBtn) {
        continueBtn.style.display = 'inline-block';
        continueBtn.disabled = false;
    }
     if (continueButtonContainer) {
         continueButtonContainer.style.display = 'block';
     }
}

function hideContinueButton() {
    if (continueBtn) {
        continueBtn.style.display = 'none';
        continueBtn.disabled = true;
    }
     if (continueButtonContainer) {
         continueButtonContainer.style.display = 'none';
     }
}


function proceedToDataViewing() {
     if (!uploadedFileDetails) {
         showErrorMessage("No file has been successfully uploaded and processed yet.");
         return;
     }
     // No need to pass data here anymore, the viewing page will fetch it
     console.log("Proceeding to Data Viewing page...");
     window.location.href = 'data_viewing.html';
}


// --- Message Display Functions ---
function showSuccessMessage(message) {
    displayMessage(message, 'success');
}

function showErrorMessage(message) {
    displayMessage(message, 'error');
}

function displayMessage(message, type = 'info') {
    // Remove existing messages first
    const existingMessages = document.querySelectorAll('.message.dynamic-message');
    existingMessages.forEach(msg => msg.remove());

    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}-message dynamic-message`; // Added dynamic-message class
    messageElement.textContent = message;

    // Append to content area or body
    const targetArea = contentArea || document.body;
    targetArea.appendChild(messageElement);

    // Auto-remove after a delay
    const delay = type === 'error' ? 5000 : 3000;
    setTimeout(() => {
        // Check if the element still exists before removing
         if (messageElement.parentNode === targetArea) {
             targetArea.removeChild(messageElement);
         }
    }, delay);
}

// --- Popup Helper Functions (Keep or remove if no longer needed) ---
// These were used for Excel options, which are removed in this version.
// You can keep them if you plan to add other popups later.

/*
function createPopup(title, content, buttons = []) {
    closePopup(); // Close existing popups

    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay upload-popup-overlay';

    const popup = document.createElement('div');
    popup.className = 'popup-content';
    // ... (rest of the popup creation logic - same as before) ...
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closePopup();
    });
    return overlay;
}

function closePopup() {
    const existingPopup = document.querySelector('.upload-popup-overlay');
    if (existingPopup) document.body.removeChild(existingPopup);
}
*/

// Remove formatFileSize as file size isn't displayed directly anymore
// Remove getUserExcelOptions as options are handled server-side (or assumed)
// Remove parseFiles, parseCSV, parseExcel as parsing is server-side