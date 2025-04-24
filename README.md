# DataTales 📊✍️

DataTales is a web application designed to guide users through a complete data analysis pipeline. It allows for uploading datasets, viewing and understanding the data, performing various cleaning operations, creating insightful visualizations, and finally, generating AI-powered narratives to tell the story behind the data. 

## ✨ Features

* **⬆️ Data Upload:** Upload datasets in CSV or Excel formats (.csv, .xlsx, .xls).
* **👀 Data Viewing:** Preview uploaded data in a paginated table and view summary statistics (file info, column types, basic stats, data quality metrics).
* **🧹 Interactive Data Cleaning:** Perform a wide range of data cleaning tasks:
    * Remove Duplicate Rows
    * Handle Missing Values (remove, fill with mean/median/mode/custom value)
    * Convert Data Types (text, number, date, boolean)
    * Clean Text Data (trim whitespace, change case, remove punctuation/digits)
    * Normalize Data (Min-Max Scaling)
    * Standardize Data (Z-Score Scaling)
    * Detect & Handle Outliers (IQR, Z-Score methods; clip, remove, replace)
    * Add Derived Columns (sum, mean, median, product, difference, mode)
    * Handle Inconsistent Data (standardize using custom mappings or auto-detection)
    * Reset all cleaning changes to the original data state.
* **📈 Data Visualization:**
    * Create various chart types manually (Bar, Line, Pie, Scatter, Histogram) using Chart.js.
    * Select X/Y axes and customize chart size.
    * Generate an automatic dashboard with suggested visualizations based on data analysis.
    * Organize charts in a drag-and-drop dashboard interface.
    * Export individual charts as PNG images.
* **🤖 AI-Powered Storytelling:** Generate concise narratives summarizing key insights and trends found in the data using the Google Gemini API.
* **🧭 Guided Workflow:** A clear, step-by-step user interface guides users through the analysis process from upload to storytelling. [cite: 1]

## 💻 Technology Stack

* **Backend:**
    * Python
    * Flask (Web Framework)
    * Pandas (Data Manipulation & Analysis)
    * NumPy
* **Frontend:**
    * HTML [cite: 1]
    * CSS
    * JavaScript (DOM manipulation, event handling, API calls)
* **Visualization Library:**
    * Chart.js
* **AI Integration:**
    * Google Gemini API (via provided `gemini.py`)
* **Server (Optional):**
    * Gunicorn (listed in `requirements.txt`)

## ⚙️ Setup and Installation

1.  **Clone the Repository:**
    ```bash
    git clone https://github.com/1Vamshi0/Data-Tales.git
    cd DataTales
    ```
2.  **Create a Virtual Environment (Recommended):**
    ```bash
    python -m venv venv
    venv\Scripts\activate    ```
3.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
   
4.  **Add Gemini API Key:**
    * Obtain an API key from Google AI Studio (or Google Cloud Console).
    * Open the `gemini.py` file.
    * Replace the placeholder `"AIzaSyAbP1ZXHiwi-ZpJinxs1FpngBXPbHDPxsg"` with your actual API key.
    ```python
    # Inside gemini.py
    api_key = "YOUR_ACTUAL_GEMINI_API_KEY" 
    ```
5.  **Run the Flask Server:**
    ```bash
    python server.py
    ```
   
6.  **Access the Application:**
    * Open your web browser and navigate to `http://127.0.0.1:5000` or `http://localhost:5000`.

## 🚀 Usage

1.  **Upload Data:** Start by navigating to the "Data Upload" page. Drag and drop your CSV or Excel file onto the upload area, or click "Browse Files" to select it.
2.  **View Data:** Once uploaded, click "Continue to Data Viewing". Here you can preview the data table and see automatically generated summaries and statistics.
3.  **Clean Data:** Proceed to the "Data Cleaning" page. Use the options on the right panel to apply various cleaning operations to the selected columns. The data preview updates after each operation. [cite: 1]
4.  **Visualize Data:** Move to the "Data Visualization" page. Create charts manually by selecting columns and chart types, or click "Dashboard" to get AI-suggested visualizations. Arrange charts on the dashboard as needed.
5.  **Generate Story:** Finally, go to the "Data Storytelling" page. Click "Generate Story" to get an AI-generated narrative based on your cleaned and visualized data.

## API Integration

* This project utilizes the **Google Gemini API** for intelligent features:
    * **Chart Suggestions:** Analyzes data structure and content to recommend relevant chart types and column combinations on the Visualization page.
    * **Data Storytelling:** Generates natural language narratives summarizing key insights from the dataset on the Storytelling page.
* An active Google Gemini API key is required and must be configured in `gemini.py` for these features to work.
