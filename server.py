# -*- coding: utf-8 -*-
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
from data_cleaning_operations import DataCleaner 
from gemini import api_tool 
import json
import time
import re
import numpy as np
import os 
from werkzeug.utils import secure_filename 

app = Flask(__name__)
# Apply CORS to all routes from any origin
CORS(app)

# --- Configuration ---
# Optional: Configure an upload folder
# UPLOAD_FOLDER = 'uploads' 
# app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
# if not os.path.exists(UPLOAD_FOLDER):
#     os.makedirs(UPLOAD_FOLDER)
ALLOWED_EXTENSIONS = {'csv', 'xlsx', 'xls'}

# Global variable to hold the DataCleaner instance
# WARNING: Using a global variable like this is not suitable for concurrent users.
# For a production app, consider using sessions or a more robust state management approach.
current_cleaner = None
# Store metadata about the loaded file
current_file_info = {
    "name": None,
    "type": None,
    "headers": [],
    "rows": [],
    "total_rows": 0
}

# --- Helper Functions ---

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def check_cleaner():
    """Checks if the DataCleaner instance exists."""
    if not current_cleaner:
        print("Error: DataCleaner not initialized.") # Add server-side log
        return False, jsonify({'error': 'Data not initialized. Please upload or select data first.'}), 400
    return True, None, None

# --- NEW File Upload Endpoint ---
@app.route('/upload_file', methods=['POST'])
def upload_file():
    """Receives an uploaded file, parses it, and initializes the DataCleaner."""
    global current_cleaner, current_file_info
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_ext = filename.rsplit('.', 1)[1].lower()
        print(f"Received file: {filename} (Type: {file_ext})")

        try:
            if file_ext == 'csv':
                # Increase robustness: try detecting separator, handle encoding issues
                try:
                    # Try standard comma separator first
                    df = pd.read_csv(file)
                except pd.errors.ParserError:
                    # If comma fails, reset stream position and try semicolon
                    file.seek(0) 
                    try:
                        df = pd.read_csv(file, sep=';')
                    except Exception as inner_e:
                         # If both fail, reset and try auto-detection (might be slower)
                         print(f"Comma and semicolon failed for {filename}, trying auto-detect sep. Error: {inner_e}")
                         file.seek(0)
                         df = pd.read_csv(file, sep=None, engine='python') # engine='python' needed for sep=None
                except Exception as e:
                     # Catch other potential CSV reading errors
                     print(f"Error reading CSV {filename}: {e}")
                     return jsonify({'error': f'Could not parse CSV file: {e}'}), 400

            elif file_ext in ['xlsx', 'xls']:
                 # Read the first sheet by default, assume header is in the first row (row 0)
                 # To specify sheet/header: pd.read_excel(file, sheet_name='SheetName', header=1)
                df = pd.read_excel(file, sheet_name=0, header=0) 
            
            else:
                 # This case should not be reached due to allowed_file check, but defensively:
                 return jsonify({'error': 'Invalid file type after check'}), 500

            # --- Post-processing similar to original JS ---
            # Handle potential NaN values from reading for JSON conversion
            df = df.replace({np.nan: None}) 
            # Convert data types for better JSON compatibility (e.g., dates)
            for col in df.select_dtypes(include=['datetime64[ns]']).columns:
                df[col] = df[col].astype(str)

            # Get data as list of dictionaries
            data_records = df.to_dict('records')
            
            # Initialize DataCleaner
            current_cleaner = DataCleaner(data_records) 
            
            # Store file info (including headers and data for immediate use)
            current_file_info = {
                "name": filename,
                "type": file_ext,
                "headers": df.columns.tolist(),
                "rows": data_records, # Store the parsed data
                "total_rows": len(data_records)
            }
            
            print(f"Successfully processed {filename}. Rows: {len(data_records)}, Columns: {len(df.columns)}")
            
            # Return success and potentially some initial data for the frontend
            return jsonify({
                'message': f'File "{filename}" uploaded and processed successfully.',
                'fileInfo': {
                    'name': filename,
                    'type': file_ext,
                    'columns': len(df.columns),
                    'rows': len(data_records),
                    'headers': df.columns.tolist()
                    # Avoid sending all rows back here, client can fetch paginated data
                }
            }), 200

        except Exception as e:
            print(f"Error processing file {filename}: {e}")
            # Be cautious about exposing detailed errors to the client
            return jsonify({'error': f'Could not process file: {str(e)}'}), 500
            
    else:
        return jsonify({'error': 'File type not allowed'}), 400


# --- Endpoint to get current data (used by cleaning/viewing pages) ---
@app.route('/get_data', methods=['GET'])
def get_data():
    """Returns the currently loaded file data."""
    if not current_cleaner or current_file_info['name'] is None:
        return jsonify({'error': 'No data loaded or initialized yet.'}), 404
    
    # Return the stored info, including the current state of rows from cleaner
    return jsonify({
        'name': current_file_info['name'],
        'type': current_file_info['type'],
        'data': {
            'headers': current_file_info['headers'],
            'rows': current_cleaner._get_data_as_records() # Get current state from cleaner
        }
    }), 200


# --- OLD Initialization Endpoint (Potentially redundant now) ---
# Kept for reference or potential fallback, but the primary flow uses /upload_file
@app.route('/initialize', methods=['POST'])
def initialize():
    """Initializes the DataCleaner with data from the frontend (LEGACY)."""
    global current_cleaner, current_file_info
    data = request.json.get('data')
    print(f"Initialize called with data length: {len(data) if data else 0} (Legacy endpoint)") # Keep for debugging
    
    # This endpoint likely shouldn't be used if /upload_file is the primary method.
    # If it IS used, we need to update current_file_info appropriately.
    # For now, just initialize the cleaner.
    
    if not isinstance(data, list):
        print("Error: Invalid data format received for initialization.")
        return jsonify({'error': 'Invalid data format: Expected a list of dictionaries.'}), 400

    if not data:
        print("Warning: Initializing DataCleaner with empty data via legacy endpoint.")
        try:
            current_cleaner = DataCleaner([])
            current_file_info = {"name": "Legacy Init (Empty)", "type": "unknown", "headers": [], "rows": [], "total_rows": 0}
            print("DataCleaner initialized with empty data.")
            return jsonify({'message': 'Data initialized successfully (empty)'})
        except Exception as e:
            print(f"Error initializing DataCleaner with empty data: {str(e)}")
            return jsonify({'error': f'Failed to initialize data cleaner: {str(e)}'}), 500
    else:
        if not all(isinstance(item, dict) for item in data):
            print("Error: Invalid data format: List items must be dictionaries.")
            return jsonify({'error': 'Invalid data format: List items must be dictionaries.'}), 400
        try:
            current_cleaner = DataCleaner(data)
            headers = list(data[0].keys()) if data else []
            current_file_info = {
                "name": "Legacy Init", 
                "type": "unknown", 
                "headers": headers, 
                "rows": data, # Store original data passed here
                 "total_rows": len(data)
            }
            print(f"DataCleaner initialized successfully via legacy endpoint with {len(data)} rows.")
            return jsonify({'message': 'Data initialized successfully (legacy)'})
        except Exception as e:
            print(f"Error initializing DataCleaner: {str(e)}")
            return jsonify({'error': f'Failed to initialize data cleaner: {str(e)}'}), 500

# --- CLEANING OPERATION ENDPOINTS (Largely Unchanged, use check_cleaner) ---

@app.route('/remove_duplicates', methods=['POST'])
def remove_duplicates_route():
    initialized, error_response, status_code = check_cleaner()
    if not initialized: return error_response, status_code
    try:
        result = current_cleaner.remove_duplicates()
        # Update stored rows after operation
        if 'data' in result: current_file_info['rows'] = result['data']
        return jsonify(result)
    except Exception as e:
        print(f"Error during remove_duplicates: {str(e)}")
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500

@app.route('/handle_missing_values', methods=['POST'])
def handle_missing_values_route():
    initialized, error_response, status_code = check_cleaner()
    if not initialized: return error_response, status_code
    params = request.json
    if not params or 'column' not in params or 'method' not in params:
        return jsonify({'error': 'Missing parameters: column and method are required.'}), 400
    try:
        result = current_cleaner.handle_missing_values(
            params['column'], params['method'], params.get('custom_value')
        )
        if 'data' in result: current_file_info['rows'] = result['data']
        return jsonify(result)
    except Exception as e:
        print(f"Error during handle_missing_values for column '{params.get('column')}': {str(e)}")
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500

@app.route('/convert_types', methods=['POST'])
def convert_types_route():
    initialized, error_response, status_code = check_cleaner()
    if not initialized: return error_response, status_code
    params = request.json
    if not params or 'column' not in params or 'target_type' not in params:
        return jsonify({'error': 'Missing parameters: column and target_type are required.'}), 400
    try:
        result = current_cleaner.convert_types(params['column'], params['target_type'])
        if 'data' in result: current_file_info['rows'] = result['data']
        return jsonify(result)
    except Exception as e:
        print(f"Error during convert_types for column '{params.get('column')}': {str(e)}")
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500

@app.route('/clean_text', methods=['POST'])
def clean_text_route():
    initialized, error_response, status_code = check_cleaner()
    if not initialized: return error_response, status_code
    params = request.json
    if not params or 'column' not in params or 'operations' not in params or not isinstance(params['operations'], list):
        return jsonify({'error': 'Missing or invalid parameters: column and operations list are required.'}), 400
    try:
        result = current_cleaner.clean_text(params['column'], params['operations'])
        if 'data' in result: current_file_info['rows'] = result['data']
        return jsonify(result)
    except Exception as e:
        print(f"Error during clean_text for column '{params.get('column')}': {str(e)}")
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500

@app.route('/normalize_data', methods=['POST'])
def normalize_data_route():
    initialized, error_response, status_code = check_cleaner()
    if not initialized: return error_response, status_code
    params = request.json
    if not params or 'column' not in params:
        return jsonify({'error': 'Missing parameter: column is required.'}), 400
    try:
        result = current_cleaner.normalize_data(params['column'], params.get('preserve_original', False))
        if 'data' in result: 
            current_file_info['rows'] = result['data']
            # If new column added, update headers
            if result.get('new_column') and result['new_column'] not in current_file_info['headers']:
                 current_file_info['headers'].append(result['new_column'])
        return jsonify(result)
    except Exception as e:
        print(f"Error during normalize_data for column '{params.get('column')}': {str(e)}")
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500

@app.route('/standardize_data', methods=['POST'])
def standardize_data_route():
    initialized, error_response, status_code = check_cleaner()
    if not initialized: return error_response, status_code
    params = request.json
    if not params or 'column' not in params:
        return jsonify({'error': 'Missing parameter: column is required.'}), 400
    try:
        result = current_cleaner.standardize_data(params['column'], params.get('preserve_original', False))
        if 'data' in result: 
            current_file_info['rows'] = result['data']
            # If new column added, update headers
            if result.get('new_column') and result['new_column'] not in current_file_info['headers']:
                 current_file_info['headers'].append(result['new_column'])
        return jsonify(result)
    except Exception as e:
        print(f"Error during standardize_data for column '{params.get('column')}': {str(e)}")
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500

@app.route('/detect_outliers', methods=['POST'])
def detect_outliers_route():
    initialized, error_response, status_code = check_cleaner()
    if not initialized: return error_response, status_code
    params = request.json
    if not params or 'column' not in params:
        return jsonify({'error': 'Missing parameter: column is required.'}), 400
    try:
        threshold = float(params.get('threshold', 3.0))
        result = current_cleaner.detect_outliers(params['column'], params.get('method', 'iqr'), threshold)
        # This just detects, doesn't modify data
        return jsonify(result)
    except ValueError:
         return jsonify({'error': 'Invalid threshold value. Threshold must be a number.'}), 400
    except Exception as e:
        print(f"Error during detect_outliers for column '{params.get('column')}': {str(e)}")
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500

@app.route('/handle_outliers', methods=['POST'])
def handle_outliers_route():
    initialized, error_response, status_code = check_cleaner()
    if not initialized: return error_response, status_code
    params = request.json
    if not params or 'column' not in params:
        return jsonify({'error': 'Missing parameter: column is required.'}), 400
    try:
        threshold = float(params.get('threshold', 3.0))
        result = current_cleaner.handle_outliers(
            params['column'], 
            params.get('method', 'clip'), 
            params.get('detection_method', 'iqr'), 
            threshold
        )
        if 'data' in result: current_file_info['rows'] = result['data']
        return jsonify(result)
    except ValueError:
         return jsonify({'error': 'Invalid threshold value. Threshold must be a number.'}), 400
    except Exception as e:
        print(f"Error during handle_outliers for column '{params.get('column')}': {str(e)}")
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500

@app.route('/add_derived_column', methods=['POST'])
def add_derived_column_route():
    initialized, error_response, status_code = check_cleaner()
    if not initialized: return error_response, status_code
    params = request.json
    if not params or 'operation' not in params or 'columns' not in params or not isinstance(params['columns'], list):
        return jsonify({'error': 'Missing or invalid parameters: operation and columns list are required.'}), 400
    try:
        result = current_cleaner.add_derived_column(
            params['operation'], params['columns'], params.get('new_column_name')
        )
        if 'data' in result: 
            current_file_info['rows'] = result['data']
            # Update headers if new column added
            if result.get('new_column') and result['new_column'] not in current_file_info['headers']:
                 current_file_info['headers'].append(result['new_column'])
        return jsonify(result)
    except Exception as e:
        print(f"Error during add_derived_column for operation '{params.get('operation')}': {str(e)}")
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500

@app.route('/handle_inconsistent_data', methods=['POST'])
def handle_inconsistent_data_route():
    initialized, error_response, status_code = check_cleaner()
    if not initialized: return error_response, status_code
    params = request.json
    if not params or 'column' not in params:
        return jsonify({'error': 'Missing parameter: column is required.'}), 400
    try:
        mapping = params.get('mapping')
        effective_mapping = mapping if isinstance(mapping, dict) else None
        result = current_cleaner.handle_inconsistent_data(
            params['column'], effective_mapping, params.get('case_sensitive', False)
        )
        if 'data' in result: current_file_info['rows'] = result['data']
        return jsonify(result)
    except Exception as e:
        print(f"Error during handle_inconsistent_data for column '{params.get('column')}': {str(e)}")
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500

@app.route('/reset_changes', methods=['POST'])
def reset_changes_route():
    initialized, error_response, status_code = check_cleaner()
    if not initialized: return error_response, status_code
    try:
        result = current_cleaner.reset_changes()
        if 'data' in result: 
            current_file_info['rows'] = result['data']
            # Reset headers? The original data might have different headers if columns were added/removed
            # For simplicity, let's refetch headers from the reset data
            if result['data']:
                current_file_info['headers'] = list(result['data'][0].keys())
            else:
                current_file_info['headers'] = []
        print("Data reset successful via API call.")
        return jsonify(result)
    except Exception as e:
        print(f"Error during reset_changes: {str(e)}")
        return jsonify({'error': f'An unexpected error occurred during reset: {str(e)}'}), 500

# --- OTHER ROUTES (Suggest Charts, Generate Story - Need Modification?) ---
# These likely need sample data from the *current* state of current_cleaner now.

@app.route('/suggest_charts', methods=['POST'])
def suggest_charts():
    """Suggests chart types based on CURRENT data headers and sample rows."""
    print("Suggest charts request received")
    # We don't need data from request body anymore, use current state
    if not current_cleaner or not current_file_info['headers']:
         return jsonify({'error': 'No data loaded to suggest charts from.'}), 400

    headers = current_file_info['headers']
    # Get sample rows from the DataCleaner's current DataFrame state
    try:
         sample_df = current_cleaner.df.head(20) # Get first 20 rows
         # Convert sample to records, handling potential NaN/NaT
         sample_rows = sample_df.replace({np.nan: None, pd.NaT: None}).to_dict('records')
    except Exception as e:
         print(f"Error getting sample rows for suggestions: {e}")
         return jsonify({'error': 'Could not retrieve sample data for suggestions.'}), 500

    if not headers or not sample_rows:
        return jsonify({'error': 'Missing required parameters: "headers" and "sample_rows" are required.'}), 400
    
    # --- Rest of the function is the same as before ---
    max_retries = 3
    retry_delay = 5  # seconds
    prompt = f"""
        You are an elite data visualization consultant specializing in creating insightful Chart.js visualizations for web applications. Your expertise is in uncovering meaningful patterns, trends, and relationships in data.

        Analyze the following dataset:
        Headers: {json.dumps(headers)}
        Sample rows: {json.dumps(sample_rows)}

        Create a comprehensive visualization strategy that reveals the most valuable insights from this dataset. Examine the data types, relationships, and potential patterns before making recommendations.

        Return ONLY a valid JSON object with the following structure:
        - Each key is a concise yet descriptive chart title that conveys the specific insight (e.g., "Monthly Revenue Growth Rate" instead of just "Revenue Chart")
        - Each value is a JSON object containing:
            - "type": The Chart.js chart type that best fits the insight: 'bar', 'line', 'scatter', 'pie', 'polarArea', 'radar', 'doughnut', or 'histogram' (for distributions)
            - "x": The exact column header for the X-axis/categories (from provided headers only)
            - "y": The exact column header for the Y-axis/values (from provided headers only, null if not applicable e.g., for pie count)
            - "insight": A brief description of what business insight this visualization reveals
        For numeric columns, consider:
        - Time series analysis if date/time data exists
        - Distribution patterns via histograms
        - Correlations between numeric variables
        - Aggregations by categorical variables

        For categorical columns, consider:
        - Frequency distributions
        - Proportional relationships
        - Comparative analyses across categories

        Example response format:
        {{
            "Monthly Revenue Growth Trend": {{
                "type": "line", 
                "x": "date", 
                "y": "revenue",
                "insight": "Shows accelerating revenue growth in Q3 compared to Q1-Q2",
            }},
            "Product Category Profit Margins": {{
                "type": "bar", 
                "x": "category", 
                "y": "profit_margin",
                "insight": "Identifies highest and lowest performing product categories",
            }},
            "Customer Age vs. Purchase Value": {{
                "type": "scatter", 
                "x": "customer_age", 
                "y": "purchase_amount",
                "insight": "Reveals spending patterns across different age demographics",
            }},
            "Regional Market Share (by count)": {{
                "type": "pie", 
                "x": "region", 
                "y": null,
                "insight": "Highlights market share based on number of entries per region",
            }}
        }}

        Ensure your visualization recommendations:
        1. Are tailored to reveal actionable business insights, not just display data
        2. Use appropriate chart types based on the nature of the variables and relationships
        3. Highlight patterns, outliers, or trends that would be valuable for decision-making
        4. Consider the cognitive principles of effective data visualization
        5. Use ONLY the exact column headers provided in the input data
        6. Include at least 5-7 diverse visualization recommendations to provide comprehensive coverage of the dataset
        7. only give charts which can be made with chart.js (Scatter Plot, Line Chart, Bar Chart, Pie Chart, Donut Chart, Bubble Chart, Area Chart, Radar Chart)

        Your output must be ONLY the valid JSON object with no additional text, explanations or formatting.
        """
    for attempt in range(max_retries):
        try:
            print(f"Generating chart suggestions with Gemini API (Attempt {attempt + 1}/{max_retries})")
            contents = [{"parts": [{"text": prompt}]}]
            if "function" not in api_tool or not callable(api_tool["function"]):
                 print("Error: api_tool is not configured correctly.")
                 return jsonify({'error': 'Gemini API tool configuration error.'}), 500
            response = api_tool["function"](contents)
            print("Raw Gemini response:", response)
            if "error" in response: raise ValueError(f"Gemini API error: {response['error']}")
            candidates = response.get("candidates")
            if not candidates: raise ValueError("No candidates found in Gemini response.")
            content = candidates[0].get("content")
            if not content or "parts" not in content: raise ValueError("No content or parts found in Gemini candidate.")
            parts = content.get("parts")
            if not parts or "text" not in parts[0]: raise ValueError("No text found in Gemini response part.")
            suggestions_text = parts[0].get("text", "").strip()
            if not suggestions_text: raise ValueError("Empty text returned by Gemini API")
            suggestions_text = re.sub(r'^```json\s*|\s*```$', '', suggestions_text).strip()
            try: suggestions = json.loads(suggestions_text)
            except json.JSONDecodeError as json_e:
                 print(f"JSONDecodeError: {json_e}. Response text was: '{suggestions_text}'")
                 raise ValueError(f"Invalid JSON response from Gemini: {json_e}")
            if not isinstance(suggestions, dict): raise ValueError("Response is not a valid JSON object (dictionary)")
            print("Suggestions generated:", suggestions)
            return jsonify(suggestions)
        except (json.JSONDecodeError, ValueError) as e:
            print(f"Error during suggestion generation: {str(e)}")
            if attempt < max_retries - 1: print(f"Retrying after {retry_delay} seconds..."); time.sleep(retry_delay)
            else: return jsonify({'error': f'Failed to generate chart suggestions: {str(e)}'}), 500
        except Exception as e:
            print(f"Unexpected error in Gemini API call (Attempt {attempt + 1}): {type(e).__name__} - {str(e)}")
            if attempt < max_retries - 1: print(f"Retrying after {retry_delay} seconds..."); time.sleep(retry_delay)
            else: return jsonify({'error': f'Failed to generate chart suggestions after {max_retries} attempts: {str(e)}'}), 500


@app.route('/generate_story', methods=['POST'])
def generate_story_route():
    """Generates a data story narrative using the Gemini API based on CURRENT data."""
    print("Generate story request received")
    # Use current server state instead of request body
    if not current_cleaner or not current_file_info['headers']:
         return jsonify({'error': 'No data loaded to generate a story from.'}), 400
    
    headers = current_file_info['headers']
    try:
         # Use a larger sample for story generation
         sample_df = current_cleaner.df.head(50) # Sample first 50 rows
         sample_rows = sample_df.replace({np.nan: None, pd.NaT: None}).to_dict('records')
    except Exception as e:
         print(f"Error getting sample rows for story: {e}")
         return jsonify({'error': 'Could not retrieve sample data for story generation.'}), 500

    if not headers or not sample_rows:
        return jsonify({'error': 'Missing required parameters: "headers" and "sample_rows" are required.'}), 400
    
    # --- Rest of the function is the same as before ---
    max_retries = 3
    retry_delay = 5
    prompt = f"""
    You are an expert data storyteller. Analyze the following dataset sample and generate a concise and engaging narrative summarizing the key insights, trends, and potential takeaways. Focus on what the data reveals rather than just describing the columns.

    Dataset Sample:
    Headers: {json.dumps(headers)}
    Sample rows: {json.dumps(sample_rows)}

    Instructions:
    1.  Identify significant insights or patterns in the data.
    2.  Explain these insights in clear, simple language, as if presenting to a non-technical audience.
    3.  Highlight any surprising findings, potential correlations, or trends over time if applicable.
    4.  Conclude with a brief summary or a potential next step for investigation.
    5.  The narrative should be approximately 3 paragraphs long.
    6.  Return ONLY the narrative text. Do not include any headers, titles, or introductory phrases like "Here is the story:".

    Example Tone: Insightful, clear, concise, objective.
    """
    for attempt in range(max_retries):
        try:
            print(f"Generating story with Gemini API (Attempt {attempt + 1}/{max_retries})")
            contents = [{"parts": [{"text": prompt}]}]
            if "function" not in api_tool or not callable(api_tool["function"]):
                 print("Error: api_tool is not configured correctly.")
                 return jsonify({'error': 'Gemini API tool configuration error.'}), 500
            response = api_tool["function"](contents)
            print("Raw Gemini response for story:", response)
            if "error" in response: raise ValueError(f"Gemini API error: {response['error']}")
            candidates = response.get("candidates")
            if not candidates: raise ValueError("No candidates found in Gemini response.")
            content = candidates[0].get("content")
            if not content or "parts" not in content: raise ValueError("No content or parts found in Gemini candidate.")
            parts = content.get("parts")
            if not parts or "text" not in parts[0]: raise ValueError("No text found in Gemini response part.")
            story_text = parts[0].get("text", "").strip()
            if not story_text: raise ValueError("Empty text returned by Gemini API for story")
            story_text = re.sub(r'^```\w*\s*|\s*```$', '', story_text).strip()
            print("Generated story text:", story_text)
            return jsonify({'story': story_text})
        except ValueError as e:
            print(f"ValueError during story generation: {str(e)}")
            if attempt < max_retries - 1: print(f"Retrying after {retry_delay} seconds..."); time.sleep(retry_delay)
            else: return jsonify({'error': f'Failed to generate story: {str(e)}'}), 500
        except Exception as e:
            print(f"Unexpected error in Gemini API call (Attempt {attempt + 1}): {type(e).__name__} - {str(e)}")
            if attempt < max_retries - 1: print(f"Retrying after {retry_delay} seconds..."); time.sleep(retry_delay)
            else: return jsonify({'error': f'Failed to generate story after {max_retries} attempts: {str(e)}'}), 500


# --- MAIN EXECUTION ---
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)