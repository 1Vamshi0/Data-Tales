// Data state (Modified)
let currentFileData = null; // Stores data for the single loaded file { name, type, data: { headers, rows } }
let currentPage = 1;
let rowsPerPage = 10; // Keep this reasonably small for frontend performance

// DOM elements (Removed fileSelect)
const dataTable = document.getElementById('data-table');
const fileInfo = document.getElementById('file-info');
const basicStats = document.getElementById('basic-stats');
const columnTypes = document.getElementById('column-types');
const dataQuality = document.getElementById('data-quality');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageInfo = document.getElementById('page-info');
const continueBtn = document.getElementById('continue-to-cleaning');
const panelHeaderFileName = document.querySelector('.data-view-panel .panel-header h2'); // To display filename

// API Endpoint
const API_URL = 'http://localhost:5000'; // Ensure this matches your Flask server

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    loadDataFromServer(); // Call the new load function
    setupEventListeners();
});

// NEW: Load data from the server
async function loadDataFromServer() {
    console.log("Attempting to load data from server...");
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
            throw new Error(errorMsg); // Throw error to be caught below
        }

        currentFileData = await response.json();

        if (!currentFileData || !currentFileData.data || !Array.isArray(currentFileData.data.headers) || !Array.isArray(currentFileData.data.rows)) {
            throw new Error("Invalid data structure received from server.");
        }

        console.log(`Data loaded from server for: ${currentFileData.name}`);
        currentPage = 1; // Reset page on load
        displayFileData(); // Call display function (which now uses currentFileData)

    } catch (error) {
        console.error('Error loading data from server:', error);
        dataTable.innerHTML = `<thead><tr><th>Error</th></tr></thead><tbody><tr><td>${error.message}</td></tr></tbody>`;
        disablePaginationAndContinue();
        if(panelHeaderFileName) panelHeaderFileName.textContent = "Data Preview - Error";
        if(fileInfo) fileInfo.innerHTML = `<p style="color: red;">Could not load data.</p>`;
        if(basicStats) basicStats.innerHTML = '';
        if(columnTypes) columnTypes.innerHTML = '';
        if(dataQuality) dataQuality.innerHTML = '';
    }
}

// Setup event listeners (Removed fileSelect listener)
function setupEventListeners() {
    // Pagination
    prevPageBtn?.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            displayTableData(); // Re-render table for the new page
        }
    });

    nextPageBtn?.addEventListener('click', () => {
        if (!currentFileData || !currentFileData.data) return;
        const totalPages = Math.ceil(currentFileData.data.rows.length / rowsPerPage);
        if (currentPage < totalPages) {
            currentPage++;
            displayTableData(); // Re-render table for the new page
        }
    });

    // Continue to data cleaning
    continueBtn?.addEventListener('click', () => {
        // No need to save dataFiles to sessionStorage anymore
        // Server holds the state. Just navigate.
        window.location.href = 'data_cleaning.html';
    });
}

// Helper to disable buttons if loading fails
function disablePaginationAndContinue() {
     if(prevPageBtn) prevPageBtn.disabled = true;
     if(nextPageBtn) nextPageBtn.disabled = true;
     if(pageInfo) pageInfo.textContent = 'Page 0 of 0 (0 rows)';
     if(continueBtn) continueBtn.disabled = true;
}

// Display file data (uses global currentFileData)
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
     
    displayTableData();
    displaySummary(currentFileData);
    if(continueBtn) continueBtn.disabled = false; // Enable continue button on successful load
}

// Display table data with pagination (uses global currentFileData)
function displayTableData() {
    if (!currentFileData || !currentFileData.data || !dataTable || !pageInfo || !prevPageBtn || !nextPageBtn ) return; // Add checks for elements

    const { headers, rows } = currentFileData.data;

    // Clear table
    dataTable.innerHTML = '';

    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
    // Add index column header
    const indexTh = document.createElement('th');
    indexTh.textContent = '#'; // Row number column
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
        td.colSpan = headers.length + 1; // +1 for index column
        td.textContent = 'No data available in this file.';
        td.style.textAlign = 'center';
        tr.appendChild(td);
        tbody.appendChild(tr);
    } else {
        for (let i = startIndex; i < endIndex; i++) {
            const row = rows[i];
            const tr = document.createElement('tr');

            // Add index column cell (1-based index)
            const indexTd = document.createElement('td');
            indexTd.textContent = i + 1;
            indexTd.style.fontWeight = 'bold';
            tr.appendChild(indexTd);

            headers.forEach(header => {
                const td = document.createElement('td');
                // Handle null/undefined gracefully
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

    // Update pagination buttons state
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages || totalRows === 0;
}


// --- Summary Display Functions (Largely unchanged, but use the passed file object) ---

function displaySummary(file) {
    if (!file) return;
    // File information
    displayFileInfo(file);
    // Basic statistics
    displayBasicStats(file);
    // Column types
    displayColumnTypes(file);
    // Data quality
    displayDataQuality(file);
}

function displayFileInfo(file) {
    if (!fileInfo || !file.data) return;
    const { name, type, data } = file;
    const headers = data.headers || [];
    const rows = data.rows || [];

    fileInfo.innerHTML = `
        <div class="info-item">
            <span class="info-label">File Name:</span>
            <span class="info-value">${name || 'N/A'}</span>
        </div>
        <div class="info-item">
            <span class="info-label">File Type:</span>
            <span class="info-value">${type ? type.toUpperCase() : 'N/A'}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Columns:</span>
            <span class="info-value">${headers.length}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Rows:</span>
            <span class="info-value">${rows.length}</span>
        </div>
    `;
}

function displayBasicStats(file) {
     if (!basicStats || !file.data) return;
    const { headers, rows } = file.data;
    if (!headers || !rows) return;

    let statsHTML = '';
    let numericColsFound = 0;

    headers.forEach(header => {
        const numericValues = rows
            .map(row => row[header])
            .map(value => (value === null || value === undefined || value === '') ? NaN : parseFloat(value)) // Convert blanks/nulls explicitly
            .filter(value => !isNaN(value)); // Filter out non-numbers

        if (numericValues.length > 0) {
            numericColsFound++;
            const min = Math.min(...numericValues).toFixed(2);
            const max = Math.max(...numericValues).toFixed(2);
            const sum = numericValues.reduce((acc, val) => acc + val, 0);
            const avg = (sum / numericValues.length).toFixed(2);

            statsHTML += `
                <div class="stat-item">
                    <h4>${header}</h4>
                    <div class="stat-details">
                        <div class="stat-row">
                            <span class="stat-label">Min:</span>
                            <span class="stat-value">${min}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Max:</span>
                            <span class="stat-value">${max}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Average:</span>
                            <span class="stat-value">${avg}</span>
                        </div>
                    </div>
                </div>`;
        }
    });

    if (numericColsFound === 0) {
        statsHTML = '<p>No numeric columns found for statistical analysis.</p>';
    }
    basicStats.innerHTML = statsHTML;
}

function displayColumnTypes(file) {
     if (!columnTypes || !file.data) return;
    const { headers, rows } = file.data;
     if (!headers || !rows) return;

    let typesHTML = '';
    headers.forEach(header => {
        const values = rows.map(row => row[header]).filter(val => val !== '' && val !== null && val !== undefined);
        let type = 'Text'; // Default

        if (values.length > 0) {
            // Simple type inference (can be improved)
            const numericCount = values.filter(val => !isNaN(parseFloat(val))).length;
            const dateCount = values.filter(val => typeof val === 'string' && !isNaN(Date.parse(val))).length; // Basic date check
            const booleanCount = values.filter(val => typeof val === 'boolean' || (typeof val === 'string' && ['true', 'false'].includes(val.toLowerCase()))).length;

            if (numericCount / values.length > 0.9) type = 'Numeric';
            else if (dateCount / values.length > 0.8) type = 'Date'; // Higher threshold for dates maybe
            else if (booleanCount / values.length > 0.9) type = 'Boolean';
        } else {
            type = 'Empty/Mixed'; // If all values are empty/null
        }

        typesHTML += `
            <div class="type-item">
                <span class="type-label">${header}:</span>
                <span class="type-value">${type}</span>
            </div>`;
    });
    columnTypes.innerHTML = typesHTML;
}

function displayDataQuality(file) {
     if (!dataQuality || !file.data) return;
    const { headers, rows } = file.data;
    if (!headers || !rows || rows.length === 0) {
         dataQuality.innerHTML = '<p>Not enough data for quality analysis.</p>';
         return;
    }

    let qualityHTML = '';
    headers.forEach(header => {
        const totalRows = rows.length;
        let missingCount = 0;
        const valueCounts = {};
        let duplicateCount = 0;

        rows.forEach(row => {
            const value = row[header];
            if (value === '' || value === null || value === undefined) {
                missingCount++;
            } else {
                 // Count duplicates (case-sensitive for simplicity here)
                 const valStr = String(value); // Convert to string for keying
                 valueCounts[valStr] = (valueCounts[valStr] || 0) + 1;
            }
        });
        
         // Calculate duplicates based on counts > 1
         Object.values(valueCounts).forEach(count => {
            if (count > 1) {
                duplicateCount += (count - 1); // Count excess occurrences
            }
         });

        const missingPercentage = ((missingCount / totalRows) * 100).toFixed(1);
        // Duplicate percentage based on *non-missing* rows might be more insightful
        // const nonMissingRows = totalRows - missingCount;
        // const duplicatePercentage = nonMissingRows > 0 ? ((duplicateCount / nonMissingRows) * 100).toFixed(1) : '0.0';
        // Let's stick to percentage of total rows for simplicity now
        const duplicatePercentage = ((duplicateCount / totalRows) * 100).toFixed(1);

        qualityHTML += `
            <div class="quality-item">
                <h4>${header}</h4>
                <div class="quality-details">
                    <div class="quality-row">
                        <span class="quality-label">Missing:</span>
                        <span class="quality-value">${missingCount} (${missingPercentage}%)</span>
                    </div>
                    <div class="quality-row">
                        <span class="quality-label">Duplicates:</span>
                        <span class="quality-value">${duplicateCount} (${duplicatePercentage}%)</span>
                    </div>
                </div>
            </div>`;
    });
    dataQuality.innerHTML = qualityHTML;
}