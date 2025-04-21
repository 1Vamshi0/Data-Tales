// Data state
let dataFiles = [];
let currentFileIndex = 0;
let currentPage = 1;
let rowsPerPage = 10;

// API endpoint
const API_URL = 'http://localhost:5000'; // Ensure this matches your Flask server address

// DOM elements
const fileSelect = document.getElementById('file-select');
const dataTable = document.getElementById('data-table');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageInfo = document.getElementById('page-info');
const continueBtn = document.getElementById('continue-to-visualization');

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
    loadData();
    setupEventListeners();
});

// Load data from session storage
async function loadData() {
    const storedData = sessionStorage.getItem('dataFiles');

    if (!storedData) {
        window.location.href = 'upload.html';
        return;
    }

    try {
        dataFiles = JSON.parse(storedData);

        if (dataFiles.length === 0) {
            window.location.href = 'upload.html';
            return;
        }

        // Get the selected file index from viewing page, default to 0
        currentFileIndex = parseInt(sessionStorage.getItem('currentFileIndex') || '0');
        if (currentFileIndex >= dataFiles.length || currentFileIndex < 0) {
            currentFileIndex = 0; // Reset if index is invalid
        }

        // Initialize the Python backend with the data of the selected file
        await initializeBackend(dataFiles[currentFileIndex].data.rows);

        // Populate file selector and set selected index
        populateFileSelector();
        fileSelect.value = currentFileIndex; // Set the dropdown to the current file

        // Display the selected file
        displayFileData(currentFileIndex);
    } catch (error) {
        console.error('Error loading data:', error);
        alert(`Error loading data: ${error.message}. Redirecting to upload page.`);
        window.location.href = 'upload.html';
    }
}

// Initialize the Python backend
async function initializeBackend(data) {
    if (!Array.isArray(data)) {
        console.error('Invalid data format for backend initialization.');
        alert('Failed to initialize backend: Invalid data format.');
        return;
    }
    try {
        const response = await fetch(`${API_URL}/initialize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data: data })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown initialization error' }));
            throw new Error(`Failed to initialize backend: ${errorData.error || response.statusText}`);
        }
        console.log('Backend initialized successfully.');
    } catch (error) {
        console.error('Error initializing backend:', error);
        alert(`Failed to contact data cleaning backend: ${error.message}. Please ensure the Python server is running and accessible at ${API_URL}.`);
        disableCleaningButtons();
    }
}

// Setup event listeners
function setupEventListeners() {
    // File selector change
    fileSelect.addEventListener('change', async (e) => {
        currentFileIndex = parseInt(e.target.value);
        currentPage = 1; // Reset to first page when changing file
        await initializeBackend(dataFiles[currentFileIndex].data.rows);
        displayFileData(currentFileIndex);
    });

    // Pagination
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayTableData(currentFileIndex);
        }
    });

    nextPageBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(dataFiles[currentFileIndex].data.rows.length / rowsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            displayTableData(currentFileIndex);
        }
    });

    // Continue to visualization
    continueBtn.addEventListener('click', () => {
        sessionStorage.setItem('dataFiles', JSON.stringify(dataFiles));
        sessionStorage.setItem('currentFileIndex', currentFileIndex);
        window.location.href = 'data_visualization.html';
    });

    // Cleaning operation buttons
    removeDuplicatesBtn.addEventListener('click', handleRemoveDuplicates);
    handleMissingBtn.addEventListener('click', handleMissingValues);
    convertTypesBtn.addEventListener('click', handleConvertTypes);
    cleanTextBtn.addEventListener('click', handleCleanText);
    normalizeDataBtn.addEventListener('click', handleNormalizeData);
    standardizeDataBtn.addEventListener('click', handleStandardizeData);
    resetChangesBtn.addEventListener('click', handleResetChanges);
    detectOutliersBtn.addEventListener('click', handleDetectOutliers);
    handleOutliersBtn.addEventListener('click', handleOutliers);
    addDerivedColumnBtn.addEventListener('click', handleAddDerivedColumn);
    handleInconsistentDataBtn.addEventListener('click', handleInconsistentData);
}

// Helper function to disable buttons if backend fails
function disableCleaningButtons() {
    const buttons = document.querySelectorAll('.cleaning-btn');
    buttons.forEach(button => button.disabled = true);
    alert('Data cleaning operations disabled due to backend connection failure.');
}

// Populate file selector dropdown
function populateFileSelector() {
    fileSelect.innerHTML = ''; // Clear existing options

    dataFiles.forEach((file, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = file.name;
        fileSelect.appendChild(option);
    });
}

// Display file data (main function to update table)
function displayFileData(fileIndex) {
    if (fileIndex < 0 || fileIndex >= dataFiles.length) {
        console.error('Invalid file index:', fileIndex);
        alert('Error: Could not display data for the selected file.');
        return;
    }
    currentPage = 1;
    displayTableData(fileIndex);
}

// Display table data with pagination
function displayTableData(fileIndex) {
    const file = dataFiles[fileIndex];
    if (!file || !file.data || !Array.isArray(file.data.headers) || !Array.isArray(file.data.rows)) {
        console.error('Invalid data structure for file index:', fileIndex, file);
        dataTable.innerHTML = '<tr><td colspan="99">Error: Invalid data format</td></tr>';
        pageInfo.textContent = 'Page 0 of 0';
        prevPageBtn.disabled = true;
        nextPageBtn.disabled = true;
        return;
    }

    const { headers, rows } = file.data;

    // Clear table
    dataTable.innerHTML = '';

    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    // Add index column header
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

    // Create table body with pagination
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

            // Add index column cell
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
    nextPageBtn.disabled = currentPage === totalPages;
}

// Centralized function to handle API responses
function handleApiResponse(result, successMessagePrefix = 'Operation successful') {
    if (result.error) {
        alert(`Error: ${result.error}`);
        return false;
    }

    let message = successMessagePrefix;
    if (result.message) {
        message = result.message;
    }

    if (result.data) {
        if (Array.isArray(result.data)) {
            // Update the data rows
            dataFiles[currentFileIndex].data.rows = result.data;
            
            // If a new column was added (indicated by new_column in result)
            if (result.new_column && !dataFiles[currentFileIndex].data.headers.includes(result.new_column)) {
                // Add the new column to headers
                dataFiles[currentFileIndex].data.headers.push(result.new_column);
            }
            
            displayFileData(currentFileIndex);
        } else {
            console.error('Invalid data format received from backend:', result.data);
            alert('Error: Received invalid data format from server.');
            return false;
        }
    } else {
        console.log('Backend did not return data, assuming no change or success.');
    }

    if (result.warning) {
        alert(`Warning: ${result.warning}\n\n${message}`);
    } else {
        alert(message);
    }

    return true;
}

// Popup helper functions
function createPopup(title, content, buttons = []) {
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
    closeBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
    });
    
    header.appendChild(titleElement);
    header.appendChild(closeBtn);
    
    const body = document.createElement('div');
    body.className = 'popup-body';
    body.innerHTML = content;
    
    const footer = document.createElement('div');
    footer.className = 'popup-footer';
    
    buttons.forEach(btn => {
        const button = document.createElement('button');
        button.className = `popup-btn ${btn.primary ? 'popup-btn-primary' : 'popup-btn-secondary'}`;
        button.textContent = btn.text;
        button.addEventListener('click', () => {
            btn.action();
            document.body.removeChild(overlay);
        });
        footer.appendChild(button);
    });
    
    if (buttons.length === 0) {
        const closeButton = document.createElement('button');
        closeButton.className = 'popup-btn popup-btn-primary';
        closeButton.textContent = 'Close';
        closeButton.addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
        footer.appendChild(closeButton);
    }
    
    popup.appendChild(header);
    popup.appendChild(body);
    popup.appendChild(footer);
    overlay.appendChild(popup);
    
    document.body.appendChild(overlay);
    
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            document.body.removeChild(overlay);
        }
    });
    
    return overlay;
}

function createFormPopup(title, formHTML, onSubmit) {
    const formId = 'popup-form-' + Math.random().toString(36).substr(2, 9);
    const content = `
        <form id="${formId}">
            ${formHTML}
        </form>
    `;
    
    const popup = createPopup(title, content, [
        {
            text: 'Cancel',
            primary: false,
            action: () => {}
        },
        {
            text: 'Submit',
            primary: true,
            action: () => {
                const form = document.getElementById(formId);
                const formData = new FormData(form);
                const data = {};
                formData.forEach((value, key) => {
                    data[key] = value;
                });
                
                const checkboxes = form.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(checkbox => {
                    if (checkbox.name) {
                        data[checkbox.name] = checkbox.checked;
                    }
                });
                
                const radios = form.querySelectorAll('input[type="radio"]:checked');
                radios.forEach(radio => {
                    if (radio.name) {
                        data[radio.name] = radio.value;
                    }
                });
                
                onSubmit(data);
            }
        }
    ]);
    
    return popup;
}

// Cleaning operation handlers
async function handleRemoveDuplicates() {
    createFormPopup(
        'Remove Duplicates',
        `
        <div class="form-group">
            <p>Are you sure you want to remove duplicate rows from the dataset?</p>
            <p><strong>Note:</strong> This operation cannot be undone.</p>
        </div>
        <div class="form-group">
            <label>
                <input type="checkbox" name="consider_all_columns" checked>
                Consider all columns when identifying duplicates
            </label>
        </div>
        `,
        async (data) => {
            try {
                const response = await fetch(`${API_URL}/remove_duplicates`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        consider_all_columns: data.consider_all_columns
                    })
                });
                if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
                const result = await response.json();
                handleApiResponse(result, `Removed ${result.removed_count ?? 0} duplicate rows.`);
            } catch (error) {
                console.error('Error removing duplicates:', error);
                alert(`Failed to remove duplicates: ${error.message}`);
            }
        }
    );
}

async function handleMissingValues() {
    const columns = dataFiles[currentFileIndex]?.data?.headers || [];
    
    if (columns.length === 0) {
        alert('No columns available in the current dataset.');
        return;
    }
    
    const columnOptions = columns.map(col => `<option value="${col}">${col}</option>`).join('');
    
    createFormPopup(
        'Handle Missing Values',
        `
        <div class="form-group">
            <label for="column">Select Column:</label>
            <select id="column" name="column" class="form-control" required>
                ${columnOptions}
            </select>
        </div>
        
        <div class="form-group">
            <label>Handling Method:</label>
            <div class="checkbox-group">
                <div class="checkbox-item">
                    <label>
                        <input type="radio" name="method" value="remove" checked>
                        Remove rows with missing values
                    </label>
                </div>
                <div class="checkbox-item">
                    <label>
                        <input type="radio" name="method" value="mean">
                        Fill with mean (numeric only)
                    </label>
                </div>
                <div class="checkbox-item">
                    <label>
                        <input type="radio" name="method" value="median">
                        Fill with median (numeric only)
                    </label>
                </div>
                <div class="checkbox-item">
                    <label>
                        <input type="radio" name="method" value="mode">
                        Fill with most frequent value
                    </label>
                </div>
                <div class="checkbox-item">
                    <label>
                        <input type="radio" name="method" value="custom">
                        Fill with custom value:
                        <input type="text" name="custom_value" class="form-control" style="margin-top: 5px;" disabled>
                    </label>
                </div>
            </div>
        </div>
        `,
        async (data) => {
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
                if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
                const result = await response.json();
                handleApiResponse(result, `Handled ${result.missing_count ?? 0} missing values in '${data.column}' using '${data.method}'.`);
            } catch (error) {
                console.error('Error handling missing values:', error);
                alert(`Failed to handle missing values: ${error.message}`);
            }
        }
    );
    
    document.addEventListener('change', (e) => {
        if (e.target.name === 'method') {
            const customValueInput = document.querySelector('input[name="custom_value"]');
            customValueInput.disabled = e.target.value !== 'custom';
            if (e.target.value === 'custom') {
                customValueInput.focus();
            }
        }
    });
}

async function handleConvertTypes() {
    const columns = dataFiles[currentFileIndex]?.data?.headers || [];
    
    if (columns.length === 0) {
        alert('No columns available in the current dataset.');
        return;
    }
    
    const columnOptions = columns.map(col => `<option value="${col}">${col}</option>`).join('');
    
    createFormPopup(
        'Convert Data Types',
        `
        <div class="form-group">
            <label for="column">Select Column:</label>
            <select id="column" name="column" class="form-control" required>
                ${columnOptions}
            </select>
        </div>
        
        <div class="form-group">
            <label>Target Data Type:</label>
            <div class="checkbox-group">
                <div class="checkbox-item">
                    <label>
                        <input type="radio" name="target_type" value="text" checked>
                        Text (String)
                    </label>
                </div>
                <div class="checkbox-item">
                    <label>
                        <input type="radio" name="target_type" value="number">
                        Number (Numeric)
                    </label>
                </div>
                <div class="checkbox-item">
                    <label>
                        <input type="radio" name="target_type" value="date">
                        Date/Timestamp
                    </label>
                </div>
                <div class="checkbox-item">
                    <label>
                        <input type="radio" name="target_type" value="boolean">
                        Boolean (True/False)
                    </label>
                </div>
            </div>
        </div>
        
        <div class="form-group">
            <label>
                <input type="checkbox" name="strict_conversion">
                Strict conversion (fail if any values can't be converted)
            </label>
        </div>
        `,
        async (data) => {
            try {
                const response = await fetch(`${API_URL}/convert_types`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        column: data.column,
                        target_type: data.target_type,
                        strict: data.strict_conversion
                    })
                });
                if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
                const result = await response.json();
                handleApiResponse(result, `Converted '${data.column}' to type '${data.target_type}'.`);
            } catch (error) {
                console.error('Error converting types:', error);
                alert(`Failed to convert types: ${error.message}`);
            }
        }
    );
}

async function handleCleanText() {
    const columns = dataFiles[currentFileIndex]?.data?.headers || [];
    
    if (columns.length === 0) {
        alert('No columns available in the current dataset.');
        return;
    }
    
    const columnOptions = columns.map(col => `<option value="${col}">${col}</option>`).join('');
    
    createFormPopup(
        'Clean Text Data',
        `
        <div class="form-group">
            <label for="column">Select Text Column:</label>
            <select id="column" name="column" class="form-control" required>
                ${columnOptions}
            </select>
        </div>
        
        <div class="form-group">
            <label>Cleaning Operations:</label>
            <div class="checkbox-group">
                <div class="checkbox-item">
                    <label>
                        <input type="checkbox" name="trim" checked>
                        Trim leading/trailing whitespace
                    </label>
                </div>
                <div class="checkbox-item">
                    <label>
                        <input type="checkbox" name="lowercase">
                        Convert to lowercase
                    </label>
                </div>
                <div class="checkbox-item">
                    <label>
                        <input type="checkbox" name="uppercase">
                        Convert to uppercase
                    </label>
                </div>
                <div class="checkbox-item">
                    <label>
                        <input type="checkbox" name="remove_punctuation">
                        Remove punctuation
                    </label>
                </div>
                <div class="checkbox-item">
                    <label>
                        <input type="checkbox" name="remove_digits">
                        Remove digits (0-9)
                    </label>
                </div>
                <div class="checkbox-item">
                    <label>
                        <input type="checkbox" name="remove_extra_spaces">
                        Remove extra spaces
                    </label>
                </div>
            </div>
        </div>
        `,
        async (data) => {
            const operations = [];
            if (data.trim) operations.push('trim');
            if (data.lowercase) operations.push('lowercase');
            if (data.uppercase) operations.push('uppercase');
            if (data.remove_punctuation) operations.push('remove_punctuation');
            if (data.remove_digits) operations.push('remove_digits');
            if (data.remove_extra_spaces) operations.push('remove_extra_spaces');
            
            if (operations.length === 0) {
                alert('No cleaning operations selected.');
                return;
            }
            
            try {
                const response = await fetch(`${API_URL}/clean_text`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        column: data.column,
                        operations: operations,
                        file_index: currentFileIndex
                    })
                });
                
                const result = await response.json();
                
                if (!response.ok) {
                    throw new Error(result.error || `Server responded with status: ${response.status}`);
                }
                
                if (result.error) {
                    throw new Error(result.error);
                }
                
                handleApiResponse(result, `Cleaned text in '${data.column}' using: ${operations.join(', ')}.`);
            } catch (error) {
                console.error('Error cleaning text:', error);
                alert(`Failed to clean text: ${error.message}`);
            }
        }
    );
}

async function handleNormalizeData() {
    const columns = dataFiles[currentFileIndex]?.data?.headers || [];
    
    if (columns.length === 0) {
        alert('No columns available in the current dataset.');
        return;
    }
    
    const columnOptions = columns.map(col => `<option value="${col}">${col}</option>`).join('');
    
    createFormPopup(
        'Normalize Data (Min-Max Scaling)',
        `
        <div class="form-group">
            <label for="column">Select Numeric Column:</label>
            <select id="column" name="column" class="form-control" required>
                ${columnOptions}
            </select>
        </div>
        
        <div class="form-group">
            <p>Normalization will scale values to the range [0, 1] using min-max scaling:</p>
            <p><code>normalized_value = (value - min) / (max - min)</code></p>
        </div>
        
        <div class="form-group">
            <label>
                <input type="checkbox" name="preserve_original" checked>
                Keep original column (will create a new column with "_normalized" suffix)
            </label>
        </div>
        `,
        async (data) => {
            try {
                const response = await fetch(`${API_URL}/normalize_data`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        column: data.column,
                        preserve_original: data.preserve_original
                    })
                });
                if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
                const result = await response.json();
                
                const min = result.details?.min?.toFixed(2) ?? 'N/A';
                const max = result.details?.max?.toFixed(2) ?? 'N/A';
                const newColName = result.new_column ? ` as '${result.new_column}'` : '';
                
                handleApiResponse(
                    result, 
                    `Normalized '${data.column}'${newColName} (Min: ${min}, Max: ${max}).`
                );
            } catch (error) {
                console.error('Error normalizing data:', error);
                alert(`Failed to normalize data: ${error.message}`);
            }
        }
    );
}

async function handleStandardizeData() {
    const columns = dataFiles[currentFileIndex]?.data?.headers || [];
    
    if (columns.length === 0) {
        alert('No columns available in the current dataset.');
        return;
    }
    
    const columnOptions = columns.map(col => `<option value="${col}">${col}</option>`).join('');
    
    createFormPopup(
        'Standardize Data (Z-Score)',
        `
        <div class="form-group">
            <label for="column">Select Numeric Column:</label>
            <select id="column" name="column" class="form-control" required>
                ${columnOptions}
            </select>
        </div>
        
        <div class="form-group">
            <p>Standardization will transform values to have mean=0 and standard deviation=1:</p>
            <p><code>standardized_value = (value - mean) / std_dev</code></p>
        </div>
        
        <div class="form-group">
            <label>
                <input type="checkbox" name="preserve_original" checked>
                Keep original column (will create a new column with "_standardized" suffix)
            </label>
        </div>
        `,
        async (data) => {
            try {
                const response = await fetch(`${API_URL}/standardize_data`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        column: data.column,
                        preserve_original: data.preserve_original
                    })
                });
                if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
                const result = await response.json();
                
                const mean = result.details?.mean?.toFixed(2) ?? 'N/A';
                const stdDev = result.details?.std_dev?.toFixed(2) ?? 'N/A';
                const newColName = result.new_column ? ` as '${result.new_column}'` : '';
                
                handleApiResponse(
                    result, 
                    `Standardized '${data.column}'${newColName} (Mean: ${mean}, Std Dev: ${stdDev}).`
                );
            } catch (error) {
                console.error('Error standardizing data:', error);
                alert(`Failed to standardize data: ${error.message}`);
            }
        }
    );
}

async function handleResetChanges() {
    createFormPopup(
        'Reset Changes',
        `
        <div class="form-group">
            <p>Are you sure you want to reset all changes for this file to its original state?</p>
            <p><strong>Warning:</strong> This action cannot be undone.</p>
        </div>
        `,
        async () => {
            try {
                // Show loading state
                const loadingIndicator = document.createElement('div');
                loadingIndicator.className = 'loading-indicator';
                loadingIndicator.textContent = 'Resetting changes...';
                document.body.appendChild(loadingIndicator);

                const response = await fetch(`${API_URL}/reset_changes`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                });

                // Remove loading indicator
                document.body.removeChild(loadingIndicator);

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: 'Unknown error occurred' }));
                    throw new Error(errorData.error || `Server responded with status: ${response.status}`);
                }

                const result = await response.json();
                if (result.error) {
                    throw new Error(result.error);
                }

                handleApiResponse(result, 'Successfully reset all changes to the original state.');
            } catch (error) {
                console.error('Error resetting changes:', error);
                alert(`Failed to reset changes: ${error.message}`);
            }
        }
    );
}

async function handleDetectOutliers() {
    const columns = dataFiles[currentFileIndex]?.data?.headers || [];
    
    if (columns.length === 0) {
        alert('No columns available in the current dataset.');
        return;
    }
    
    const columnOptions = columns.map(col => `<option value="${col}">${col}</option>`).join('');
    
    createFormPopup(
        'Detect Outliers',
        `
        <div class="form-group">
            <label for="column">Select Numeric Column:</label>
            <select id="column" name="column" class="form-control" required>
                ${columnOptions}
            </select>
        </div>
        
        <div class="form-group">
            <label>Detection Method:</label>
            <div class="checkbox-group">
                <div class="checkbox-item">
                    <label>
                        <input type="radio" name="method" value="zscore" checked>
                        Z-Score (default threshold: 3)
                    </label>
                </div>
                <div class="checkbox-item">
                    <label>
                        <input type="radio" name="method" value="iqr">
                        IQR (Interquartile Range)
                    </label>
                </div>
            </div>
        </div>
        
        <div class="form-group">
            <label for="threshold">Threshold (for Z-Score only):</label>
            <input type="number" name="threshold" class="form-control" value="3.0" step="0.1" min="1">
        </div>
        `,
        async (data) => {
            try {
                const response = await fetch(`${API_URL}/detect_outliers`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        column: data.column,
                        method: data.method,
                        threshold: parseFloat(data.threshold)
                    })
                });
                if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
                const result = await response.json();
                
                if (result.error) {
                    alert(`Error: ${result.error}`);
                    return;
                }
                
                if (result.outlier_count === 0) {
                    alert(`No outliers detected in column '${data.column}' using ${data.method}.`);
                    return;
                }
                
                // Show detailed results
                let details = '';
                if (data.method === 'zscore') {
                    details = `Mean: ${result.details.mean?.toFixed(2) || 'N/A'}, ` +
                             `Std Dev: ${result.details.std_dev?.toFixed(2) || 'N/A'}, ` +
                             `Threshold: ${result.threshold}`;
                } else { // iqr
                    details = `Q1: ${result.details.q1?.toFixed(2) || 'N/A'}, ` +
                             `Q3: ${result.details.q3?.toFixed(2) || 'N/A'}, ` +
                             `IQR: ${result.details.iqr?.toFixed(2) || 'N/A'}, ` +
                             `Range: [${result.details.lower_bound?.toFixed(2) || 'N/A'}, ` +
                             `${result.details.upper_bound?.toFixed(2) || 'N/A'}]`;
                }
                
                createPopup(
                    'Outlier Detection Results',
                    `
                    <p>Detected ${result.outlier_count} outliers in column '${data.column}' using ${data.method}.</p>
                    <p><strong>Details:</strong> ${details}</p>
                    <p>Would you like to handle these outliers now?</p>
                    `,
                    [
                        {
                            text: 'Cancel',
                            primary: false,
                            action: () => {}
                        },
                        {
                            text: 'Handle Outliers',
                            primary: true,
                            action: () => {
                                // Store detection results for handling
                                sessionStorage.setItem('lastOutlierDetection', JSON.stringify({
                                    column: data.column,
                                    method: data.method,
                                    threshold: data.threshold,
                                    count: result.outlier_count
                                }));
                                // Trigger the handle outliers popup
                                handleOutliers();
                            }
                        }
                    ]
                );
            } catch (error) {
                console.error('Error detecting outliers:', error);
                alert(`Failed to detect outliers: ${error.message}`);
            }
        }
    );
}

async function handleOutliers() {
    // Get last detection results if available
    const lastDetection = sessionStorage.getItem('lastOutlierDetection');
    let defaultColumn = '';
    let defaultMethod = 'iqr';
    
    if (lastDetection) {
        try {
            const detection = JSON.parse(lastDetection);
            defaultColumn = detection.column;
            defaultMethod = detection.method;
        } catch (e) {
            console.error('Error parsing last outlier detection:', e);
        }
    }
    
    const columns = dataFiles[currentFileIndex]?.data?.headers || [];
    
    if (columns.length === 0) {
        alert('No columns available in the current dataset.');
        return;
    }
    
    const columnOptions = columns.map(col => 
        `<option value="${col}" ${col === defaultColumn ? 'selected' : ''}>${col}</option>`
    ).join('');
    
    createFormPopup(
        'Handle Outliers',
        `
        <div class="form-group">
            <label for="column">Select Numeric Column:</label>
            <select id="column" name="column" class="form-control" required>
                ${columnOptions}
            </select>
        </div>
        
        <div class="form-group">
            <label>Handling Method:</label>
            <div class="checkbox-group">
                <div class="checkbox-item">
                    <label>
                        <input type="radio" name="handling_method" value="clip" checked>
                        Clip to bounds (replace with min/max valid values)
                    </label>
                </div>
                <div class="checkbox-item">
                    <label>
                        <input type="radio" name="handling_method" value="remove">
                        Remove rows with outliers
                    </label>
                </div>
                <div class="checkbox-item">
                    <label>
                        <input type="radio" name="handling_method" value="mean">
                        Replace with mean
                    </label>
                </div>
                <div class="checkbox-item">
                    <label>
                        <input type="radio" name="handling_method" value="median">
                        Replace with median
                    </label>
                </div>
            </div>
        </div>
        
        <div class="form-group">
            <label>Detection Method:</label>
            <div class="checkbox-group">
                <div class="checkbox-item">
                    <label>
                        <input type="radio" name="detection_method" value="zscore" ${defaultMethod === 'zscore' ? 'checked' : ''}>
                        Z-Score (default threshold: 3)
                    </label>
                </div>
                <div class="checkbox-item">
                    <label>
                        <input type="radio" name="detection_method" value="iqr" ${defaultMethod === 'iqr' ? 'checked' : ''}>
                        IQR (Interquartile Range)
                    </label>
                </div>
            </div>
        </div>
        
        <div class="form-group">
            <label for="threshold">Threshold (for Z-Score only):</label>
            <input type="number" name="threshold" class="form-control" value="3.0" step="0.1" min="1">
        </div>
        `,
        async (data) => {
            try {
                const response = await fetch(`${API_URL}/handle_outliers`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        column: data.column,
                        method: data.handling_method,
                        detection_method: data.detection_method,
                        threshold: parseFloat(data.threshold)
                    })
                });
                if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
                const result = await response.json();
                
                if (result.error) {
                    alert(`Error: ${result.error}`);
                    return;
                }
                
                let message = `Handled ${result.outlier_count} outliers in '${data.column}' ` +
                             `using ${data.handling_method} method.`;
                
                if (result.details) {
                    if (data.detection_method === 'zscore') {
                        message += `\nZ-Score details: Mean=${result.details.mean?.toFixed(2) || 'N/A'}, ` +
                                  `Std Dev=${result.details.std_dev?.toFixed(2) || 'N/A'}`;
                    } else {
                        message += `\nIQR details: Q1=${result.details.q1?.toFixed(2) || 'N/A'}, ` +
                                  `Q3=${result.details.q3?.toFixed(2) || 'N/A'}, ` +
                                  `IQR=${result.details.iqr?.toFixed(2) || 'N/A'}`;
                    }
                }
                
                handleApiResponse(result, message);
            } catch (error) {
                console.error('Error handling outliers:', error);
                alert(`Failed to handle outliers: ${error.message}`);
            }
        }
    );
}

async function handleAddDerivedColumn() {
    const columns = dataFiles[currentFileIndex]?.data?.headers || [];
    
    if (columns.length === 0) {
        alert('No columns available in the current dataset.');
        return;
    }
    
    const columnOptions = columns.map(col => `<option value="${col}">${col}</option>`).join('');
    
    createFormPopup(
        'Add Derived Column',
        `
        <div class="form-group">
            <label>Operation:</label>
            <select name="operation" class="form-control" required>
                <option value="sum">Sum</option>
                <option value="mean">Mean (Average)</option>
                <option value="median">Median</option>
                <option value="mode">Mode (Most Frequent)</option>
                <option value="product">Product (Multiply)</option>
                <option value="difference">Difference (Subtract)</option>
            </select>
        </div>
        
        <div class="formm-control">
            <label>Select Columns:</label>
            <select name="columns" multiple class="formm-control" size="5" required>
                ${columnOptions}
            </select>
            <small class="form-text text-muted">Hold Ctrl/Cmd to select multiple columns</small>
        </div>
        
        <div class="form-group">
            <label for="new_column_name">New Column Name:</label>
            <input type="text" name="new_column_name" class="form-control" placeholder="Leave blank for auto-generated name">
        </div>
        `,
        async (data) => {
            try {
                // Get the form element
                const form = document.querySelector('.popup-content form');
                // Get the selected options from the multiple select
                const selectedOptions = Array.from(form.querySelector('select[name="columns"]').selectedOptions)
                    .map(option => option.value);
                
                if (selectedOptions.length === 0) {
                    alert('Please select at least one column.');
                    return;
                }
                
                const response = await fetch(`${API_URL}/add_derived_column`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        operation: data.operation,
                        columns: selectedOptions,
                        new_column_name: data.new_column_name || undefined
                    })
                });
                if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
                const result = await response.json();
                
                if (result.error) {
                    alert(`Error: ${result.error}`);
                    return;
                }
                
                handleApiResponse(
                    result, 
                    `Added new column '${result.new_column}' as ${result.operation} of ` +
                    `${result.source_columns.join(', ')}.`
                );
            } catch (error) {
                console.error('Error adding derived column:', error);
                alert(`Failed to add derived column: ${error.message}`);
            }
        }
    );
}

async function handleInconsistentData() {
    const columns = dataFiles[currentFileIndex]?.data?.headers || [];
    
    if (columns.length === 0) {
        alert('No columns available in the current dataset.');
        return;
    }
    
    const columnOptions = columns.map(col => `<option value="${col}">${col}</option>`).join('');
    
    createFormPopup(
        'Handle Inconsistent Data',
        `
        <div class="form-group">
            <label for="column">Select Column:</label>
            <select id="column" name="column" class="form-control" required>
                ${columnOptions}
            </select>
        </div>
        
        <div class="form-group">
            <label>
                <input type="checkbox" name="case_sensitive">
                Case-sensitive matching
            </label>
        </div>
        
        <div class="form-group">
            <label>Custom Mappings (optional):</label>
            <div id="mapping-container">
                <div class="mapping-row">
                    <input type="text" name="from_value[]" placeholder="Original value" class="form-control mapping-input">
                    <span>→</span>
                    <input type="text" name="to_value[]" placeholder="Standardized value" class="form-control mapping-input">
                    <button type="button" class="remove-mapping-btn">×</button>
                </div>
            </div>
            <button type="button" id="add-mapping-btn" class="btn btn-secondary">Add Another Mapping</button>
            <small class="form-text text-muted">Leave empty to attempt automatic standardization</small>
        </div>
        `,
        async (data) => {
            try {
                // Process mapping data
                let mapping = {};
                if (data['from_value[]'] && data['to_value[]']) {
                    const fromValues = Array.isArray(data['from_value[]']) ? data['from_value[]'] : [data['from_value[]']];
                    const toValues = Array.isArray(data['to_value[]']) ? data['to_value[]'] : [data['to_value[]']];
                    
                    for (let i = 0; i < fromValues.length; i++) {
                        if (fromValues[i] && toValues[i]) {
                            mapping[fromValues[i]] = toValues[i];
                        }
                    }
                }
                
                const response = await fetch(`${API_URL}/handle_inconsistent_data`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        column: data.column,
                        mapping: Object.keys(mapping).length > 0 ? mapping : undefined,
                        case_sensitive: data.case_sensitive
                    })
                });
                if (!response.ok) throw new Error(`Server responded with status: ${response.status}`);
                const result = await response.json();
                
                if (result.error) {
                    alert(`Error: ${result.error}`);
                    return;
                }
                
                let message = `Standardized values in column '${data.column}'.`;
                if (result.mapping_applied) {
                    message += "\nApplied custom mappings.";
                } else {
                    message += "\nPerformed automatic standardization.";
                }
                
                handleApiResponse(result, message);
            } catch (error) {
                console.error('Error handling inconsistent data:', error);
                alert(`Failed to standardize data: ${error.message}`);
            }
        }
    );
    
    // Add dynamic mapping rows
    document.getElementById('add-mapping-btn').addEventListener('click', () => {
        const container = document.getElementById('mapping-container');
        const newRow = document.createElement('div');
        newRow.className = 'mapping-row';
        newRow.innerHTML = `
            <input type="text" name="from_value[]" placeholder="Original value" class="form-control mapping-input">
            <span>→</span>
            <input type="text" name="to_value[]" placeholder="Standardized value" class="form-control mapping-input">
            <button type="button" class="remove-mapping-btn">×</button>
        `;
        container.appendChild(newRow);
        
        // Add remove functionality
        newRow.querySelector('.remove-mapping-btn').addEventListener('click', () => {
            container.removeChild(newRow);
        });
    });
}