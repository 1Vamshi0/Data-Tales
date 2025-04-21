// Data state (Modified)
let currentFileData = null; // Stores data for the single loaded file { name, type, data: { headers, rows } }
let currentPage = 1;
let rowsPerPage = 10;

// API endpoint
const API_URL = 'http://localhost:5000'; // Ensure this matches your Flask server address

// DOM elements (Removed fileSelect)
const dataTable = document.getElementById('data-table');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageInfo = document.getElementById('page-info');
const continueBtn = document.getElementById('continue-to-visualization');
const panelHeaderFileName = document.querySelector('.data-view-panel .panel-header h2'); // To display filename

// Cleaning operation buttons
const removeDuplicatesBtn = document.getElementById('remove-duplicates');
const handleMissingBtn = document.getElementById('handle-missing');
const convertTypesBtn = document.getElementById('convert-types');
const cleanTextBtn = document.getElementById('clean-text');
const normalizeDataBtn = document.getElementById('normalize-data');
const standardizeDataBtn = document.getElementById('standardize-data');
const resetChangesBtn = document.getElementById('reset-changes');
const detectOutliersBtn = document.getElementById('detect-outliers');
const handleOutliersBtn = document.getElementById('handle-outliers');
const addDerivedColumnBtn = document.getElementById('add-derived-column');
const handleInconsistentDataBtn = document.getElementById('handle-inconsistent');

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    loadDataFromServer(); // Call the new load function
    setupEventListeners();
});

// NEW: Load data from the server
async function loadDataFromServer() {
    console.log("Attempting to load data from server for cleaning...");
    try {
        const response = await fetch(`${API_URL}/get_data`);

        if (!response.ok) {
            let errorMsg = 'Failed to load data from server.';
            if (response.status === 404) {
                 console.warn('No data found on server (/get_data returned 404).');
                 errorMsg = 'No data loaded. Please <a href="upload.html">upload a file</a> first.';
            } else {
                 const errorData = await response.json().catch(() => ({ error: `Server error ${response.status}` }));
                 errorMsg = `Error loading data: ${errorData.error || response.statusText}. Please try <a href="upload.html">uploading again</a>.`;
            }
             throw new Error(errorMsg);
        }

        currentFileData = await response.json();

        if (!currentFileData || !currentFileData.data || !Array.isArray(currentFileData.data.headers) || !Array.isArray(currentFileData.data.rows)) {
            throw new Error("Invalid data structure received from server.");
        }

        console.log(`Data loaded from server for: ${currentFileData.name}`);
        currentPage = 1; // Reset page
        displayFileData(); // Display fetched data
        enableCleaningButtons(); // Ensure buttons are enabled

    } catch (error) {
        console.error('Error loading data from server:', error);
        dataTable.innerHTML = `<thead><tr><th>Error</th></tr></thead><tbody><tr><td>${error.message}</td></tr></tbody>`;
        disablePaginationAndContinue();
        disableCleaningButtons(); // Disable cleaning buttons on error
        if(panelHeaderFileName) panelHeaderFileName.textContent = "Data Preview - Error";
    }
}

// Setup event listeners (Removed fileSelect listener)
function setupEventListeners() {
    // Pagination
    prevPageBtn?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayTableData();
        }
    });

    nextPageBtn?.addEventListener('click', () => {
        if (!currentFileData || !currentFileData.data) return;
        const totalPages = Math.ceil(currentFileData.data.rows.length / rowsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            displayTableData();
        }
    });

    // Continue to visualization
    continueBtn?.addEventListener('click', () => {
        // Server holds the state. Just navigate.
        window.location.href = 'data_visualization.html';
    });

    // Cleaning operation buttons listeners (Keep all these)
    removeDuplicatesBtn?.addEventListener('click', handleRemoveDuplicates);
    handleMissingBtn?.addEventListener('click', handleMissingValues);
    convertTypesBtn?.addEventListener('click', handleConvertTypes);
    cleanTextBtn?.addEventListener('click', handleCleanText);
    normalizeDataBtn?.addEventListener('click', handleNormalizeData);
    standardizeDataBtn?.addEventListener('click', handleStandardizeData);
    resetChangesBtn?.addEventListener('click', handleResetChanges);
    detectOutliersBtn?.addEventListener('click', handleDetectOutliers);
    handleOutliersBtn?.addEventListener('click', handleOutliers);
    addDerivedColumnBtn?.addEventListener('click', handleAddDerivedColumn);
    handleInconsistentDataBtn?.addEventListener('click', handleInconsistentData);
}

// Helper function to enable/disable buttons
function enableCleaningButtons() {
    const buttons = document.querySelectorAll('.cleaning-btn');
    buttons.forEach(button => button.disabled = false);
     if(continueBtn) continueBtn.disabled = false;
}

function disableCleaningButtons() {
    const buttons = document.querySelectorAll('.cleaning-btn');
    buttons.forEach(button => button.disabled = true);
}

function disablePaginationAndContinue() {
     if(prevPageBtn) prevPageBtn.disabled = true;
     if(nextPageBtn) nextPageBtn.disabled = true;
     if(pageInfo) pageInfo.textContent = 'Page 0 of 0 (0 rows)';
     if(continueBtn) continueBtn.disabled = true;
}

// Display file data (main function to update table, uses global currentFileData)
function displayFileData() {
     if (!currentFileData) {
        console.error("displayFileData called but currentFileData is null.");
        // Error handling is done in loadDataFromServer
        return;
     }
     // Update panel header title
     if (panelHeaderFileName) {
         panelHeaderFileName.textContent = `Data Preview: ${currentFileData.name || 'Unnamed File'}`;
     }
    currentPage = 1; // Reset page whenever data changes
    displayTableData();
}

// Display table data with pagination (uses global currentFileData)
function displayTableData() {
     if (!currentFileData || !currentFileData.data || !dataTable || !pageInfo || !prevPageBtn || !nextPageBtn ) return;

    const { headers, rows } = currentFileData.data;

    // Clear table
    dataTable.innerHTML = '';

    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    const indexTh = document.createElement('th');
    indexTh.textContent = '#';
    headerRow.appendChild(indexTh);

    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = header;
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    dataTable.appendChild(thead);

    // Create table body
    const tbody = document.createElement('tbody');
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = Math.min(startIndex + rowsPerPage, rows.length);

    if (rows.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = headers.length + 1;
        td.textContent = 'No data available.';
        td.style.textAlign = 'center';
        tr.appendChild(td);
        tbody.appendChild(tr);
    } else {
        for (let i = startIndex; i < endIndex; i++) {
            const row = rows[i];
            const tr = document.createElement('tr');

            const indexTd = document.createElement('td');
            indexTd.textContent = i + 1;
            indexTd.style.fontWeight = 'bold';
            tr.appendChild(indexTd);

            headers.forEach(header => {
                const td = document.createElement('td');
                td.textContent = (row[header] === null || row[header] === undefined) ? '' : row[header];
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        }
    }
    dataTable.appendChild(tbody);

    // Update pagination info
    const totalRows = rows.length;
    const totalPages = totalRows === 0 ? 1 : Math.ceil(totalRows / rowsPerPage);
    pageInfo.textContent = `Page ${currentPage} of ${totalPages} (${totalRows} rows)`;

    // Update pagination buttons
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages || totalRows === 0;
}

// --- Centralized API Response Handling ---
function handleApiResponse(result, successMessagePrefix = 'Operation successful') {
    // Check for backend error first
    if (result.error) {
        alert(`Error: ${result.error}`);
        console.error("Backend Error:", result.error);
        return false; // Indicate failure
    }

    let message = successMessagePrefix;
    if (result.message) { // Use backend message if provided
        message = result.message;
    }

    // Check if data was returned and update global state
    if (result.data) {
        if (Array.isArray(result.data)) {
            // Update the rows in our global state
            currentFileData.data.rows = result.data;

            // If headers might have changed (e.g., new derived column), update them.
            // Best practice: Server should return the *current* full header list in the response.
            // Let's assume for now headers might change and re-extract from the first row if data exists.
            if (result.data.length > 0) {
                 currentFileData.data.headers = Object.keys(result.data[0]);
            } else if (result.new_column && !currentFileData.data.headers.includes(result.new_column)) {
                 // Handle edge case: new column added, but data is now empty
                 currentFileData.data.headers.push(result.new_column);
             } else if (result.data.length === 0 && result.removed_count > 0) {
                 // Handle case where removing rows results in empty data, headers remain
                 // No header change needed unless columns were also removed (not implemented)
             } else if (result.data.length === 0) {
                 // If data is empty for other reasons, keep existing headers (or clear them?)
                 // Let's keep them for now.
             }


            // Re-render the table with the updated data
            displayFileData(); // This resets page to 1 and calls displayTableData
        } else {
            console.error('Invalid data format received from backend:', result.data);
            alert('Error: Received invalid data format from server.');
            return false; // Indicate failure
        }
    } else {
        // If no data is returned, assume the operation was successful but didn't change the data structure
        // (e.g., detecting outliers, or no duplicates found).
        // We might still want to display the message.
        console.log('Backend response did not include data array. Message:', message);
    }

    // Show success message (or warning)
    if (result.warning) {
        alert(`Warning: ${result.warning}\n\n${message}`);
    } else {
        // Simple alert for success message, consider a less intrusive notification system
        alert(message);
    }

    return true; // Indicate success
}


// --- Popup Helper Functions --- (Keep these as they are used by cleaning handlers)
function createPopup(title, content, buttons = []) {
    // Close existing popups first
     const existingPopup = document.querySelector('.popup-overlay');
     if (existingPopup) {
         document.body.removeChild(existingPopup);
     }

    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';

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
    closeBtn.onclick = () => { // Use onclick for simplicity here, avoids listener removal issues
        if (overlay.parentNode) document.body.removeChild(overlay);
    };

    header.appendChild(titleElement);
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'popup-body';
    // Use innerHTML carefully. Ensure formHTML is safe.
    body.innerHTML = content;

    const footer = document.createElement('div');
    footer.className = 'popup-footer';

    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.className = `popup-btn ${btn.primary ? 'popup-btn-primary' : 'popup-btn-secondary'}`;
        button.textContent = btn.text;
        button.onclick = () => { // Use onclick for simplicity
             // Action might involve async calls, popup should close AFTER action is handled or confirmed
            btn.action();
            // Let the action decide if/when to close the popup, remove automatic close here
            // if (overlay.parentNode) document.body.removeChild(overlay);
        };
        footer.appendChild(button);
    });

    // Add a default close button if no action buttons are provided
    if (buttons.length === 0) {
        const closeButton = document.createElement('button');
        closeButton.className = 'popup-btn popup-btn-secondary';
        closeButton.textContent = 'Close';
        closeButton.onclick = () => {
             if (overlay.parentNode) document.body.removeChild(overlay);
        };
        footer.appendChild(closeButton);
    }


    popup.appendChild(header);
    popup.appendChild(body);
    popup.appendChild(footer);
    overlay.appendChild(popup);

    document.body.appendChild(overlay);

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            if (overlay.parentNode) document.body.removeChild(overlay);
        }
    });

    return overlay; // Return the overlay element
}

function closePopup() {
     const existingPopup = document.querySelector('.popup-overlay');
     if (existingPopup) {
         document.body.removeChild(existingPopup);
     }
}


function createFormPopup(title, formHTML, onSubmit) {
    const formId = 'popup-form-' + Math.random().toString(36).substr(2, 9);
    const content = `<form id="${formId}">${formHTML}</form>`;
    let popupOverlay = null; // Reference to the overlay

    const buttons = [
        {
            text: 'Cancel',
            primary: false,
            action: () => {
                 if (popupOverlay && popupOverlay.parentNode) {
                    document.body.removeChild(popupOverlay);
                 }
            }
        },
        {
            text: 'Submit',
            primary: true,
            action: async () => { // Make action async if onSubmit is async
                const form = document.getElementById(formId);
                if (!form) return;

                const formData = new FormData(form);
                const data = {};

                 // Handle regular inputs, selects
                 formData.forEach((value, key) => {
                     // Basic handling for multiple selects (might need refinement)
                     if (data[key]) {
                         if (!Array.isArray(data[key])) {
                             data[key] = [data[key]];
                         }
                         data[key].push(value);
                     } else {
                         data[key] = value;
                     }
                 });

                 // Handle checkboxes specifically (value is 'on' if checked, absent if not)
                 const checkboxes = form.querySelectorAll('input[type="checkbox"]');
                 checkboxes.forEach(checkbox => {
                     if (checkbox.name) {
                          // Store boolean true/false
                         data[checkbox.name] = checkbox.checked;
                     }
                 });

                 // Handle radio buttons (only checked one matters)
                 const radios = form.querySelectorAll('input[type="radio"]:checked');
                 radios.forEach(radio => {
                     if (radio.name) {
                         data[radio.name] = radio.value;
                     }
                 });
                 
                 // Handle multiple selects correctly
                  const multiSelects = form.querySelectorAll('select[multiple]');
                  multiSelects.forEach(select => {
                       if (select.name) {
                           data[select.name] = Array.from(select.selectedOptions).map(opt => opt.value);
                       }
                  });

                try {
                    // Disable submit button during processing?
                    await onSubmit(data); // Wait for the submit action to complete
                    // Close popup only if submission logic doesn't handle it
                     if (popupOverlay && popupOverlay.parentNode) {
                         document.body.removeChild(popupOverlay);
                     }
                } catch (error) {
                    console.error("Error during form submission action:", error);
                    // Keep popup open to show error or allow retry?
                    // Optionally display error inside the popup
                }
            }
        }
    ];

    popupOverlay = createPopup(title, content, buttons); // Store the overlay reference
    return popupOverlay;
}


// --- Cleaning Operation Handlers --- (Modified to use currentFileData)

async function handleRemoveDuplicates() {
     if (!currentFileData || !currentFileData.data) {
         alert("No data loaded to process.");
         return;
     }
    // Checkbox for specific columns might be added later
    createFormPopup(
        'Remove Duplicates',
        `<p>Are you sure you want to remove duplicate rows?</p>
         <p><small>This operation considers all columns to identify duplicates.</small></p>`,
        async () => {
            try {
                const response = await fetch(`${API_URL}/remove_duplicates`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({}) // No params needed for now
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || `Server error ${response.status}`);
                handleApiResponse(result, `Removed ${result.removed_count ?? 0} duplicate rows.`);
            } catch (error) {
                alert(`Failed to remove duplicates: ${error.message}`);
            }
        }
    );
}

async function handleMissingValues() {
     if (!currentFileData || !currentFileData.data || !currentFileData.data.headers) {
         alert("No data loaded or columns found.");
         return;
     }
    const columns = currentFileData.data.headers;
    const columnOptions = columns.map(col => `<option value="${col}">${col}</option>`).join('');

    const formHTML = `
        <div class="form-group">
            <label for="column">Select Column:</label>
            <select id="column" name="column" class="form-control" required>${columnOptions}</select>
        </div>
        <div class="form-group">
            <label>Handling Method:</label>
            <div class="radio-group">
                <div class="radio-item"><label><input type="radio" name="method" value="remove" checked> Remove rows with missing values</label></div>
                <div class="radio-item"><label><input type="radio" name="method" value="mean"> Fill with mean (numeric)</label></div>
                <div class="radio-item"><label><input type="radio" name="method" value="median"> Fill with median (numeric)</label></div>
                <div class="radio-item"><label><input type="radio" name="method" value="mode"> Fill with mode (most frequent)</label></div>
                <div class="radio-item">
                     <label><input type="radio" name="method" value="custom"> Fill with custom value:</label>
                     <input type="text" name="custom_value" class="form-control" style="margin-left: 10px; display: inline-block; width: auto;" disabled>
                </div>
            </div>
        </div>`;

    const popup = createFormPopup('Handle Missing Values', formHTML, async (data) => {
        if (data.method === 'custom' && (data.custom_value === null || data.custom_value === undefined || data.custom_value.trim() === '')) {
             alert("Please provide a custom value.");
             return; // Keep popup open
        }
        try {
            const response = await fetch(`${API_URL}/handle_missing_values`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    column: data.column,
                    method: data.method,
                    custom_value: data.method === 'custom' ? data.custom_value : null
                })
            });
            const result = await response.json();
             if (!response.ok) throw new Error(result.error || `Server error ${response.status}`);
             handleApiResponse(result, `Handled missing values in '${data.column}' using '${data.method}'.`);
             closePopup(); // Close popup on success
        } catch (error) {
            alert(`Failed to handle missing values: ${error.message}`);
            // Keep popup open on error
        }
    });

    // Add event listener to enable/disable custom input within the popup
    const methodRadios = popup.querySelectorAll('input[name="method"]');
    const customValueInput = popup.querySelector('input[name="custom_value"]');
    methodRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            customValueInput.disabled = e.target.value !== 'custom';
            if (e.target.value === 'custom') customValueInput.focus();
        });
    });
}


async function handleConvertTypes() {
     if (!currentFileData || !currentFileData.data || !currentFileData.data.headers) {
         alert("No data loaded or columns found.");
         return;
     }
    const columns = currentFileData.data.headers;
    const columnOptions = columns.map(col => `<option value="${col}">${col}</option>`).join('');

    const formHTML = `
        <div class="form-group">
            <label for="column">Select Column:</label>
            <select id="column" name="column" class="form-control" required>${columnOptions}</select>
        </div>
        <div class="form-group">
            <label>Target Data Type:</label>
            <div class="radio-group">
                <div class="radio-item"><label><input type="radio" name="target_type" value="text" checked> Text (String)</label></div>
                <div class="radio-item"><label><input type="radio" name="target_type" value="number"> Number (Numeric)</label></div>
                <div class="radio-item"><label><input type="radio" name="target_type" value="date"> Date/Timestamp</label></div>
                <div class="radio-item"><label><input type="radio" name="target_type" value="boolean"> Boolean (True/False)</label></div>
            </div>
        </div>
        `;
        // <div class="form-group">
        //     <label><input type="checkbox" name="strict_conversion"> Strict conversion (fail if any values can't be converted)</label>
        // </div>

     createFormPopup('Convert Data Types', formHTML, async (data) => {
        try {
            const response = await fetch(`${API_URL}/convert_types`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    column: data.column,
                    target_type: data.target_type
                    // strict: data.strict_conversion // Removed
                })
            });
             const result = await response.json();
             if (!response.ok) throw new Error(result.error || `Server error ${response.status}`);
             handleApiResponse(result, `Converted '${data.column}' to type '${data.target_type}'.`);
             closePopup();
        } catch (error) {
            alert(`Failed to convert types: ${error.message}`);
        }
    });
}

async function handleCleanText() {
     if (!currentFileData || !currentFileData.data || !currentFileData.data.headers) {
         alert("No data loaded or columns found.");
         return;
     }
    const columns = currentFileData.data.headers;
    const columnOptions = columns.map(col => `<option value="${col}">${col}</option>`).join('');

    const formHTML = `
        <div class="form-group">
            <label for="column">Select Text Column:</label>
            <select id="column" name="column" class="form-control" required>${columnOptions}</select>
        </div>
        <div class="form-group">
            <label>Cleaning Operations:</label>
            <div class="checkbox-group">
                <div class="checkbox-item"><label><input type="checkbox" name="op_trim" checked> Trim leading/trailing whitespace</label></div>
                <div class="checkbox-item"><label><input type="checkbox" name="op_lowercase"> Convert to lowercase</label></div>
                <div class="checkbox-item"><label><input type="checkbox" name="op_uppercase"> Convert to uppercase</label></div>
                <div class="checkbox-item"><label><input type="checkbox" name="op_remove_punctuation"> Remove punctuation</label></div>
                <div class="checkbox-item"><label><input type="checkbox" name="op_remove_digits"> Remove digits (0-9)</label></div>
                </div>
        </div>`;

    createFormPopup('Clean Text Data', formHTML, async (data) => {
        const operations = [];
        if (data.op_trim) operations.push('trim');
        if (data.op_lowercase) operations.push('lowercase');
        if (data.op_uppercase) operations.push('uppercase');
        if (data.op_remove_punctuation) operations.push('remove_punctuation');
        if (data.op_remove_digits) operations.push('remove_digits');
        // if (data.op_remove_extra_spaces) operations.push('remove_extra_spaces'); // Add if implemented in backend

        if (operations.length === 0) {
            alert('No cleaning operations selected.');
            return; // Keep popup open
        }

        try {
            const response = await fetch(`${API_URL}/clean_text`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    column: data.column,
                    operations: operations
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || `Server error ${response.status}`);
            handleApiResponse(result, `Cleaned text in '${data.column}' using: ${operations.join(', ')}.`);
            closePopup();
        } catch (error) {
            alert(`Failed to clean text: ${error.message}`);
        }
    });
}


async function handleNormalizeData() {
     if (!currentFileData || !currentFileData.data || !currentFileData.data.headers) {
         alert("No data loaded or columns found.");
         return;
     }
    const columns = currentFileData.data.headers;
    const columnOptions = columns.map(col => `<option value="${col}">${col}</option>`).join('');

    const formHTML = `
        <div class="form-group">
            <label for="column">Select Numeric Column:</label>
            <select id="column" name="column" class="form-control" required>${columnOptions}</select>
        </div>
        <div class="form-group">
            <p>Normalization scales values to [0, 1].</p>
        </div>
        <div class="form-group">
            <label><input type="checkbox" name="preserve_original"> Keep original column (creates new column ending in '_normalized')</label>
        </div>`;

     createFormPopup('Normalize Data (Min-Max Scaling)', formHTML, async (data) => {
        try {
            const response = await fetch(`${API_URL}/normalize_data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    column: data.column,
                    preserve_original: data.preserve_original
                })
            });
             const result = await response.json();
             if (!response.ok) throw new Error(result.error || `Server error ${response.status}`);

             const min = result.details?.min?.toFixed(2) ?? 'N/A';
             const max = result.details?.max?.toFixed(2) ?? 'N/A';
             const newColMsg = result.new_column ? ` as '${result.new_column}'` : '';

             handleApiResponse(result, `Normalized '${data.column}'${newColMsg} (Min: ${min}, Max: ${max}).`);
             closePopup();
        } catch (error) {
            alert(`Failed to normalize data: ${error.message}`);
        }
    });
}

async function handleStandardizeData() {
     if (!currentFileData || !currentFileData.data || !currentFileData.data.headers) {
         alert("No data loaded or columns found.");
         return;
     }
    const columns = currentFileData.data.headers;
    const columnOptions = columns.map(col => `<option value="${col}">${col}</option>`).join('');

    const formHTML = `
        <div class="form-group">
            <label for="column">Select Numeric Column:</label>
            <select id="column" name="column" class="form-control" required>${columnOptions}</select>
        </div>
        <div class="form-group">
            <p>Standardization transforms values to mean=0, std dev=1.</p>
        </div>
        <div class="form-group">
            <label><input type="checkbox" name="preserve_original"> Keep original column (creates new column ending in '_standardized')</label>
        </div>`;

     createFormPopup('Standardize Data (Z-Score)', formHTML, async (data) => {
        try {
            const response = await fetch(`${API_URL}/standardize_data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    column: data.column,
                    preserve_original: data.preserve_original
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || `Server error ${response.status}`);

             const mean = result.details?.mean?.toFixed(2) ?? 'N/A';
             const stdDev = result.details?.std_dev?.toFixed(2) ?? 'N/A';
             const newColMsg = result.new_column ? ` as '${result.new_column}'` : '';

            handleApiResponse(result, `Standardized '${data.column}'${newColMsg} (Mean: ${mean}, Std Dev: ${stdDev}).`);
            closePopup();
        } catch (error) {
            alert(`Failed to standardize data: ${error.message}`);
        }
    });
}

async function handleResetChanges() {
     if (!currentFileData) {
         alert("No data loaded to reset.");
         return;
     }
    createFormPopup(
        'Reset Changes',
        `<p>Are you sure you want to discard all cleaning changes for <strong>${currentFileData.name || 'this file'}</strong> and revert to the original uploaded data?</p>
         <p><strong>Warning: This action cannot be undone.</strong></p>`,
        async () => {
            try {
                // Optional: Show loading state
                const response = await fetch(`${API_URL}/reset_changes`, { method: 'POST' });
                 const result = await response.json();
                 if (!response.ok) throw new Error(result.error || `Server error ${response.status}`);
                 // IMPORTANT: After resetting, the data in currentFileData needs to be updated
                 // The handleApiResponse function already handles this by updating currentFileData.data
                 handleApiResponse(result, 'Successfully reset data to original state.');
                 closePopup();
            } catch (error) {
                alert(`Failed to reset changes: ${error.message}`);
            }
        }
    );
}

async function handleDetectOutliers() {
     if (!currentFileData || !currentFileData.data || !currentFileData.data.headers) {
         alert("No data loaded or columns found.");
         return;
     }
    const columns = currentFileData.data.headers;
    const columnOptions = columns.map(col => `<option value="${col}">${col}</option>`).join('');

    const formHTML = `
        <div class="form-group">
            <label for="column">Select Numeric Column:</label>
            <select id="column" name="column" class="form-control" required>${columnOptions}</select>
        </div>
        <div class="form-group">
            <label>Detection Method:</label>
            <div class="radio-group">
                <div class="radio-item"><label><input type="radio" name="method" value="iqr" checked> IQR (Interquartile Range)</label></div>
                <div class="radio-item"><label><input type="radio" name="method" value="zscore"> Z-Score</label></div>
            </div>
        </div>
        <div class="form-group" id="zscore-threshold-group" style="display: none;">
            <label for="threshold">Z-Score Threshold:</label>
            <input type="number" name="threshold" class="form-control" value="3.0" step="0.1" min="1">
        </div>`;

     const popup = createFormPopup('Detect Outliers', formHTML, async (data) => {
         // Close the options popup first
         closePopup();
         
         try {
            const response = await fetch(`${API_URL}/detect_outliers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    column: data.column,
                    method: data.method,
                    threshold: data.method === 'zscore' ? parseFloat(data.threshold) : undefined
                })
            });
             const result = await response.json();
             if (!response.ok) throw new Error(result.error || `Server error ${response.status}`);
             
             // Show results in a new popup
             displayOutlierResults(result, data.method);

         } catch (error) {
            alert(`Failed to detect outliers: ${error.message}`);
         }
    });
    
     // Show/hide threshold input based on method selection
     const methodRadios = popup.querySelectorAll('input[name="method"]');
     const thresholdGroup = popup.querySelector('#zscore-threshold-group');
     methodRadios.forEach(radio => {
         radio.addEventListener('change', (e) => {
             thresholdGroup.style.display = e.target.value === 'zscore' ? 'block' : 'none';
         });
         // Initial check
         if (radio.checked) thresholdGroup.style.display = radio.value === 'zscore' ? 'block' : 'none';
     });
}

// Helper function to display outlier detection results
function displayOutlierResults(result, methodUsed) {
     if (result.error) {
         alert(`Error detecting outliers: ${result.error}`);
         return;
     }

     let detailsHTML = '';
     if (result.details) {
         if (methodUsed === 'zscore') {
             detailsHTML = `<li>Mean: ${result.details.mean?.toFixed(2) ?? 'N/A'}</li>
                            <li>Std Dev: ${result.details.std_dev?.toFixed(2) ?? 'N/A'}</li>
                            <li>Threshold: ${result.details.threshold ?? 'N/A'}</li>`;
         } else { // IQR
             detailsHTML = `<li>Q1: ${result.details.q1?.toFixed(2) ?? 'N/A'}</li>
                            <li>Q3: ${result.details.q3?.toFixed(2) ?? 'N/A'}</li>
                            <li>IQR: ${result.details.iqr?.toFixed(2) ?? 'N/A'}</li>
                            <li>Bounds: [${result.details.lower_bound?.toFixed(2) ?? 'N/A'}, ${result.details.upper_bound?.toFixed(2) ?? 'N/A'}]</li>`;
         }
     }

     const message = result.message || `Detected ${result.outlier_count} outliers in column '${result.column}' using ${methodUsed}.`;
     const content = `
         <p>${message}</p>
         ${detailsHTML ? `<strong>Details:</strong><ul>${detailsHTML}</ul>` : ''}
         ${result.outlier_count > 0 ? '<p>Would you like to handle these outliers now?</p>' : ''}
     `;

     const buttons = [
         { text: 'Close', primary: false, action: closePopup }
     ];

     if (result.outlier_count > 0) {
         buttons.push({
             text: 'Handle Outliers',
             primary: true,
             action: () => {
                 closePopup(); // Close this results popup
                 // Pre-fill the handle outliers form based on detection results
                 handleOutliers(result.column, methodUsed, result.details?.threshold);
             }
         });
     }

     createPopup('Outlier Detection Results', content, buttons);
}


// Modified handleOutliers to accept pre-filled values
async function handleOutliers(defaultColumn = null, defaultDetectionMethod = 'iqr', defaultThreshold = 3.0) {
     if (!currentFileData || !currentFileData.data || !currentFileData.data.headers) {
         alert("No data loaded or columns found.");
         return;
     }
    const columns = currentFileData.data.headers;
    const columnOptions = columns.map(col =>
         `<option value="${col}" ${col === defaultColumn ? 'selected' : ''}>${col}</option>`
     ).join('');

    const formHTML = `
        <div class="form-group">
            <label for="column">Select Numeric Column:</label>
            <select id="column" name="column" class="form-control" required>${columnOptions}</select>
        </div>
        <div class="form-group">
            <label>Handling Method:</label>
            <div class="radio-group">
                <div class="radio-item"><label><input type="radio" name="handling_method" value="clip" checked> Clip (replace with bounds)</label></div>
                <div class="radio-item"><label><input type="radio" name="handling_method" value="remove"> Remove rows</label></div>
                <div class="radio-item"><label><input type="radio" name="handling_method" value="mean"> Replace with mean</label></div>
                <div class="radio-item"><label><input type="radio" name="handling_method" value="median"> Replace with median</label></div>
            </div>
        </div>
        <div class="form-group">
            <label>Based on Detection Method:</label>
            <div class="radio-group">
                 <div class="radio-item"><label><input type="radio" name="detection_method" value="iqr" ${defaultDetectionMethod === 'iqr' ? 'checked' : ''}> IQR</label></div>
                 <div class="radio-item"><label><input type="radio" name="detection_method" value="zscore" ${defaultDetectionMethod === 'zscore' ? 'checked' : ''}> Z-Score</label></div>
            </div>
        </div>
        <div class="form-group" id="handle-zscore-threshold-group" style="display: ${defaultDetectionMethod === 'zscore' ? 'block' : 'none'};">
            <label for="threshold">Z-Score Threshold:</label>
            <input type="number" name="threshold" class="form-control" value="${defaultThreshold}" step="0.1" min="1">
        </div>`;

     const popup = createFormPopup('Handle Outliers', formHTML, async (data) => {
        try {
            const response = await fetch(`${API_URL}/handle_outliers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    column: data.column,
                    method: data.handling_method,
                    detection_method: data.detection_method,
                    threshold: data.detection_method === 'zscore' ? parseFloat(data.threshold) : undefined
                })
            });
            const result = await response.json();
             if (!response.ok) throw new Error(result.error || `Server error ${response.status}`);

             let message = `Handled ${result.outlier_count ?? 0} outliers in '${data.column}' ` +
                           `using ${data.handling_method} method ` +
                           `(based on ${data.detection_method} detection).`;

             handleApiResponse(result, message);
             closePopup();
        } catch (error) {
            alert(`Failed to handle outliers: ${error.message}`);
        }
    });
    
     // Show/hide threshold input based on method selection
     const detMethodRadios = popup.querySelectorAll('input[name="detection_method"]');
     const thresholdGroup = popup.querySelector('#handle-zscore-threshold-group');
     detMethodRadios.forEach(radio => {
         radio.addEventListener('change', (e) => {
             thresholdGroup.style.display = e.target.value === 'zscore' ? 'block' : 'none';
         });
     });
}


async function handleAddDerivedColumn() {
     if (!currentFileData || !currentFileData.data || !currentFileData.data.headers) {
         alert("No data loaded or columns found.");
         return;
     }
    const columns = currentFileData.data.headers;
    const columnOptions = columns.map(col => `<option value="${col}">${col}</option>`).join('');

    const formHTML = `
        <div class="form-group">
            <label>Operation:</label>
            <select name="operation" class="form-control" required>
                <option value="sum">Sum</option>
                <option value="mean">Mean (Average)</option>
                <option value="median">Median</option>
                <option value="product">Product (Multiply)</option>
                <option value="difference">Difference (Col1 - Col2)</option>
                 <option value="mode">Mode (Most Frequent)</option> </select>
        </div>
        <div class="form-group">
            <label>Select Columns:</label>
            <select name="columns" multiple class="formm-control" size="6" required> ${columnOptions} </select>
            <small class="form-text text-muted">Hold Ctrl/Cmd to select multiple. Difference requires exactly 2.</small>
        </div>
        <div class="form-group">
            <label for="new_column_name">New Column Name (Optional):</label>
            <input type="text" name="new_column_name" class="form-control" placeholder="Default: operation_of_columns">
        </div>`;

     createFormPopup('Add Derived Column', formHTML, async (data) => {
        const selectedColumns = data.columns; // Already an array due to multi-select handling in createFormPopup
        if (!selectedColumns || selectedColumns.length === 0) {
            alert('Please select at least one column.');
            return;
        }
         if (data.operation === 'difference' && selectedColumns.length !== 2) {
             alert('The "Difference" operation requires exactly two columns to be selected.');
             return;
         }

        try {
            const response = await fetch(`${API_URL}/add_derived_column`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    operation: data.operation,
                    columns: selectedColumns,
                    new_column_name: data.new_column_name || undefined // Send undefined if blank
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || `Server error ${response.status}`);

            handleApiResponse(result, `Added new column '${result.new_column}' using ${result.operation}.`);
             closePopup();
        } catch (error) {
            alert(`Failed to add derived column: ${error.message}`);
        }
    });
}

async function handleInconsistentData() {
     if (!currentFileData || !currentFileData.data || !currentFileData.data.headers) {
         alert("No data loaded or columns found.");
         return;
     }
    const columns = currentFileData.data.headers;
    const columnOptions = columns.map(col => `<option value="${col}">${col}</option>`).join('');

    const formHTML = `
        <div class="form-group">
            <label for="column">Select Column:</label>
            <select id="column" name="column" class="form-control" required>${columnOptions}</select>
        </div>
        <div class="form-group">
            <label><input type="checkbox" name="case_sensitive"> Case-sensitive matching (for custom mappings)</label>
        </div>
        <hr>
        <p><small>Provide custom mappings below OR leave empty to attempt automatic standardization (trimming, common null values, boolean conversion).</small></p>
        <div class="form-group">
            <label>Custom Mappings:</label>
            <div id="mapping-container">
                </div>
            <button type="button" id="add-mapping-btn" class="popup-btn popup-btn-secondary" style="margin-top: 10px;">+ Add Mapping</button>
        </div>`;

    const popup = createFormPopup('Handle Inconsistent Data', formHTML, async (data) => {
        try {
            // Process mapping data (only send if provided)
            const mappingRows = popup.querySelectorAll('.mapping-row');
            let mapping = {};
            let mappingProvided = false;
             mappingRows.forEach(row => {
                 const fromInput = row.querySelector('input[name="from_value[]"]');
                 const toInput = row.querySelector('input[name="to_value[]"]');
                 if (fromInput && toInput && fromInput.value.trim()) {
                     mapping[fromInput.value.trim()] = toInput.value.trim(); // Use trimmed values
                     mappingProvided = true;
                 }
             });


            const response = await fetch(`${API_URL}/handle_inconsistent_data`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    column: data.column,
                    mapping: mappingProvided ? mapping : undefined, // Send mapping only if entries exist
                    case_sensitive: data.case_sensitive
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || `Server error ${response.status}`);

            let message = `Standardized data in column '${data.column}'.`;
             message += result.mapping_applied ? " Custom mappings applied." : " Automatic standardization attempted.";

            handleApiResponse(result, message);
            closePopup();
        } catch (error) {
            alert(`Failed to standardize data: ${error.message}`);
        }
    });

    // --- Dynamic mapping row logic ---
    const addMappingBtn = popup.querySelector('#add-mapping-btn');
    const mappingContainer = popup.querySelector('#mapping-container');

    const addMappingRow = () => {
        const newRow = document.createElement('div');
        newRow.className = 'mapping-row';
        newRow.innerHTML = `
            <input type="text" name="from_value[]" placeholder="Original Value" class="form-control mapping-input">
            <span>→</span>
            <input type="text" name="to_value[]" placeholder="New Value" class="form-control mapping-input">
            <button type="button" class="remove-mapping-btn" title="Remove Mapping">×</button>
        `;
        mappingContainer.appendChild(newRow);

        newRow.querySelector('.remove-mapping-btn').addEventListener('click', () => {
            mappingContainer.removeChild(newRow);
        });
    };

    addMappingBtn.addEventListener('click', addMappingRow);
    addMappingRow(); // Add one row initially
}