// Data state
let dataFiles = [];
let currentFileIndex = 0;
let currentPage = 1;
let rowsPerPage = 10;

// DOM elements
const fileSelect = document.getElementById('file-select');
const dataTable = document.getElementById('data-table');
const fileInfo = document.getElementById('file-info');
const basicStats = document.getElementById('basic-stats');
const columnTypes = document.getElementById('column-types');
const dataQuality = document.getElementById('data-quality');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageInfo = document.getElementById('page-info');
const continueBtn = document.getElementById('continue-to-cleaning');

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
});

// Load data from session storage
function loadData() {
    const storedData = sessionStorage.getItem('dataFiles');
    
    if (!storedData) {
        // No data found, redirect back to upload page
        window.location.href = 'upload.html';
        return;
    }
    
    try {
        dataFiles = JSON.parse(storedData);
        
        if (dataFiles.length === 0) {
            window.location.href = 'upload.html';
            return;
        }
        
        // Populate file selector
        populateFileSelector();
        
        // Display the first file
        displayFileData(0);
    } catch (error) {
        console.error('Error loading data:', error);
        window.location.href = 'upload.html';
    }
}

// Setup event listeners
function setupEventListeners() {
    // File selector change
    fileSelect.addEventListener('change', (e) => {
        currentFileIndex = parseInt(e.target.value);
        currentPage = 1; // Reset to first page
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
    
    // Continue to data cleaning
    continueBtn.addEventListener('click', () => {
        // Store selected data file index
        sessionStorage.setItem('currentFileIndex', currentFileIndex);
        
        // Redirect to data cleaning page
        window.location.href = 'data_cleaning.html';
    });
}

// Populate file selector dropdown
function populateFileSelector() {
    fileSelect.innerHTML = '';
    
    dataFiles.forEach((file, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = file.name;
        fileSelect.appendChild(option);
    });
}

// Display file data
function displayFileData(fileIndex) {
    const file = dataFiles[fileIndex];
    
    // Display table data
    displayTableData(fileIndex);
    
    // Generate and display summary
    displaySummary(file);
}

// Display table data with pagination
function displayTableData(fileIndex) {
    const file = dataFiles[fileIndex];
    const { headers, rows } = file.data;
    
    // Clear table
    dataTable.innerHTML = '';
    
    // Create table header
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    
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
    
    for (let i = startIndex; i < endIndex; i++) {
        const row = rows[i];
        const tr = document.createElement('tr');
        
        headers.forEach(header => {
            const td = document.createElement('td');
            td.textContent = row[header] || '';
            tr.appendChild(td);
        });
        
        tbody.appendChild(tr);
    }
    
    dataTable.appendChild(tbody);
    
    // Update pagination info
    const totalPages = Math.ceil(rows.length / rowsPerPage);
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    
    // Update pagination buttons
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
}

// Display data summary
function displaySummary(file) {
    // File information
    displayFileInfo(file);
    
    // Basic statistics
    displayBasicStats(file);
    
    // Column types
    displayColumnTypes(file);
    
    // Data quality
    displayDataQuality(file);
}

// Display file information
function displayFileInfo(file) {
    const { name, type, data } = file;
    
    fileInfo.innerHTML = `
        <div class="info-item">
            <span class="info-label">File Name:</span>
            <span class="info-value">${name}</span>
        </div>
        <div class="info-item">
            <span class="info-label">File Type:</span>
            <span class="info-value">${type.toUpperCase()}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Columns:</span>
            <span class="info-value">${data.headers.length}</span>
        </div>
        <div class="info-item">
            <span class="info-label">Rows:</span>
            <span class="info-value">${data.rows.length}</span>
        </div>
    `;
}

// Display basic statistics
function displayBasicStats(file) {
    const { headers, rows } = file.data;
    
    // Initialize stats HTML
    let statsHTML = '';
    
    // Loop through numeric columns and calculate stats
    headers.forEach(header => {
        // Check if column is numeric
        const numericValues = rows
            .map(row => row[header])
            .filter(value => !isNaN(parseFloat(value)) && value !== '');
        
        if (numericValues.length > 0) {
            // Calculate stats
            const min = Math.min(...numericValues.map(val => parseFloat(val))).toFixed(2);
            const max = Math.max(...numericValues.map(val => parseFloat(val))).toFixed(2);
            const sum = numericValues.reduce((acc, val) => acc + parseFloat(val), 0);
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
                </div>
            `;
        }
    });
    
    // If no numeric columns found
    if (statsHTML === '') {
        statsHTML = '<p>No numeric columns found for statistical analysis.</p>';
    }
    
    basicStats.innerHTML = statsHTML;
}

// Display column types
function displayColumnTypes(file) {
    const { headers, rows } = file.data;
    
    let typesHTML = '';
    
    headers.forEach(header => {
        // Determine column type by checking values
        const values = rows.map(row => row[header]).filter(val => val !== '');
        let type = 'Text';
        
        if (values.length > 0) {
            // Check if numeric
            const numericCount = values.filter(val => !isNaN(parseFloat(val))).length;
            const numericRatio = numericCount / values.length;
            
            // Check if date
            const dateRegex = /^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}$/;
            const dateCount = values.filter(val => dateRegex.test(val)).length;
            const dateRatio = dateCount / values.length;
            
            if (numericRatio > 0.9) {
                type = 'Numeric';
            } else if (dateRatio > 0.9) {
                type = 'Date';
            }
        }
        
        typesHTML += `
            <div class="type-item">
                <span class="type-label">${header}:</span>
                <span class="type-value">${type}</span>
            </div>
        `;
    });
    
    columnTypes.innerHTML = typesHTML;
}

// Display data quality information
function displayDataQuality(file) {
    const { headers, rows } = file.data;
    
    let qualityHTML = '';
    
    headers.forEach(header => {
        // Count missing values
        const missingCount = rows.filter(row => row[header] === '' || row[header] === undefined).length;
        const missingPercentage = ((missingCount / rows.length) * 100).toFixed(1);
        
        // Count duplicate values
        const valueCount = {};
        rows.forEach(row => {
            const value = row[header];
            if (value) {
                valueCount[value] = (valueCount[value] || 0) + 1;
            }
        });
        
        const duplicateCount = Object.values(valueCount).filter(count => count > 1).reduce((acc, count) => acc + count - 1, 0);
        const duplicatePercentage = ((duplicateCount / rows.length) * 100).toFixed(1);
        
        qualityHTML += `
            <div class="quality-item">
                <h4>${header}</h4>
                <div class="quality-details">
                    <div class="quality-row">
                        <span class="quality-label">Missing Values:</span>
                        <span class="quality-value">${missingCount} (${missingPercentage}%)</span>
                    </div>
                    <div class="quality-row">
                        <span class="quality-label">Duplicate Values:</span>
                        <span class="quality-value">${duplicateCount} (${duplicatePercentage}%)</span>
                    </div>
                </div>
            </div>
        `;
    });
    
    dataQuality.innerHTML = qualityHTML;
}