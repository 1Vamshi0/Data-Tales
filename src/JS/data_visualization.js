// Data state (Modified)
let currentFileData = null; // Stores data for the single loaded file { name, type, data: { headers, rows } }
let chartInstances = {}; // Use an object to store multiple chart instances { chartId: instance }
let nextChartId = 0; // Counter for unique chart IDs

// API endpoint (Ensure this matches your Flask server address)
const API_URL = 'http://localhost:5000';

// DOM elements (Removed fileSelect)
const xAxisSelect = document.getElementById('column-select-x');
const yAxisSelect = document.getElementById('column-select-y');
const chartTypeSelect = document.getElementById('chart-type-select');
const chartSizeSelect = document.getElementById('chart-size');
const createChartBtn = document.getElementById('create-chart-btn');
const autoDashboardBtn = document.getElementById('auto-dashboard-btn');
const goToStorytellingBtn = document.getElementById('go-to-storytelling-btn');
const dashboardContainer = document.getElementById('dashboard-container');
const dashboardPlaceholder = document.getElementById('dashboard-placeholder');
const sidebar = document.querySelector('.visualization-controls-panel');
const collapseBtn = document.querySelector('.collapse-btn');
const collapseIcon = collapseBtn ? collapseBtn.querySelector('.collapse-icon') : null;
const dashboardTitle = document.getElementById('dashboard-title'); // To show filename

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    // Check if essential elements exist
    if (!xAxisSelect || !yAxisSelect || !chartTypeSelect || !createChartBtn || !autoDashboardBtn || !dashboardContainer || !collapseBtn || !goToStorytellingBtn || !dashboardTitle) {
        console.error("One or more essential UI elements are missing from data_visualization.html. Cannot initialize properly.");
        if(dashboardContainer) dashboardContainer.innerHTML = "<p style='color: red;'>Error: UI elements missing. Please check data_visualization.html.</p>";
        return;
    }
    loadDataFromServer();
    setupEventListeners();
});

// Loading data from the server
async function loadDataFromServer() {
    console.log("Attempting to load data for visualization...");
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

        console.log(`Data loaded for visualization: ${currentFileData.name}`);
        dashboardTitle.textContent = `Dashboard: ${currentFileData.name || 'Unnamed File'}`;
        populateAxisSelectors();
        enableControls(); // Ensure controls are enabled

    } catch (error) {
        console.error('Error loading data from server:', error);
        if(dashboardContainer) dashboardPlaceholder.innerHTML = `<p style='color: red;'>Error loading data: ${error.message}</p>`;
        if(dashboardPlaceholder) dashboardPlaceholder.style.display = 'flex';
        dashboardTitle.textContent = "Dashboard - Error";
        disableControls();
    }
}

// Enable/Disable Controls
function enableControls() {
    if (xAxisSelect) xAxisSelect.disabled = false;
    if (yAxisSelect) yAxisSelect.disabled = false;
    if (chartTypeSelect) chartTypeSelect.disabled = false;
    if (chartSizeSelect) chartSizeSelect.disabled = false;
    if (createChartBtn) createChartBtn.disabled = false;
    if (autoDashboardBtn) autoDashboardBtn.disabled = false;
    if (goToStorytellingBtn) goToStorytellingBtn.disabled = false;
}

function disableControls() {
    if (xAxisSelect) xAxisSelect.disabled = true;
    if (yAxisSelect) yAxisSelect.disabled = true;
    if (chartTypeSelect) chartTypeSelect.disabled = true;
    if (chartSizeSelect) chartSizeSelect.disabled = true;
    if (createChartBtn) createChartBtn.disabled = true;
    if (autoDashboardBtn) autoDashboardBtn.disabled = true;
    if (goToStorytellingBtn) goToStorytellingBtn.disabled = true;
}


// Populate axis selectors based on current file's headers (Uses global currentFileData)
function populateAxisSelectors() {
     if (!currentFileData || !currentFileData.data || !xAxisSelect || !yAxisSelect) {
         console.error("Cannot populate axis selectors: Data or elements missing.");
          if(xAxisSelect) xAxisSelect.innerHTML = '<option value="">Error</option>';
          if(yAxisSelect) yAxisSelect.innerHTML = '<option value="">Error</option>';
         return;
     }
    const headers = currentFileData.data.headers;

    xAxisSelect.innerHTML = '<option value="">Select X-axis / Category</option>';
    yAxisSelect.innerHTML = '<option value="">Select Y-axis / Value (Optional)</option>'; // Make Y optional by default text

    headers.forEach(header => {
        const xOption = document.createElement('option');
        xOption.value = header;
        xOption.textContent = header;
        xAxisSelect.appendChild(xOption);

        const yOption = document.createElement('option');
        yOption.value = header;
        yOption.textContent = header;
        yAxisSelect.appendChild(yOption.cloneNode(true)); // Clone for Y axis
    });
     xAxisSelect.disabled = false;
     yAxisSelect.disabled = false;
}


// Setup event listeners for UI elements (Removed fileSelect listener)
function setupEventListeners() {
    if (createChartBtn) createChartBtn.addEventListener('click', handleCreateChart);
    if (autoDashboardBtn) autoDashboardBtn.addEventListener('click', handleAutoDashboard);
    if (collapseBtn) collapseBtn.addEventListener('click', toggleSidebar);
    if (goToStorytellingBtn) goToStorytellingBtn.addEventListener('click', handleGoToStorytelling);

    setupDragAndDrop(); // Keep drag/drop for charts
}

// --- Navigation Handler ---
function handleGoToStorytelling() {
    // Server holds the state, just navigate.
    console.log("Proceeding to Data Storytelling page...");
    window.location.href = 'data_storytelling.html';
}


// --- Chart Creation Logic (Uses global currentFileData) ---

function handleCreateChart() {
     if (!currentFileData || !currentFileData.data) {
         alert('Data not loaded. Cannot create chart.');
         return;
     }
     if (!chartTypeSelect || !xAxisSelect || !yAxisSelect || !chartSizeSelect) return;

    const chartType = chartTypeSelect.value;
    const xAxisCol = xAxisSelect.value;
    const yAxisCol = yAxisSelect.value; // Will be "" if optional value not selected
    const chartSize = chartSizeSelect.value;
    const rows = currentFileData.data.rows;

    // Validation based on chart type
     if (!chartType) { alert('Please select a chart type.'); return; }
    
     // Histogram requires Y-axis for value, X-axis should be empty
     if (chartType === 'histogram') {
         if (!yAxisCol) { alert('Please select the value column in the Y-axis dropdown for Histogram.'); return; }
         if (xAxisCol) { console.warn("X-axis selection ignored for Histogram."); } // Ignore X selection
     }
     // Pie/Doughnut requires X-axis for category, Y is optional for value (counts if empty)
     else if (chartType === 'pie' || chartType === 'doughnut') {
         if (!xAxisCol) { alert('Please select a category column (X-axis) for Pie/Doughnut chart.'); return; }
     }
      // Scatter requires both X and Y
     else if (chartType === 'scatter') {
          if (!xAxisCol || !yAxisCol) { alert('Please select both X and Y axis columns for Scatter plot.'); return; }
     }
     // Bar/Line require both X and Y
     else { // Handles 'bar', 'line', and potentially others
         if (!xAxisCol || !yAxisCol) { alert('Please select both X and Y axis columns for this chart type.'); return; }
     }


    let chartData, chartLabels, chartOptions = {};
    let title = `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`; // Default title

    try {
        // Use appropriate data prep function based on validated inputs
        if (chartType === 'histogram') {
            const { labels, data, options } = prepareHistogramData(rows, yAxisCol); // Use Y for value col
            chartData = data; chartLabels = labels; chartOptions = options;
            title = `Distribution of ${yAxisCol}`;
        } else if (chartType === 'pie' || chartType === 'doughnut') {
            const { labels, data } = prepareAggregateData(rows, xAxisCol, yAxisCol || null); // Pass Y or null
            chartData = data; chartLabels = labels;
            title = yAxisCol ? `${yAxisCol} by ${xAxisCol}` : `Count by ${xAxisCol}`;
        } else if (chartType === 'scatter') {
            const { data, options } = prepareScatterData(rows, xAxisCol, yAxisCol);
            chartData = data; chartLabels = null; chartOptions = options;
            title = `${yAxisCol} vs ${xAxisCol}`;
        } else { // Bar, Line assumed here
            const { labels, data, options } = prepareStandardChartData(rows, xAxisCol, yAxisCol);
            chartData = data; chartLabels = labels; chartOptions = options;
            title = `${yAxisCol} by ${xAxisCol}`;
        }

        addChartToDashboard(chartType, chartLabels, chartData, chartOptions, title, chartSize);

    } catch (error) {
        console.error(`Error preparing data for ${chartType} chart:`, error);
        alert(`Failed to prepare data: ${error.message}`);
    }
}


// Data Preparation Helpers 

function prepareHistogramData(rows, valueColumn) {
    const values = rows.map(row => parseFloat(row[valueColumn])).filter(val => !isNaN(val));
    if (values.length === 0) {
        throw new Error(`No valid numeric data found in column "${valueColumn}" for histogram.`);
    }
    // Simple binning logic (can be improved)
    const numBins = Math.min(10, Math.ceil(Math.sqrt(values.length)));
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    if (minVal === maxVal) {
        return { labels: [`${minVal}`], data: [values.length], options: { scales: { y: { beginAtZero: true, title: { display: true, text: 'Frequency' } }, x: { title: { display: true, text: valueColumn } } } } };
    }
    const binWidth = (maxVal - minVal) / numBins || 1;
    const bins = new Array(numBins).fill(0);
    const labels = new Array(numBins);
    for (let i = 0; i < numBins; i++) {
        const binStart = minVal + i * binWidth;
        const binEnd = binStart + binWidth;
        labels[i] = `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`;
    }
    values.forEach(value => {
        let binIndex = Math.floor((value - minVal) / binWidth);
        if (value === maxVal) binIndex = numBins - 1;
        binIndex = Math.max(0, Math.min(binIndex, numBins - 1));
        bins[binIndex]++;
    });
    return { labels, data: bins, options: { scales: { y: { beginAtZero: true, title: { display: true, text: 'Frequency' } }, x: { title: { display: true, text: valueColumn + ' Bins' } } } } };
}

function prepareAggregateData(rows, categoryColumn, valueColumn = null) {
    const aggregation = {};
    rows.forEach(row => {
        const category = row[categoryColumn] ?? 'Unknown';
        if (!aggregation[category]) aggregation[category] = { sum: 0, count: 0 };
        aggregation[category].count++;
        if (valueColumn) {
            const value = parseFloat(row[valueColumn]);
            if (!isNaN(value)) aggregation[category].sum += value;
        }
    });
    const labels = Object.keys(aggregation);
    const data = labels.map(label => valueColumn ? aggregation[label].sum : aggregation[label].count);
    if (labels.length === 0) throw new Error(`No data found for aggregation by "${categoryColumn}".`);
    if (labels.length > 20 && !valueColumn) console.warn(`Many categories (${labels.length}) for Pie/Doughnut count by "${categoryColumn}". Consider a Bar chart.`);
    return { labels, data };
}

function prepareStandardChartData(rows, xColumn, yColumn) {
     const dataMap = {};
    rows.forEach(row => {
        const xValue = row[xColumn] ?? 'Unknown';
        const yValue = parseFloat(row[yColumn]);
        if (!isNaN(yValue)) {
             if (!dataMap[xValue]) dataMap[xValue] = { sum: 0, count: 0 };
            dataMap[xValue].sum += yValue;
            dataMap[xValue].count++;
        }
    });
    const labels = Object.keys(dataMap).sort((a, b) => {
        const dateA = new Date(a); const dateB = new Date(b);
        if (!isNaN(dateA) && !isNaN(dateB)) return dateA - dateB;
        const numA = parseFloat(a); const numB = parseFloat(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b);
    });
    const data = labels.map(label => dataMap[label].sum / dataMap[label].count); // Use average
    if (labels.length === 0) throw new Error(`No valid numeric data found in column "${yColumn}" paired with "${xColumn}".`);
    const options = { scales: { y: { beginAtZero: true, title: { display: true, text: yColumn } }, x: { title: { display: true, text: xColumn } } } };
    return { labels, data, options };
}

function prepareScatterData(rows, xColumn, yColumn) {
    const data = rows.map(row => ({ x: parseFloat(row[xColumn]), y: parseFloat(row[yColumn]) }))
                     .filter(point => !isNaN(point.x) && !isNaN(point.y));
    if (data.length === 0) throw new Error(`No valid numeric point pairs found for columns "${xColumn}" and "${yColumn}".`);
    const options = { scales: { y: { title: { display: true, text: yColumn } }, x: { title: { display: true, text: xColumn }, type: 'linear', position: 'bottom' } } };
    return { data, options };
}


// Dashboard Management 

function addChartToDashboard(chartType, labels, data, options = {}, title = 'Chart', size = 'half') {
    if (dashboardPlaceholder) dashboardPlaceholder.style.display = 'none';

    const chartId = `chart-${nextChartId++}`;
    const chartContainerDiv = document.createElement('div');
    chartContainerDiv.className = `chart-container ${size === 'full' ? 'chart-full' : 'chart-half'}`;
    chartContainerDiv.id = chartId;
    chartContainerDiv.draggable = true;

    const chartTitleDiv = document.createElement('div');
    chartTitleDiv.className = 'chart-title';
    chartTitleDiv.textContent = title;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'chart-controls';
    controlsDiv.innerHTML = `
        <button class="chart-control-btn delete-btn" title="Delete Chart">🗑️</button>
        <button class="chart-control-btn export-btn" title="Export Chart">💾</button>`;

    chartContainerDiv.appendChild(chartTitleDiv);
    chartContainerDiv.appendChild(canvas);
    chartContainerDiv.appendChild(controlsDiv);
    dashboardContainer.appendChild(chartContainerDiv);

    controlsDiv.querySelector('.delete-btn').addEventListener('click', () => removeChart(chartId));
    controlsDiv.querySelector('.export-btn').addEventListener('click', () => exportChart(chartId));

    const ctx = canvas.getContext('2d');
    try {
         const chartConfig = {
            type: chartType === 'histogram' ? 'bar' : chartType,
            data: {
                labels: labels,
                datasets: [{
                    label: title,
                    data: data,
                    backgroundColor: getChartColors(Array.isArray(data) ? data.length : 1, 0.5),
                    borderColor: getChartColors(Array.isArray(data) ? data.length : 1, 1),
                    borderWidth: 1,
                    ...(chartType === 'scatter' && { pointRadius: 5, showLine: false }),
                    ...(chartType === 'line' && { fill: false, tension: 0.1 }),
                    ...(chartType === 'histogram' && { barPercentage: 1.0, categoryPercentage: 1.0 }),
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                aspectRatio: (size === 'half' ? 1.5 : 2.5),
                plugins: {
                    legend: { display: chartType !== 'pie' && chartType !== 'doughnut' },
                    title: { display: false },
                    // zoom: { pan: { enabled: true, mode: 'xy' }, zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy'} }
                },
                scales: {
                    ...((chartType !== 'pie' && chartType !== 'doughnut') && {
                        y: { beginAtZero: true, ...(options.scales?.y?.title && { title: options.scales.y.title }) },
                        x: {
                            ...(options.scales?.x?.title && { title: options.scales.x.title }),
                            ...(chartType === 'histogram' && { ticks: { autoSkip: true, maxRotation: 0, minRotation: 0 } }),
                            ...(chartType === 'scatter' && { type: 'linear', position: 'bottom' })
                        }
                    })
                },
                 ...options // Merge any additional options
            }
        };
        chartInstances[chartId] = new Chart(ctx, chartConfig);
    } catch (error) {
        console.error(`Error creating chart instance for ${chartId}:`, error);
        chartContainerDiv.innerHTML = `<div class="chart-title">${title}</div><p style='color:red; padding: 10px;'>Error creating chart: ${error.message}</p>`;
    }
}

function removeChart(chartId) {
    const chartContainerDiv = document.getElementById(chartId);
    if (chartContainerDiv) {
        if (chartInstances[chartId]) { chartInstances[chartId].destroy(); delete chartInstances[chartId]; }
        chartContainerDiv.remove();
    }
    if (dashboardContainer.children.length === 1 && dashboardPlaceholder) { // Only placeholder left
        dashboardPlaceholder.style.display = 'flex';
    }
}

function exportChart(chartId) {
    const chartInstance = chartInstances[chartId];
    const chartContainerDiv = document.getElementById(chartId);
    if (chartInstance && chartContainerDiv) {
        try {
            const url = chartInstance.toBase64Image();
            const link = document.createElement('a');
            const title = chartContainerDiv.querySelector('.chart-title')?.textContent || chartId;
            link.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.png`;
            link.href = url;
            link.click();
        } catch (error) {
            console.error(`Error exporting chart ${chartId}:`, error);
            alert(`Failed to export chart: ${error.message}`);
        }
    } else {
        alert("Could not find chart instance to export.");
    }
}

function clearDashboard() {
    Object.keys(chartInstances).forEach(id => { if (chartInstances[id]) chartInstances[id].destroy(); });
    chartInstances = {};
    while (dashboardContainer.firstChild && dashboardContainer.firstChild !== dashboardPlaceholder) {
        dashboardContainer.removeChild(dashboardContainer.firstChild);
    }
    if (dashboardPlaceholder) dashboardPlaceholder.style.display = 'flex';
    nextChartId = 0;
}

function getChartColors(count, opacity = 1) {
    const baseColors = [ `rgba(54, 162, 235, ${opacity})`, `rgba(255, 99, 132, ${opacity})`, `rgba(75, 192, 192, ${opacity})`, `rgba(255, 206, 86, ${opacity})`, `rgba(153, 102, 255, ${opacity})`, `rgba(255, 159, 64, ${opacity})`, `rgba(99, 255, 132, ${opacity})`, `rgba(201, 203, 207, ${opacity})` ];
    return Array.from({ length: count }, (_, i) => baseColors[i % baseColors.length]);
}


// --- Server Interaction (Auto Dashboard - Modified) ---

async function handleAutoDashboard() {
    // Use data already loaded into currentFileData
     if (!currentFileData || !currentFileData.data || !currentFileData.data.headers || !currentFileData.data.rows) {
         alert('Data not loaded correctly. Cannot create dashboard.');
         return;
     }
    const headers = currentFileData.data.headers;
    // Use the *actual current rows* from the server state for suggestions
    const sampleRows = currentFileData.data.rows.slice(0, 20); // Send a sample

    if (headers.length === 0 || sampleRows.length === 0) {
        alert("Not enough data available to generate dashboard.");
        return;
    }

    autoDashboardBtn.textContent = 'Generating...';
    autoDashboardBtn.disabled = true;
    if(dashboardPlaceholder) dashboardPlaceholder.innerHTML = '<p>Generating dashboard suggestions...</p>';
    if(dashboardPlaceholder) dashboardPlaceholder.style.display = 'flex';


    try {
        console.log("Requesting suggestions for auto-dashboard (using current server data)...");
        // The /suggest_charts endpoint now reads data from the server's current state
        const response = await fetch(`${API_URL}/suggest_charts`, {
            method: 'POST', // Still POST, but body might be ignored by server now
            headers: { 'Content-Type': 'application/json' },
            // Body is technically not needed if server uses its state, but sending doesn't hurt
             body: JSON.stringify({ headers: headers, sample_rows: sampleRows }) 
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `Server error ${response.status}` }));
            throw new Error(errorData.error || `Server responded with status: ${response.status}`);
        }

        const suggestions = await response.json();
        console.log("Received suggestions for auto-dashboard:", suggestions);

        if (!suggestions || Object.keys(suggestions).length === 0) {
            alert("No chart suggestions received from the server.");
             if(dashboardPlaceholder) dashboardPlaceholder.innerHTML = '<p>No suggestions found. Try creating charts manually.</p>';
            return;
        }

        clearDashboard(); // Clear existing charts

        let chartCount = 0;
        const allRows = currentFileData.data.rows; // Use all current rows for chart creation

        for (const title in suggestions) {
             if (chartCount >= 6) break; // Limit auto charts

            if (suggestions.hasOwnProperty(title)) {
                const suggestion = suggestions[title];
                const { type, x, y } = suggestion;

                // Basic validation of suggestion fields
                 if (!type || (!x && !['histogram'].includes(type)) || (!y && ['bar', 'line', 'scatter', 'histogram'].includes(type))) {
                     console.warn(`Skipping auto-dashboard suggestion "${title}" due to missing/invalid fields (type: ${type}, x: ${x}, y: ${y})`);
                     continue;
                 }
                 // Check if suggested columns actually exist in current headers
                 if (x && !headers.includes(x)) { console.warn(`Skipping suggestion "${title}": X-axis column "${x}" not found.`); continue; }
                 if (y && !headers.includes(y)) { console.warn(`Skipping suggestion "${title}": Y-axis column "${y}" not found.`); continue; }


                try {
                    let chartData, chartLabels, chartOptions = {};
                    let chartSize = 'half';

                    // Prepare data based on suggested type using ALL current rows
                    if (type === 'histogram') {
                        const result = prepareHistogramData(allRows, y);
                        chartData = result.data; chartLabels = result.labels; chartOptions = result.options;
                    } else if (type === 'pie' || type === 'doughnut') {
                         const result = prepareAggregateData(allRows, x, y || null);
                         chartData = result.data; chartLabels = result.labels;
                         if (chartLabels.length > 8) { console.warn(`Too many categories for Pie/Doughnut "${title}", skipping.`); continue; }
                    } else if (type === 'scatter') {
                        const result = prepareScatterData(allRows, x, y);
                        chartData = result.data; chartLabels = null; chartOptions = result.options;
                        chartSize = 'full';
                    } else { // Bar, Line
                        const result = prepareStandardChartData(allRows, x, y);
                        chartData = result.data; chartLabels = result.labels; chartOptions = result.options;
                        if (type === 'line' && chartLabels.length > 15) chartSize = 'full';
                    }

                    addChartToDashboard(type, chartLabels, chartData, chartOptions, title, chartSize);
                    chartCount++;

                } catch (chartError) {
                    console.error(`Failed to create auto-dashboard chart for suggestion "${title}":`, chartError);
                    addErrorPlaceholder(title, chartError.message);
                }
            }
        }
         if (chartCount === 0 && Object.keys(suggestions).length > 0) {
             alert("Could not generate any charts from the suggestions provided (check console for warnings).");
             if(dashboardPlaceholder) dashboardPlaceholder.innerHTML = '<p>Could not generate suggested charts. Try creating manually.</p>';
              if(dashboardPlaceholder) dashboardPlaceholder.style.display = 'flex';
         } else if (chartCount > 0) {
              if(dashboardPlaceholder) dashboardPlaceholder.style.display = 'none'; // Hide if charts were added
         }

    } catch (error) {
        console.error('Error creating auto dashboard:', error);
        alert(`Failed to create dashboard: ${error.message}`);
        clearDashboard();
        if(dashboardPlaceholder) dashboardPlaceholder.innerHTML = `<p style='color: red;'>Failed to create dashboard: ${error.message}</p>`;
        if(dashboardPlaceholder) dashboardPlaceholder.style.display = 'flex';
    } finally {
        autoDashboardBtn.textContent = 'Dashboard'; // Restore button text
        autoDashboardBtn.disabled = false;
    }
}


// --- Add Error Placeholder --- (Unchanged)
function addErrorPlaceholder(title, errorMessage) {
    if (dashboardPlaceholder) dashboardPlaceholder.style.display = 'none';
    const errorDiv = document.createElement('div');
    errorDiv.className = 'chart-container chart-half error-placeholder';
    errorDiv.innerHTML = `
        <div class="chart-title">Error: ${title}</div>
        <div style="padding: 10px; color: red; font-size: 14px;">${errorMessage}</div>`;
    dashboardContainer.appendChild(errorDiv);
}


// --- UI Helpers (Unchanged) ---
function toggleSidebar() {
     if (!sidebar || !collapseBtn) return;
    sidebar.classList.toggle('collapsed');
    const isCollapsed = sidebar.classList.contains('collapsed');
    collapseBtn.setAttribute('aria-expanded', !isCollapsed);
    if (collapseIcon) collapseIcon.textContent = isCollapsed ? '☰' : '≪';
}

// --- Drag and Drop (Unchanged) ---
function setupDragAndDrop() {
    let draggedItem = null;
    dashboardContainer.addEventListener('dragstart', (e) => {
        const chart = e.target.closest('.chart-container');
        if (chart && chart.draggable) {
            draggedItem = chart;
            e.dataTransfer.setData('text/plain', chart.id);
            e.dataTransfer.effectAllowed = 'move';
             setTimeout(() => { if (draggedItem) draggedItem.style.opacity = '0.5'; }, 0);
        } else {
            e.preventDefault();
        }
    });
    dashboardContainer.addEventListener('dragend', (e) => {
        if (draggedItem) { draggedItem.style.opacity = '1'; draggedItem = null; }
    });
    dashboardContainer.addEventListener('dragover', (e) => {
         e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    });
    dashboardContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        if (draggedItem) {
            const dropTarget = e.target.closest('.chart-container');
            if (dropTarget && dropTarget !== draggedItem) {
                const rect = dropTarget.getBoundingClientRect();
                const dropBefore = e.clientY < rect.top + rect.height / 2;
                dashboardContainer.insertBefore(draggedItem, dropBefore ? dropTarget : dropTarget.nextSibling);
            } else if (!dropTarget && dashboardContainer.contains(e.target)) {
                dashboardContainer.appendChild(draggedItem);
            }
            draggedItem.style.opacity = '1'; draggedItem = null;
        }
    });
}