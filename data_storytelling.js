// Data state
let dataFiles = [];
let currentFileIndex = 0;
let currentStory = ""; // To store the generated story text

// API endpoint (Ensure this matches your Flask server address)
const API_URL = 'http://localhost:5000';

// DOM elements
const generateStoryBtn = document.getElementById('generate-story-btn');
const storyOutputContainer = document.getElementById('story-output-container');
const storyNarrativeDiv = document.getElementById('story-narrative');
const storyChartsDiv = document.getElementById('story-charts');
const loadingIndicator = document.getElementById('story-loading-indicator');
const copyStoryBtn = document.getElementById('copy-story-btn');

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    // Check if essential elements exist
    if (!generateStoryBtn || !storyNarrativeDiv || !loadingIndicator || !copyStoryBtn) {
        console.error("One or more essential UI elements are missing from data_storytelling.html.");
        if (storyNarrativeDiv) {
            storyNarrativeDiv.innerHTML = "<p style='color: red;'>Error: UI elements missing. Please check data_storytelling.html.</p>";
        }
        return;
    }
    loadData();
    setupEventListeners();
});

// Load data from session storage
function loadData() {
    const storedData = sessionStorage.getItem('dataFiles');

    if (!storedData) {
        storyNarrativeDiv.innerHTML = "<p>No data loaded. Please go back to the upload step.</p>";
        generateStoryBtn.disabled = true;
        return;
    }

    try {
        dataFiles = JSON.parse(storedData);

        if (!Array.isArray(dataFiles) || dataFiles.length === 0 || !dataFiles[0].data || !dataFiles[0].data.headers) {
            console.error('Invalid or empty data structure loaded from sessionStorage:', dataFiles);
            storyNarrativeDiv.innerHTML = "<p>Invalid data format loaded. Please go back to the upload step.</p>";
            generateStoryBtn.disabled = true;
            return;
        }

        currentFileIndex = parseInt(sessionStorage.getItem('currentFileIndex') || '0');
        if (currentFileIndex >= dataFiles.length || currentFileIndex < 0) {
            currentFileIndex = 0;
        }

        // Optionally display which file is being used
        // storyNarrativeDiv.innerHTML = `<p>Ready to generate a story for: <strong>${dataFiles[currentFileIndex].name}</strong></p>`;

    } catch (error) {
        console.error('Error loading or parsing data from sessionStorage:', error);
        alert(`Error loading data: ${error.message}. Check console for details.`);
        storyNarrativeDiv.innerHTML = `<p style='color: red;'>Error loading data: ${error.message}.</p>`;
        generateStoryBtn.disabled = true;
    }
}

// Setup event listeners
function setupEventListeners() {
    generateStoryBtn.addEventListener('click', handleGenerateStory);
    copyStoryBtn.addEventListener('click', handleCopyStory);
}

// --- Story Generation Logic ---

async function handleGenerateStory() {
    const file = dataFiles[currentFileIndex];
    if (!file || !file.data || !file.data.headers || !file.data.rows) {
        alert('Data not loaded correctly. Cannot generate story.');
        return;
    }

    const headers = file.data.headers;
    // Send a larger sample for better context, or potentially basic stats/chart info
    const sampleRows = file.data.rows.slice(0, 50); // Send first 50 rows as sample

    if (headers.length === 0 || sampleRows.length === 0) {
        alert("Not enough data available to generate a story.");
        return;
    }

    // Show loading state
    generateStoryBtn.disabled = true;
    generateStoryBtn.textContent = 'Generating...';
    loadingIndicator.style.display = 'block';
    storyNarrativeDiv.innerHTML = ''; // Clear previous story
    storyNarrativeDiv.classList.remove('story-narrative-placeholder');
    storyNarrativeDiv.classList.add('story-narrative-loading'); // Optional class for styling
    copyStoryBtn.style.display = 'none'; // Hide copy button during generation


    try {
        console.log("Sending data to /generate_story:", { headers, sample_rows: sampleRows });

        const response = await fetch(`${API_URL}/generate_story`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Sending headers and sample rows. Consider sending chart configs if available.
            body: JSON.stringify({ headers: headers, sample_rows: sampleRows })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: `Server error ${response.status}` }));
            throw new Error(errorData.error || `Server responded with status: ${response.status}`);
        }

        const result = await response.json();
        console.log("Received story generation response:", result);

        if (result.error) {
             throw new Error(result.error);
        }

        displayGeneratedStory(result.story);
        currentStory = result.story; // Store the story text
        copyStoryBtn.style.display = 'inline-block'; // Show copy button

        // Optional: Display related charts if backend provides info
        // if (result.charts) {
        //    displayStoryCharts(result.charts);
        // }

    } catch (error) {
        console.error('Error generating story:', error);
        storyNarrativeDiv.innerHTML = `<p style="color: red;">Failed to generate story: ${error.message}</p>`;
        alert(`Failed to generate story: ${error.message}`);
    } finally {
        // Hide loading state
        generateStoryBtn.disabled = false;
        generateStoryBtn.innerHTML = '✨ Generate Story'; // Restore original text/icon
        loadingIndicator.style.display = 'none';
        storyNarrativeDiv.classList.remove('story-narrative-loading');
    }
}

// Display the generated story text
function displayGeneratedStory(storyText) {
    // Sanitize or format the text if needed. For now, just display.
    // Use innerText to prevent potential XSS if the story contains HTML-like content
    // Or use a library like DOMPurify if HTML rendering is desired.
    storyNarrativeDiv.innerText = storyText;
    // Or, if you trust the source and want basic formatting (like paragraphs):
    // storyNarrativeDiv.innerHTML = storyText.replace(/\n/g, '<br>');
}

// Function to handle copying the story text
function handleCopyStory() {
    if (!currentStory) {
        alert("No story generated yet to copy.");
        return;
    }
    navigator.clipboard.writeText(currentStory)
        .then(() => {
            alert("Story copied to clipboard!");
        })
        .catch(err => {
            console.error('Failed to copy story: ', err);
            alert("Failed to copy story. Please try manually.");
        });
}


// Placeholder for displaying charts related to the story (if implemented)
function displayStoryCharts(chartConfigs) {
    storyChartsDiv.innerHTML = '<h3>Relevant Visualizations</h3>'; // Clear previous
    storyChartsDiv.style.display = 'block';

    // Example: Loop through chartConfigs and use Chart.js to render them
    // This would require chartConfigs to be in a format Chart.js understands
    // and likely involve adapting the chart creation logic from data_visualization.js
    chartConfigs.forEach((config, index) => {
        const canvasId = `story-chart-${index}`;
        const canvas = document.createElement('canvas');
        canvas.id = canvasId;
        canvas.style.maxWidth = '400px'; // Example styling
        canvas.style.margin = '10px auto';
        storyChartsDiv.appendChild(canvas);

        // new Chart(document.getElementById(canvasId).getContext('2d'), config);
        console.log("Placeholder: Would render chart with config:", config);
    });
}

// Helper function for messages (adapt from upload.js or style directly)
function showMessage(text, type = 'info') {
    // Implement a message display logic (e.g., a temporary banner)
    console.log(`[${type.toUpperCase()}] ${text}`); // Simple console log for now
}