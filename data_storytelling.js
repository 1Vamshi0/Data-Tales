// Data state (Modified)
let currentFileData = null; // Stores data for the single loaded file { name, type, data: { headers, rows } }
let currentStory = ""; // To store the generated story text

// API endpoint (Ensure this matches your Flask server address)
const API_URL = 'http://localhost:5000';

// DOM elements
const generateStoryBtn = document.getElementById('generate-story-btn');
const storyOutputContainer = document.getElementById('story-output-container');
const storyNarrativeDiv = document.getElementById('story-narrative');
const storyChartsDiv = document.getElementById('story-charts'); // Keep if you plan to add charts later
const loadingIndicator = document.getElementById('story-loading-indicator');
const copyStoryBtn = document.getElementById('copy-story-btn');
const panelHeaderFileName = document.querySelector('.story-display-panel .panel-header h2'); // To show filename

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    // Check if essential elements exist
    if (!generateStoryBtn || !storyNarrativeDiv || !loadingIndicator || !copyStoryBtn || !panelHeaderFileName) {
        console.error("One or more essential UI elements are missing from data_storytelling.html.");
        if (storyNarrativeDiv) storyNarrativeDiv.innerHTML = "<p style='color: red;'>Error: UI elements missing.</p>";
        return;
    }
    loadDataFromServer(); // Load data on page load
    setupEventListeners();
});

// NEW: Load data from the server
async function loadDataFromServer() {
    console.log("Attempting to load data for storytelling...");
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

        console.log(`Data loaded for storytelling: ${currentFileData.name}`);
        panelHeaderFileName.textContent = `Generated Story: ${currentFileData.name || 'Unnamed File'}`;
        generateStoryBtn.disabled = false; // Enable button on successful load
        storyNarrativeDiv.innerHTML = '<p>Click "Generate Story" to create a narrative based on the loaded data.</p>'; // Set initial message
        storyNarrativeDiv.classList.add('story-narrative-placeholder'); // Ensure placeholder class is set


    } catch (error) {
        console.error('Error loading data from server:', error);
        storyNarrativeDiv.innerHTML = `<p style="color: red;">${error.message}</p>`;
        panelHeaderFileName.textContent = "Generated Story - Error";
        generateStoryBtn.disabled = true;
        copyStoryBtn.style.display = 'none';
    }
}

// Setup event listeners
function setupEventListeners() {
    generateStoryBtn?.addEventListener('click', handleGenerateStory);
    copyStoryBtn?.addEventListener('click', handleCopyStory);
}

// --- Story Generation Logic (Modified to use currentFileData) ---

async function handleGenerateStory() {
    // Use data already loaded into currentFileData
    if (!currentFileData || !currentFileData.data || !currentFileData.data.headers || !currentFileData.data.rows) {
        alert('Data not loaded correctly. Cannot generate story.');
        return;
    }

    const headers = currentFileData.data.headers;
    // Use the *actual current rows* from the server state for suggestions
    const sampleRows = currentFileData.data.rows.slice(0, 50); // Send first 50 rows as sample

    if (headers.length === 0 || sampleRows.length === 0) {
        alert("Not enough data available to generate a story.");
        return;
    }

    // Show loading state
    generateStoryBtn.disabled = true;
    generateStoryBtn.textContent = 'Generating...';
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (storyNarrativeDiv) {
        storyNarrativeDiv.innerHTML = ''; // Clear previous story
        storyNarrativeDiv.classList.remove('story-narrative-placeholder');
        storyNarrativeDiv.classList.add('story-narrative-loading'); // Optional class for styling
    }
    if (copyStoryBtn) copyStoryBtn.style.display = 'none'; // Hide copy button during generation
    currentStory = ""; // Clear previous story text


    try {
        console.log("Sending request to /generate_story (using current server data)...");

        // The /generate_story endpoint now reads data from the server's current state
        const response = await fetch(`${API_URL}/generate_story`, {
            method: 'POST', // Still POST, but body might be ignored by server now
            headers: { 'Content-Type': 'application/json' },
             // Body is technically not needed if server uses its state, but sending doesn't hurt
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

        if (storyNarrativeDiv) {
             displayGeneratedStory(result.story);
             currentStory = result.story; // Store the story text
             if (copyStoryBtn) copyStoryBtn.style.display = 'inline-block'; // Show copy button
        }

    } catch (error) {
        console.error('Error generating story:', error);
        if (storyNarrativeDiv) storyNarrativeDiv.innerHTML = `<p style="color: red;">Failed to generate story: ${error.message}</p>`;
        alert(`Failed to generate story: ${error.message}`);
    } finally {
        // Hide loading state
        generateStoryBtn.disabled = false;
        generateStoryBtn.innerHTML = '✨ Generate Story'; // Restore original text/icon
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        if (storyNarrativeDiv) storyNarrativeDiv.classList.remove('story-narrative-loading');
    }
}

// Display the generated story text
function displayGeneratedStory(storyText) {
    if (!storyNarrativeDiv) return;
    // Use innerText to prevent XSS issues
    storyNarrativeDiv.innerText = storyText || "No narrative was generated.";
    storyNarrativeDiv.classList.remove('story-narrative-placeholder'); // Ensure placeholder style removed
}

// Function to handle copying the story text
function handleCopyStory() {
    if (!currentStory) {
        alert("No story generated yet to copy.");
        return;
    }
    navigator.clipboard.writeText(currentStory)
        .then(() => {
            // Optional: temporary feedback
            const originalText = copyStoryBtn.textContent;
            copyStoryBtn.textContent = 'Copied!';
            setTimeout(() => { copyStoryBtn.textContent = originalText; }, 1500);
        })
        .catch(err => {
            console.error('Failed to copy story: ', err);
            alert("Failed to copy story. Please try manually.");
        });
}


// Placeholder for displaying charts related to the story (if needed later)
function displayStoryCharts(chartConfigs) {
     if (!storyChartsDiv) return;
    storyChartsDiv.innerHTML = '<h3>Relevant Visualizations</h3>'; // Clear previous
    storyChartsDiv.style.display = 'block';
    // ... (Logic to render charts based on chartConfigs) ...
    console.log("Placeholder: Would render charts related to the story:", chartConfigs);
}