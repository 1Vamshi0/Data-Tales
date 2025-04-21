// DOM Elements
const uploadArea = document.querySelector('.upload-area');
const uploadBrowseBtn = document.querySelector('.upload-browse-btn');
const fileInput = document.querySelector('#file-upload');
const uploadTitle = document.querySelector('.upload-title');
const uploadDescription = document.querySelector('.upload-description');
const contentArea = document.querySelector('.content-area'); // Assuming this exists for messages/popups

// Files state
let uploadedFiles = []; // Holds { file: File, options: { sheetName?, startRow? } }

// --- Popup Helper Functions (Add these or ensure they are available) ---
function createPopup(title, content, buttons = []) {
    // Close any existing popups first
    closePopup();

    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay upload-popup-overlay'; // Add specific class

    const popup = document.createElement('div');
    popup.className = 'popup-content';

    const header = document.createElement('div');
    header.className = 'popup-header';

    const titleElement = document.createElement('div');
    titleElement.className = 'popup-title';
    titleElement.textContent = title;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'popup-close';
    closeBtn.innerHTML = '×';
    closeBtn.onclick = closePopup; // Use onclick for simplicity here

    header.appendChild(titleElement);
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'popup-body';
    body.innerHTML = content; // Assumes safe HTML content

    const footer = document.createElement('div');
    footer.className = 'popup-footer';

    buttons.forEach(btn => {
        const button = document.createElement('button');
        // Use classList for better class management
        button.classList.add('popup-btn');
        button.classList.add(btn.primary ? 'popup-btn-primary' : 'popup-btn-secondary');
        button.textContent = btn.text;
        button.onclick = () => { // Use onclick for simplicity
            btn.action();
            // Optionally close popup here if action doesn't
            // closePopup();
        };
        footer.appendChild(button);
    });

    popup.appendChild(header);
    popup.appendChild(body);
    popup.appendChild(footer);
    overlay.appendChild(popup);

    document.body.appendChild(overlay);

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            closePopup();
        }
    });

    return overlay; // Return the overlay element
}

function closePopup() {
    const existingPopup = document.querySelector('.upload-popup-overlay');
    if (existingPopup) {
        document.body.removeChild(existingPopup);
    }
}

// --- NEW Function to Get Excel Options ---
function getUserExcelOptions(sheetNames, file) {
    return new Promise((resolve, reject) => {
        let sheetSelectorHTML = '';
        // Only show sheet selector if there are multiple sheets
        if (sheetNames && sheetNames.length > 1) {
            const sheetOptions = sheetNames.map((name, index) =>
                `<option value="${name}" ${index === 0 ? 'selected' : ''}>${name}</option>`
            ).join('');
            sheetSelectorHTML = `
                <div class="form-group">
                    <label for="sheetName">Select Sheet:</label>
                    <select id="sheetName" name="sheetName" class="form-control" required>
                        ${sheetOptions}
                    </select>
                </div>
            `;
        } else if (sheetNames && sheetNames.length === 1) {
            // If only one sheet, we still need to pass its name later
             sheetSelectorHTML = `<input type="hidden" id="sheetName" name="sheetName" value="${sheetNames[0]}">`;
        } else {
             // Handle case with no sheets found (should have been caught earlier, but defensively)
             reject(new Error("No sheets found in the file."));
             return;
        }


        const formHTML = `
            <p>Please specify options for the Excel file: <strong>${file.name}</strong></p>
            <form id="excel-options-form">
                ${sheetSelectorHTML}
                <div class="form-group">
                    <label for="startRow">Header Row Number:</label>
                    <input type="number" id="startRow" name="startRow" class="form-control" value="1" min="1" required>
                    <small class="form-text text-muted">Enter the row number where your table headers start (e.g., 1).</small>
                </div>
            </form>
        `;

        createPopup('Excel File Options', formHTML, [
            {
                text: 'Cancel',
                primary: false,
                action: () => {
                    closePopup();
                    reject(new Error('User cancelled Excel options selection.'));
                }
            },
            {
                text: 'Confirm',
                primary: true,
                action: () => {
                    const form = document.getElementById('excel-options-form');
                    const selectedSheetInput = form.querySelector('[name="sheetName"]'); // Can be select or hidden input
                    const startRowInput = form.querySelector('[name="startRow"]');

                    if (!selectedSheetInput || !startRowInput || !startRowInput.value) {
                         alert("Please ensure all options are selected/filled.");
                         return; // Don't close popup or reject yet
                    }

                    const selectedSheetName = selectedSheetInput.value;
                    const startRow = parseInt(startRowInput.value, 10);

                    if (isNaN(startRow) || startRow < 1) {
                        alert('Please enter a valid starting row number (1 or greater).');
                        return; // Don't close popup or reject yet
                    }

                    console.log(`User selected Sheet: ${selectedSheetName}, Start Row: ${startRow}`);
                    closePopup();
                    resolve({ sheetName: selectedSheetName, startRow: startRow });
                }
            }
        ]);
    });
}


// Add event listeners
uploadBrowseBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', handleFileSelect);
uploadArea.addEventListener('dragover', handleDragOver);
uploadArea.addEventListener('dragleave', handleDragLeave);
uploadArea.addEventListener('drop', handleFileDrop);

// Handle file selection from browse button
function handleFileSelect(e) {
    const files = e.target.files;
    processFiles(files);
    // Reset file input to allow uploading the same file again
    fileInput.value = '';
}

// Handle drag over effects
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.add('drag-over');
}

// Handle drag leave effects
function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.remove('drag-over');
}

// Handle file drop
function handleFileDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    uploadArea.classList.remove('drag-over');

    const files = e.dataTransfer.files;
    processFiles(files);
}

// --- MODIFIED processFiles function ---
async function processFiles(files) { // Make async
    if (files.length === 0) return;

    let newFiles = [];
    let filesWithOptions = []; // Store files with their options

    // Filter for supported file types and handle Excel options
    for (const file of files) {
        const extension = file.name.split('.').pop().toLowerCase();
        if (!['csv', 'xlsx', 'xls'].includes(extension)) {
            continue; // Skip unsupported files silently or show message
        }

        if (['xlsx', 'xls'].includes(extension)) {
            try {
                // --- Get sheet names without full parsing ---
                const arrayBuffer = await file.arrayBuffer(); // Read file content once
                // Read only sheet names first
                const workbook = XLSX.read(arrayBuffer, { type: 'array', bookSheets: true });

                if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                    showErrorMessage(`File "${file.name}" contains no sheets.`);
                    continue; // Skip this file
                }
                const sheetNames = workbook.SheetNames;

                // --- Prompt user for options ---
                // Pass sheet names and the file object to the popup function
                const options = await getUserExcelOptions(sheetNames, file);

                // Store the file and the selected options
                 filesWithOptions.push({ file: file, options: options, arrayBuffer: arrayBuffer /* Pass buffer to avoid re-reading */ });
                 newFiles.push(file); // Add to the list for UI update

            } catch (error) {
                // Handle errors during sheet name reading or user cancellation
                showErrorMessage(`Failed to process Excel file "${file.name}": ${error.message}`);
                // Continue to next file if user cancels or error occurs
            }
        } else { // CSV files don't need options
            filesWithOptions.push({ file: file, options: null, arrayBuffer: null });
             newFiles.push(file); // Add to the list for UI update
        }
    }


    if (newFiles.length === 0 && files.length > 0) {
        showErrorMessage("No valid files selected or processed. Please upload CSV or Excel files.");
        return;
    }

    // Add successfully processed files (including those pending options) to state
    // Replace existing or append? Let's append for now.
    uploadedFiles = [...uploadedFiles, ...filesWithOptions];

    // Update UI to show files (using the 'file' property)
    displayUploadedFiles(uploadedFiles.map(f => f.file));

    // Show success message
    if (newFiles.length > 0) {
        showSuccessMessage(`${newFiles.length} file(s) added successfully!`);
    }

    // Enable continue button if any files are ready
    if (uploadedFiles.length > 0) {
        showContinueButton();
    }
}

// Display uploaded files in the UI (no changes needed here)
function displayUploadedFiles(files) {
    // Clear the upload area
    uploadArea.innerHTML = '';

    // Create file list container
    const fileListContainer = document.createElement('div');
    fileListContainer.className = 'file-list-container';

    // Create header
    const header = document.createElement('h3');
    header.className = 'upload-title';
    header.textContent = 'Uploaded Files';
    fileListContainer.appendChild(header);

    // Create file list
    const fileList = document.createElement('ul');
    fileList.className = 'file-list';

    files.forEach((file, index) => {
        const listItem = document.createElement('li');
        listItem.className = 'file-item';

        // File icon based on type
        const fileIcon = document.createElement('span');
        fileIcon.className = 'file-icon';
        fileIcon.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
        `;

        // File name
        const fileName = document.createElement('span');
        fileName.className = 'file-name';
        fileName.textContent = file.name;

        // File size
        const fileSize = document.createElement('span');
        fileSize.className = 'file-size';
        fileSize.textContent = formatFileSize(file.size);

        // Remove button - Use the index in the ORIGINAL uploadedFiles array
        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove-file-btn';
        removeBtn.innerHTML = '&times;';
        // Find the actual index in uploadedFiles, as 'files' might be filtered/modified
        const actualIndex = uploadedFiles.findIndex(f => f.file === file);
        if(actualIndex !== -1) {
            removeBtn.addEventListener('click', () => removeFile(actualIndex));
        } else {
             removeBtn.disabled = true; // Should not happen ideally
        }


        // Append elements to list item
        listItem.appendChild(fileIcon);
        listItem.appendChild(fileName);
        listItem.appendChild(fileSize);
        listItem.appendChild(removeBtn);

        // Append list item to list
        fileList.appendChild(listItem);
    });

    fileListContainer.appendChild(fileList);

    // Add option to upload more files
    const uploadMoreBtn = document.createElement('button');
    uploadMoreBtn.className = 'upload-more-btn';
    uploadMoreBtn.textContent = 'Upload More Files';
    uploadMoreBtn.addEventListener('click', () => fileInput.click());

    fileListContainer.appendChild(uploadMoreBtn);

    // Append file list container to upload area
    uploadArea.appendChild(fileListContainer);
}


// Remove a file from the list
function removeFile(index) {
    uploadedFiles.splice(index, 1); // Remove from the main state array

    if (uploadedFiles.length === 0) {
        // Reset the upload area if no files remain
        resetUploadArea();
         hideContinueButton(); // Hide continue button as well
    } else {
        // Update the display using the remaining files
        displayUploadedFiles(uploadedFiles.map(f => f.file));
    }

    // Update continue button visibility
    if (uploadedFiles.length > 0) {
        showContinueButton();
    } else {
        hideContinueButton(); // Ensure it's hidden if last file removed
    }
}


// Reset upload area to initial state (no changes needed)
function resetUploadArea() {
    uploadArea.innerHTML = `
        <div class="upload-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
        </div>
        <h3 class="upload-title">Upload Your Dataset</h3>
        <p class="upload-description">Drag and drop files here or click to browse</p>
        <p class="upload-formats">Supported formats: CSV, Excel</p>
        <button class="upload-browse-btn">Browse Files</button>
    `;

    // Re-add event listeners for the new browse button
    document.querySelector('.upload-browse-btn').addEventListener('click', () => {
        fileInput.click();
    });
    // Drag/drop listeners are on uploadArea, which persists or is handled by reset
}


// Format file size to human-readable format (no changes needed)
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Show success message (no changes needed)
function showSuccessMessage(message) {
    // Ensure only one message shows at a time
    const existingMessage = contentArea.querySelector('.message');
    if (existingMessage) existingMessage.remove();

    const messageElement = document.createElement('div');
    messageElement.className = 'message success-message';
    messageElement.textContent = message;

    contentArea.appendChild(messageElement);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        // Check if the element still exists before removing
        if (messageElement.parentNode === contentArea) {
            messageElement.remove();
        }
    }, 3000);
}


// Show error message (no changes needed)
function showErrorMessage(message) {
    // Ensure only one message shows at a time
    const existingMessage = contentArea.querySelector('.message');
    if (existingMessage) existingMessage.remove();

    const messageElement = document.createElement('div');
    messageElement.className = 'message error-message';
    messageElement.textContent = message;

    contentArea.appendChild(messageElement);

    // Auto-remove after 5 seconds for errors
    setTimeout(() => {
         // Check if the element still exists before removing
        if (messageElement.parentNode === contentArea) {
            messageElement.remove();
        }
    }, 5000);
}


// Show continue button (no changes needed)
function showContinueButton() {
    let continueBtn = document.querySelector('.continue-btn');

    if (!continueBtn) {
        continueBtn = document.createElement('button');
        continueBtn.className = 'continue-btn';
        continueBtn.textContent = 'Continue to Data Viewing';
        continueBtn.addEventListener('click', proceedToDataViewing);

        // Append relative to content area might be better
        contentArea.appendChild(continueBtn);
        // Or append after the upload area if preferred
        // uploadArea.parentNode.insertBefore(continueBtn, uploadArea.nextSibling);
    }
     continueBtn.disabled = false; // Ensure it's enabled
}

// Hide continue button (no changes needed)
function hideContinueButton() {
    const continueBtn = document.querySelector('.continue-btn');
    if (continueBtn) {
        continueBtn.remove();
    }
}

// --- MODIFIED proceedToDataViewing function ---
async function proceedToDataViewing() {
    // Disable button to prevent multiple clicks
    const continueBtn = document.querySelector('.continue-btn');
    if(continueBtn) continueBtn.disabled = true;

    showSuccessMessage("Processing files..."); // Indicate processing

    try {
        // Parse files (now potentially async due to Excel options)
        const parsedData = await parseFiles(uploadedFiles); // Pass the array with file and options

        if(parsedData.length === 0 && uploadedFiles.length > 0) {
             throw new Error("No files could be parsed successfully.");
        }
        if(parsedData.length < uploadedFiles.length) {
            showErrorMessage("Some files could not be parsed and were skipped.");
        }

        // Store successfully parsed data in session storage
        sessionStorage.setItem('dataFiles', JSON.stringify(parsedData));

        // Redirect to data viewing page
        window.location.href = 'data_viewing.html';

    } catch (error) {
        showErrorMessage(`Error processing files: ${error.message}`);
        // Re-enable button on failure
         if(continueBtn) continueBtn.disabled = false;
    }
}

// --- MODIFIED parseFiles function ---
async function parseFiles(filesWithOptions) { // Expects array of { file, options, arrayBuffer }
    const result = [];

    for (const fileData of filesWithOptions) {
        const { file, options, arrayBuffer } = fileData; // Destructure
        const extension = file.name.split('.').pop().toLowerCase();
        let parsedFileData;

        try {
            if (extension === 'csv') {
                parsedFileData = await parseCSV(file); // CSV parsing remains the same
            } else if (['xlsx', 'xls'].includes(extension)) {
                // Pass options (sheetName, startRow) and the pre-read arrayBuffer
                parsedFileData = await parseExcel(file, options, arrayBuffer);
            }

            // Only add successfully parsed files
            if (parsedFileData) {
                 result.push({
                    name: file.name,
                    type: extension,
                    data: parsedFileData // Should be { headers: [], rows: [] }
                 });
            }

        } catch (error) {
             console.error(`Skipping file "${file.name}" due to parsing error:`, error);
             // Optionally show a specific message per file, but might be too noisy
        }
    }
    return result; // Return array of successfully parsed data objects
}


// Parse CSV file (no changes needed)
function parseCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function(e) {
            try {
                const content = e.target.result;
                // Basic check for empty content
                if (!content || content.trim().length === 0) {
                    console.warn(`CSV file "${file.name}" is empty.`);
                    resolve({ headers: [], rows: [] }); // Resolve with empty data
                    return;
                }
                const lines = content.split(/[\r\n]+/).filter(line => line.trim() !== ''); // More robust line splitting

                if (lines.length === 0) {
                     console.warn(`CSV file "${file.name}" contains no data rows after trimming.`);
                     resolve({ headers: [], rows: [] });
                     return;
                }

                // Determine delimiter (simple check for comma vs semicolon)
                const delimiter = lines[0].includes(';') ? ';' : ',';

                const headers = lines[0].split(delimiter).map(header => header.trim());

                const data = [];
                for (let i = 1; i < lines.length; i++) {
                    // Basic CSV parsing - does not handle quotes or escaped delimiters robustly
                    const values = lines[i].split(delimiter).map(value => value.trim());
                    const row = {};

                    headers.forEach((header, index) => {
                        row[header] = values[index] || ''; // Use empty string if value is missing
                    });

                    data.push(row);
                }

                resolve({
                    headers,
                    rows: data
                });
            } catch (error) {
                 console.error(`Error parsing CSV file "${file.name}":`, error);
                 reject(error);
            }
        };

        reader.onerror = function(error) {
            console.error(`FileReader error for "${file.name}":`, error);
            reject(new Error(`Error reading file "${file.name}"`));
        };

        reader.readAsText(file);
    });
}

// --- MODIFIED parseExcel function ---
// Now accepts options (sheetName, startRow) and optionally the pre-read arrayBuffer
async function parseExcel(file, options, arrayBuffer = null) {
    // Ensure options are provided (should be guaranteed by processFiles)
    if (!options || !options.sheetName || options.startRow === undefined) {
        // This indicates a logic error earlier if it happens
        throw new Error(`Missing required options (sheetName, startRow) for parsing Excel file "${file.name}".`);
    }

    const { sheetName, startRow } = options;

    return new Promise(async (resolve, reject) => { // Make inner promise async if needed
        try {
            // Read the file content if not already provided
            const data = arrayBuffer || await file.arrayBuffer();

            // Use {type: 'binary'} for older XLS formats if 'array' fails.
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });

            // Check if the requested sheet exists
            if (!workbook.SheetNames.includes(sheetName)) {
                 reject(new Error(`Sheet "${sheetName}" not found in file "${file.name}". Available sheets: ${workbook.SheetNames.join(', ')}`));
                 return;
            }

            const worksheet = workbook.Sheets[sheetName];
            // Convert sheet to JSON array of arrays. defval:'' ensures empty cells become empty strings.
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval:'', blankrows: false /* Skip blank rows */ });

             // Check if the specified start row is valid
             if (startRow < 1 || startRow > jsonData.length) {
                  reject(new Error(`Invalid Header Row number (${startRow}). It must be between 1 and ${jsonData.length} for sheet "${sheetName}".`));
                  return;
             }

            // Extract headers from the specified start row (adjusting for 0-based index)
            const headerRowIndex = startRow - 1;
            const headers = jsonData[headerRowIndex].map(header => header === null || header === undefined ? '' : String(header).trim());

            const rows = [];
            // Start processing data rows *after* the specified header row
            for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
                const rowData = jsonData[i];
                 // Skip entirely empty rows more reliably (already handled by blankrows:false potentially)
                 // if (rowData.every(cell => cell === null || cell === '')) continue;

                const row = {};
                headers.forEach((header, index) => {
                    const cellValue = rowData[index];
                     if (cellValue instanceof Date) {
                        try {
                           // Attempt ISO string format; handle potential invalid dates from SheetJS
                           row[header] = cellValue.toISOString().split('T')[0];
                        } catch (dateError) {
                           console.warn(`Invalid date encountered in cell ${index + 1}, row ${i + 1}:`, cellValue);
                           row[header] = ''; // Or some placeholder for invalid dates
                        }
                    } else {
                        row[header] = cellValue === null || cellValue === undefined ? '' : cellValue;
                    }
                });
                rows.push(row);
            }

            resolve({
                headers,
                rows
            });
        } catch (error) {
            console.error(`Error parsing Excel file "${file.name}", sheet "${sheetName}":`, error);
            reject(new Error(`Failed to parse Excel file "${file.name}": ${error.message || error}`));
        }
    });
}