// Data state
let dataFiles = [];
let currentFileIndex = 0;
let chartInstances = {}; // Use an object to store multiple chart instances { chartId: instance }
let nextChartId = 0; // Counter for unique chart IDs

// API endpoint (Ensure this matches your Flask server address)
const API_URL = 'http://localhost:5000';

// DOM elements (Updated)
const fileSelect = document.getElementById('file-select'); 
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

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    // Check if essential elements exist
    if (!xAxisSelect || !yAxisSelect || !chartTypeSelect || !createChartBtn || !autoDashboardBtn || !dashboardContainer || !collapseBtn || !goToStorytellingBtn) { // Added goToStorytellingBtn check
        console.error("One or more essential UI elements are missing from data_visualization.html. Cannot initialize properly.");
        dashboardContainer.innerHTML = "<p style='color: red;'>Error: UI elements missing. Please check data_visualization.html.</p>";
        return;
    }
    loadData();
    setupEventListeners();
});

// Load data from session storage
function loadData() {
    const storedData = sessionStorage.getItem('dataFiles');

    if (!storedData) {
        dashboardContainer.innerHTML = "<p>No data loaded. Please go back to the upload step.</p>";
        disableControls(); // Disable all controls if no data
        return;
    }

    try {
        dataFiles = JSON.parse(storedData);

        if (!Array.isArray(dataFiles) || dataFiles.length === 0 || !dataFiles[0].data || !dataFiles[0].data.headers) {
            console.error('Invalid or empty data structure loaded from sessionStorage:', dataFiles);
            dashboardContainer.innerHTML = "<p>Invalid data format loaded. Please go back to the upload step.</p>";
            disableControls();
            return;
        }

        currentFileIndex = parseInt(sessionStorage.getItem('currentFileIndex') || '0');
        if (currentFileIndex >= dataFiles.length || currentFileIndex < 0) {
            currentFileIndex = 0;
        }

        if (fileSelect) {
            populateFileSelector();
            fileSelect.value = currentFileIndex;
        } else {
            console.warn("File selector element not found in HTML.");
        }

        populateAxisSelectors();
    } catch (error) {
        console.error('Error loading or parsing data from sessionStorage:', error);
        alert(`Error loading data: ${error.message}. Check console for details.`);
        dashboardContainer.innerHTML = `<p style='color: red;'>Error loading data: ${error.message}.</p>`;
        disableControls();
    }
}

// Updated disableControls to include the new button
function disableControls() {
    if (xAxisSelect) xAxisSelect.disabled = true;
    if (yAxisSelect) yAxisSelect.disabled = true;
    if (chartTypeSelect) chartTypeSelect.disabled = true;
    if (chartSizeSelect) chartSizeSelect.disabled = true;
    if (createChartBtn) createChartBtn.disabled = true;
    if (autoDashboardBtn) autoDashboardBtn.disabled = true;
    if (goToStorytellingBtn) goToStorytellingBtn.disabled = true; // Disable new button too
}

// Populate file selector dropdown (if element exists)
function populateFileSelector() {
    if (!fileSelect) return;
    fileSelect.innerHTML = '';
    dataFiles.forEach((file, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = file.name;
        fileSelect.appendChild(option);
    });
}

// Populate axis selectors based on current file's headers
function populateAxisSelectors() {
    const headers = dataFiles[currentFileIndex]?.data?.headers;

    if (!Array.isArray(headers)) {
        console.error(`Headers not found or not an array for file index ${currentFileIndex}.`);
        if (xAxisSelect) xAxisSelect.innerHTML = '<option value="">Error loading columns</option>';
        if (yAxisSelect) yAxisSelect.innerHTML = '<option value="">Error loading columns</option>';
        return;
    }

    if (xAxisSelect) {
        xAxisSelect.innerHTML = '<option value="">Select X-axis / Category</option>';
        headers.forEach(header => {
            const xOption = document.createElement('option');
            xOption.value = header;
            xOption.textContent = header;
            xAxisSelect.appendChild(xOption);
        });
    }
     if (yAxisSelect) {
        yAxisSelect.innerHTML = '<option value="">Select Y-axis / Value (Optional)</option>';
        headers.forEach(header => {
            const yOption = document.createElement('option');
            yOption.value = header;
            yOption.textContent = header;
            yAxisSelect.appendChild(yOption);
        });
     }
}


// Setup event listeners for UI elements (Updated)
function setupEventListeners() {
    if (fileSelect) {
        fileSelect.addEventListener('change', (e) => {
            currentFileIndex = parseInt(e.target.value);
            sessionStorage.setItem('currentFileIndex', currentFileIndex);
            populateAxisSelectors();
             // Optionally, clear dashboard when file changes, or re-run auto-dashboard if desired
             clearDashboard();
        });
    }

    if (createChartBtn) createChartBtn.addEventListener('click', handleCreateChart);
    if (autoDashboardBtn) autoDashboardBtn.addEventListener('click', handleAutoDashboard);
    if (collapseBtn) collapseBtn.addEventListener('click', toggleSidebar);
    if (goToStorytellingBtn) goToStorytellingBtn.addEventListener('click', handleGoToStorytelling); // Added listener

    setupDragAndDrop();
}

// --- NEW Navigation Handler ---
function handleGoToStorytelling() {
    // Save current state if needed (e.g., current file index is important)
    sessionStorage.setItem('currentFileIndex', currentFileIndex);
    // Optionally save chart configurations if storytelling needs them
    // sessionStorage.setItem('dashboardCharts', JSON.stringify(chartInstances)); // Example

    console.log("Proceeding to Data Storytelling page...");
    window.location.href = 'data_storytelling.html';
}


// --- Chart Creation Logic (Unchanged) ---

function handleCreateChart() {
    if (!chartTypeSelect || !xAxisSelect || !yAxisSelect || !chartSizeSelect) return;

    const chartType = chartTypeSelect.value;
    const xAxisCol = xAxisSelect.value;
    const yAxisCol = yAxisSelect.value;
    const chartSize = chartSizeSelect.value;

    const file = dataFiles[currentFileIndex];
    if (!file || !file.data || !file.data.rows) {
        alert('Data not loaded correctly. Cannot create chart.');
        return;
    }
    const rows = file.data.rows;
    const headers = file.data.headers;

    if (!chartType) {
        alert('Please select a chart type.');
        return;
    }
    // Updated validation based on chart type
    if (!xAxisCol && !['histogram'].includes(chartType)) { // X-axis needed for most types
        alert('Please select an X-axis/Category column for this chart type.');
        return;
    }
     if (xAxisCol && ['histogram'].includes(chartType)) { // Histogram should use Y-axis for value column
        alert('Please select the value column in the Y-axis dropdown for Histogram.');
        return;
    }
    if (!yAxisCol && ['bar', 'line', 'scatter', 'histogram'].includes(chartType)) { // Y-axis needed for these types
        alert('Please select a Y-axis/Value column for this chart type.');
        return;
    }


    let chartData, chartLabels, chartOptions = {};
    let title = `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart`;

    try {
         if (chartType === 'histogram') {
            if (!yAxisCol) { // Histogram uses yAxisCol for the value to bin
                alert('Please select a column for the histogram (Y-axis).');
                return;
            }
            const { labels, data, options } = prepareHistogramData(rows, yAxisCol);
            chartData = data;
            chartLabels = labels;
            chartOptions = options;
            title = `Distribution of ${yAxisCol}`;
        } else if (chartType === 'pie' || chartType === 'doughnut') {
             if (!xAxisCol) { // Needs category column
                alert('Please select a category column (X-axis) for Pie/Doughnut chart.');
                return;
            }
            // Uses X for category, Y for value (optional, otherwise counts)
            const { labels, data } = prepareAggregateData(rows, xAxisCol, yAxisCol || null);
            chartData = data;
            chartLabels = labels;
            title = yAxisCol ? `${yAxisCol} by ${xAxisCol}` : `Count of ${xAxisCol}`;
        } else if (chartType === 'scatter') {
            if (!xAxisCol || !yAxisCol) { // Needs both X and Y
                alert('Please select both X and Y axis columns for Scatter plot.');
                return;
            }
            const { data, options } = prepareScatterData(rows, xAxisCol, yAxisCol);
            chartData = data;
            chartLabels = null; // Scatter doesn't use labels array in the same way
            chartOptions = options;
            title = `${yAxisCol} vs ${xAxisCol}`;
        } else { // Bar, Line - Need both X and Y
            if (!xAxisCol || !yAxisCol) {
                alert('Please select both X and Y axis columns for Bar/Line charts.');
                return;
            }
            const { labels, data, options } = prepareStandardChartData(rows, xAxisCol, yAxisCol);
            chartData = data;
            chartLabels = labels;
            chartOptions = options;
            title = `${yAxisCol} by ${xAxisCol}`;
        }

        addChartToDashboard(chartType, chartLabels, chartData, chartOptions, title, chartSize);
    } catch (error) {
        console.error("Error preparing chart data:", error);
        alert(`Failed to prepare data for ${chartType} chart: ${error.message}`);
    }
}


// --- Data Preparation Helpers (Unchanged) ---

function prepareHistogramData(rows, valueColumn) {
    const values = rows.map(row => parseFloat(row[valueColumn])).filter(val => !isNaN(val));
    if (values.length === 0) {
        throw new Error(`No valid numeric data found in column "${valueColumn}" for histogram.`);
    }

    // Simple binning logic (can be improved)
    const numBins = Math.min(10, Math.ceil(Math.sqrt(values.length))); // Limit bins
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);

    if (minVal === maxVal) { // Handle case where all values are the same
        return {
            labels: [`${minVal}`],
            data: [values.length],
            options: { scales: { y: { beginAtZero: true, title: { display: true, text: 'Frequency' } }, x: { title: { display: true, text: valueColumn } } } }
        };
    }

    const binWidth = (maxVal - minVal) / numBins || 1; // Avoid division by zero if max=min but length>0
    const bins = new Array(numBins).fill(0);
    const labels = new Array(numBins);

    for (let i = 0; i < numBins; i++) {
        const binStart = minVal + i * binWidth;
        const binEnd = binStart + binWidth;
        // Format labels nicely
        labels[i] = `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`;
    }

    values.forEach(value => {
        let binIndex = Math.floor((value - minVal) / binWidth);
        // Ensure the max value falls into the last bin
        if (value === maxVal) {
            binIndex = numBins - 1;
        }
         // Clamp index to valid range [0, numBins - 1]
        binIndex = Math.max(0, Math.min(binIndex, numBins - 1));
        bins[binIndex]++;
    });

    return {
        labels: labels,
        data: bins,
        options: { scales: { y: { beginAtZero: true, title: { display: true, text: 'Frequency' } }, x: { title: { display: true, text: valueColumn + ' Bins' } } } }
    };
}

function prepareAggregateData(rows, categoryColumn, valueColumn = null) {
    const aggregation = {};

    rows.forEach(row => {
        const category = row[categoryColumn] ?? 'Unknown'; // Handle null/undefined categories
        if (!aggregation[category]) {
            aggregation[category] = { sum: 0, count: 0 };
        }

        aggregation[category].count++;
        if (valueColumn) {
            const value = parseFloat(row[valueColumn]);
            if (!isNaN(value)) {
                aggregation[category].sum += value;
            }
        }
    });

    const labels = Object.keys(aggregation);
    const data = labels.map(label => valueColumn ? aggregation[label].sum : aggregation[label].count);

    if (labels.length === 0) {
        throw new Error(`No data found for aggregation by "${categoryColumn}".`);
    }
     if (labels.length > 20) { // Add warning for too many categories for Pie/Doughnut
        console.warn(`Many categories (${labels.length}) for Pie/Doughnut chart based on "${categoryColumn}". Consider a Bar chart.`);
    }


    return { labels, data };
}

function prepareStandardChartData(rows, xColumn, yColumn) {
     const dataMap = {}; // Use a map for potential aggregation if X values repeat

    rows.forEach(row => {
        const xValue = row[xColumn] ?? 'Unknown';
        const yValue = parseFloat(row[yColumn]);

        if (!isNaN(yValue)) {
             if (!dataMap[xValue]) {
                dataMap[xValue] = { sum: 0, count: 0 };
            }
            dataMap[xValue].sum += yValue;
            dataMap[xValue].count++;
        }
    });

    // Sort labels (categories) if they seem sortable (e.g., dates or numbers)
    const labels = Object.keys(dataMap).sort((a, b) => {
        // Basic date/number sorting attempt
        const dateA = new Date(a); const dateB = new Date(b);
        if (!isNaN(dateA) && !isNaN(dateB)) return dateA - dateB;
        const numA = parseFloat(a); const numB = parseFloat(b);
        if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
        return a.localeCompare(b); // Default string sort
    });

    // Calculate average if multiple entries per category, otherwise use sum (or could be configurable)
    const data = labels.map(label => dataMap[label].sum / dataMap[label].count); // Use average

    if (labels.length === 0) {
        throw new Error(`No valid numeric data found in column "${yColumn}" paired with "${xColumn}".`);
    }

    const options = {
        scales: {
            y: { beginAtZero: true, title: { display: true, text: yColumn } },
            x: { title: { display: true, text: xColumn } }
        }
    };
    return { labels, data, options };
}


function prepareScatterData(rows, xColumn, yColumn) {
    const data = rows.map(row => ({
        x: parseFloat(row[xColumn]),
        y: parseFloat(row[yColumn])
    })).filter(point => !isNaN(point.x) && !isNaN(point.y)); // Ensure both x and y are valid numbers

    if (data.length === 0) {
        throw new Error(`No valid numeric point pairs found for columns "${xColumn}" and "${yColumn}".`);
    }

    const options = {
        scales: {
            y: { title: { display: true, text: yColumn } },
            x: { title: { display: true, text: xColumn }, type: 'linear', position: 'bottom' }
        }
    };
    return { data, options };
}


// --- Dashboard Management (Unchanged, but includes removeChart, exportChart, clearDashboard, addChartToDashboard) ---
function addChartToDashboard(chartType, labels, data, options = {}, title = 'Chart', size = 'half') {
    if (dashboardPlaceholder) {
        dashboardPlaceholder.style.display = 'none'; // Hide placeholder when adding first chart
    }

    const chartId = `chart-${nextChartId++}`;
    const chartContainerDiv = document.createElement('div');
    // Apply size class based on selection
    chartContainerDiv.className = `chart-container ${size === 'full' ? 'chart-full' : 'chart-half'}`;
    chartContainerDiv.id = chartId;
    chartContainerDiv.draggable = true; // Make it draggable

    const chartTitleDiv = document.createElement('div');
    chartTitleDiv.className = 'chart-title';
    chartTitleDiv.textContent = title;

    const canvas = document.createElement('canvas');
     // Ensure canvas tries to fill its container initially
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    // Add controls container
    const controlsDiv = document.createElement('div');
    controlsDiv.className = 'chart-controls';
    controlsDiv.innerHTML = `
        <button class="chart-control-btn delete-btn" title="Delete Chart">🗑️</button>
        <button class="chart-control-btn export-btn" title="Export Chart">💾</button>
        `;


    chartContainerDiv.appendChild(chartTitleDiv);
    chartContainerDiv.appendChild(canvas);
    chartContainerDiv.appendChild(controlsDiv); // Add controls to container
    dashboardContainer.appendChild(chartContainerDiv);

    // Add event listeners for controls
    controlsDiv.querySelector('.delete-btn').addEventListener('click', () => removeChart(chartId));
    controlsDiv.querySelector('.export-btn').addEventListener('click', () => exportChart(chartId));


    const ctx = canvas.getContext('2d');
    try {
         const chartConfig = {
            // Use 'bar' type for histogram data prep, otherwise use selected type
            type: chartType === 'histogram' ? 'bar' : chartType,
            data: {
                labels: labels, // Null for scatter
                // Scatter data format is {x: val, y: val}, others use array
                datasets: [{
                    label: title,
                    data: data,
                    backgroundColor: getChartColors(Array.isArray(data) ? data.length : 1, 0.5), // Handle scatter data structure
                    borderColor: getChartColors(Array.isArray(data) ? data.length : 1, 1),
                    borderWidth: 1,
                     // Specific options for chart types
                    ...(chartType === 'scatter' && { pointRadius: 5, showLine: false }),
                    ...(chartType === 'line' && { fill: false, tension: 0.1 }),
                    ...(chartType === 'histogram' && { barPercentage: 1.0, categoryPercentage: 1.0 }), // Make histogram bars touch
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // Important to allow resizing within flex/grid
                 // Dynamic aspect ratio based on size? Or fixed? Let's try fixed first.
                 aspectRatio: (size === 'half' ? 1.5 : 2.5), // Wider for full width
                plugins: {
                    legend: {
                        // Hide legend for pie/doughnut, or if only one dataset (optional)
                         display: chartType !== 'pie' && chartType !== 'doughnut' // && data.datasets.length > 1
                    },
                    title: {
                        display: false // Using custom title div instead
                    },
                    // Zoom plugin configuration (optional)
                    // zoom: {
                    //     pan: { enabled: true, mode: 'xy' },
                    //     zoom: { wheel: { enabled: true }, pinch: { enabled: true }, mode: 'xy'}
                    // }
                },
                scales: {
                    // Only show scales if applicable (not for pie/doughnut)
                    ...( (chartType !== 'pie' && chartType !== 'doughnut') && {
                        y: {
                             beginAtZero: true,
                             // Add title if options provide it (e.g., from prepareStandardChartData)
                             ...(options.scales?.y?.title && { title: options.scales.y.title })
                         },
                        x: {
                             // Add title if options provide it
                            ...(options.scales?.x?.title && { title: options.scales.x.title }),
                             // For histogram, ensure labels don't overlap
                            ...(chartType === 'histogram' && { ticks: { autoSkip: true, maxRotation: 0, minRotation: 0 } }),
                             // Type needs to be linear for scatter
                            ...(chartType === 'scatter' && { type: 'linear', position: 'bottom' })
                        }
                    })
                },
                 // Merge any additional specific options from data prep
                 ...options
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
        // Destroy Chart.js instance if it exists
        if (chartInstances[chartId]) {
            chartInstances[chartId].destroy();
            delete chartInstances[chartId];
        }
        // Remove the container div
        chartContainerDiv.remove();
    }

    // Show placeholder if dashboard becomes empty
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
             // Try to get title from the container, default to id
            const title = chartContainerDiv.querySelector('.chart-title')?.textContent || chartId;
             // Sanitize title for filename
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
    // Destroy all chart instances
    Object.keys(chartInstances).forEach(id => {
        if (chartInstances[id]) {
            chartInstances[id].destroy();
        }
    });
    chartInstances = {}; // Reset the storage

    // Remove all chart containers except the placeholder
    while (dashboardContainer.firstChild && dashboardContainer.firstChild !== dashboardPlaceholder) {
        dashboardContainer.removeChild(dashboardContainer.firstChild);
    }

    // Ensure placeholder is visible
    if (dashboardPlaceholder) {
        dashboardPlaceholder.style.display = 'flex';
    }
    nextChartId = 0; // Reset chart ID counter
}


// --- Color Helper (Unchanged) ---
function getChartColors(count, opacity = 1) {
    // Consistent color palette
    const baseColors = [
        `rgba(54, 162, 235, ${opacity})`, // Blue
        `rgba(255, 99, 132, ${opacity})`,  // Red
        `rgba(75, 192, 192, ${opacity})`,  // Green
        `rgba(255, 206, 86, ${opacity})`, // Yellow
        `rgba(153, 102, 255, ${opacity})`, // Purple
        `rgba(255, 159, 64, ${opacity})`,  // Orange
        `rgba(99, 255, 132, ${opacity})`,  // Lime Green
        `rgba(201, 203, 207, ${opacity})`  // Grey
    ];
    // Repeat colors if count exceeds palette size
    return Array.from({ length: count }, (_, i) => baseColors[i % baseColors.length]);
}

// --- Server Interaction (Auto Dashboard - Unchanged) ---

async function handleAutoDashboard() {
    const file = dataFiles[currentFileIndex];
    if (!file || !file.data || !file.data.headers || !file.data.rows) {
        alert('Data not loaded correctly. Cannot create dashboard.');
        return;
    }
    const headers = file.data.headers;
    const sampleRows = file.data.rows.slice(0, 20); // Send a decent sample

    if (headers.length === 0 || sampleRows.length === 0) {
        alert("Not enough data available to generate dashboard.");
        return;
    }

    autoDashboardBtn.textContent = 'Generating...';
    autoDashboardBtn.disabled = true;

    try {
        console.log("Requesting suggestions for auto-dashboard...");
        const response = await fetch(`${API_URL}/suggest_charts`, { // Use existing endpoint
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ headers: headers, sample_rows: sampleRows })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `Server error ${response.status}` }));
            throw new Error(errorData.error || `Server responded with status: ${response.status}`);
        }

        const suggestions = await response.json();
        console.log("Received suggestions for auto-dashboard:", suggestions);

        if (!suggestions || Object.keys(suggestions).length === 0) {
            alert("No suggestions received to build the dashboard.");
            return;
        }

        clearDashboard(); // Clear existing charts before adding new ones

        let chartCount = 0;
        for (const title in suggestions) {
             // Limit the number of charts generated automatically
             if (chartCount >= 6) break;

            if (suggestions.hasOwnProperty(title)) {
                const suggestion = suggestions[title];
                const { type, x, y } = suggestion;

                // Basic validation of suggestion
                if (!type || (!x && !['histogram'].includes(type)) || (!y && ['bar', 'line', 'scatter', 'histogram'].includes(type))) {
                    console.warn(`Skipping auto-dashboard suggestion "${title}" due to missing/invalid fields (type: ${type}, x: ${x}, y: ${y})`);
                    continue;
                }

                try {
                    let chartData, chartLabels, chartOptions = {};
                    const rows = dataFiles[currentFileIndex].data.rows;
                    let chartSize = 'half'; // Default to half size for auto-dashboard

                    // Prepare data based on suggested type
                     if (type === 'histogram') {
                        const result = prepareHistogramData(rows, y); // Histogram uses Y for value column
                        chartData = result.data; chartLabels = result.labels; chartOptions = result.options;
                    } else if (type === 'pie' || type === 'doughnut') {
                        const result = prepareAggregateData(rows, x, y || null); // Y is optional for pie/doughnut
                        chartData = result.data; chartLabels = result.labels;
                        // Limit categories for pie/doughnut
                        if (chartLabels.length > 8) {
                            console.warn(`Too many categories for Pie/Doughnut "${title}", skipping.`); continue;
                        }
                    } else if (type === 'scatter') {
                        const result = prepareScatterData(rows, x, y);
                        chartData = result.data; chartLabels = null; chartOptions = result.options;
                         // Scatter often looks better full width
                        chartSize = 'full';
                    } else { // Bar, Line
                        const result = prepareStandardChartData(rows, x, y);
                        chartData = result.data; chartLabels = result.labels; chartOptions = result.options;
                         // Line charts often benefit from full width if many data points
                         if (type === 'line' && chartLabels.length > 15) chartSize = 'full';
                    }

                    addChartToDashboard(type, chartLabels, chartData, chartOptions, title, chartSize);
                    chartCount++;

                } catch (chartError) {
                    console.error(`Failed to create auto-dashboard chart for suggestion "${title}":`, chartError);
                    // Add an error placeholder instead of breaking the whole process
                    addErrorPlaceholder(title, chartError.message);
                }
            }
        }
         if (chartCount === 0 && Object.keys(suggestions).length > 0) {
             alert("Could not generate any charts from the suggestions provided.");
         }

    } catch (error) {
        console.error('Error creating auto dashboard:', error);
        alert(`Failed to create dashboard: ${error.message}`);
        clearDashboard(); // Clear any partial charts on error
        if (dashboardPlaceholder) dashboardPlaceholder.style.display = 'flex';
    } finally {
        autoDashboardBtn.textContent = 'Dashboard';
        autoDashboardBtn.disabled = false;
    }
}


// --- Add Error Placeholder ---
function addErrorPlaceholder(title, errorMessage) {
    if (dashboardPlaceholder) {
        dashboardPlaceholder.style.display = 'none';
    }
    const errorDiv = document.createElement('div');
    // Use appropriate size class, default to half
    errorDiv.className = 'chart-container chart-half error-placeholder';
    errorDiv.innerHTML = `
        <div class="chart-title">Error: ${title}</div>
        <div style="padding: 10px; color: red; font-size: 14px;">${errorMessage}</div>
    `;
    dashboardContainer.appendChild(errorDiv);
}


// --- UI Helpers (Unchanged) ---

function toggleSidebar() {
     if (!sidebar || !collapseBtn) return;
    sidebar.classList.toggle('collapsed');
    const isCollapsed = sidebar.classList.contains('collapsed');
    collapseBtn.setAttribute('aria-expanded', !isCollapsed);
    if (collapseIcon) {
        collapseIcon.textContent = isCollapsed ? '☰' : '≪'; // Toggle icon
    }
    // Optional: trigger resize event for charts after transition
    // setTimeout(() => window.dispatchEvent(new Event('resize')), 300); // Adjust delay to match CSS transition
}

// --- Drag and Drop (Unchanged) ---

function setupDragAndDrop() {
    let draggedItem = null;

    dashboardContainer.addEventListener('dragstart', (e) => {
        // Ensure the event target is the chart container itself or an element within it
        const chart = e.target.closest('.chart-container');
        if (chart && chart.draggable) { // Check if it's a draggable chart container
            draggedItem = chart;
            // Use the chart's ID for data transfer
            e.dataTransfer.setData('text/plain', chart.id);
            e.dataTransfer.effectAllowed = 'move'; // Indicate it's a move operation
             // Add visual feedback (slight delay to allow browser rendering)
             setTimeout(() => {
                if (draggedItem) draggedItem.style.opacity = '0.5';
             }, 0);
        } else {
            e.preventDefault(); // Prevent dragging if it's not a chart container
        }
    });

    dashboardContainer.addEventListener('dragend', (e) => {
        // Remove visual feedback regardless of drop success
        if (draggedItem) {
            draggedItem.style.opacity = '1';
            draggedItem = null; // Clear the dragged item reference
        }
    });

    dashboardContainer.addEventListener('dragover', (e) => {
         e.preventDefault(); // Necessary to allow dropping
         e.dataTransfer.dropEffect = 'move'; // Indicate valid drop target
         // Optional: add visual feedback on the container during dragover
         // dashboardContainer.classList.add('drag-over-active');
    });

    // Optional: remove visual feedback when dragging leaves the container
    // dashboardContainer.addEventListener('dragleave', (e) => {
    //     dashboardContainer.classList.remove('drag-over-active');
    // });

    dashboardContainer.addEventListener('drop', (e) => {
        e.preventDefault(); // Prevent default drop behavior (like opening link)
        // dashboardContainer.classList.remove('drag-over-active'); // Remove visual feedback

        if (draggedItem) {
             // Find the chart container the item was dropped onto or nearest to
            const dropTarget = e.target.closest('.chart-container');

            if (dropTarget && dropTarget !== draggedItem) {
                 // Determine if dropping before or after the target based on Y position
                const rect = dropTarget.getBoundingClientRect();
                 // Drop before the target if mouse is in the top half, otherwise after
                const dropBefore = e.clientY < rect.top + rect.height / 2;

                 if (dropBefore) {
                    dashboardContainer.insertBefore(draggedItem, dropTarget);
                } else {
                     // Insert after: find the next sibling, or append if it's the last item
                    dashboardContainer.insertBefore(draggedItem, dropTarget.nextSibling);
                 }
            } else if (!dropTarget && dashboardContainer.contains(e.target)) {
                // If dropped directly onto the container background (not over another chart), append to end
                dashboardContainer.appendChild(draggedItem);
            }


            // Ensure opacity is reset even if drop target logic has issues
             draggedItem.style.opacity = '1';
             draggedItem = null; // Clear reference after successful drop
        }
    });
}
