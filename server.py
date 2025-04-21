# -*- coding: utf-8 -*-
from flask import Flask, request, jsonify
from flask_cors import CORS
from dash import Dash, html, dcc
import plotly.express as px
import pandas as pd
from dash.dependencies import Output, Input
from data_cleaning_operations import DataCleaner # Ensure this class is in data_cleaning_operations.py
from gemini import api_tool # Ensure this is correctly set up in gemini.py
import json
import time
import re
import numpy as np # Make sure numpy is imported

app = Flask(__name__)
# Apply CORS to all routes from any origin
CORS(app)

# Global variable to hold the DataCleaner instance
current_cleaner = None

@app.route('/initialize', methods=['POST'])
def initialize():
    """Initializes the DataCleaner with data from the frontend."""
    global current_cleaner
    data = request.json.get('data')
    print(f"Initialize called with data length: {len(data) if data else 0}") # Keep for debugging
    if not isinstance(data, list):
        print("Error: Invalid data format received for initialization.")
        return jsonify({'error': 'Invalid data format: Expected a list of dictionaries.'}), 400

    # Handle potentially empty data list
    if not data:
        print("Warning: Initializing DataCleaner with empty data.")
        try:
            current_cleaner = DataCleaner([])
            print("DataCleaner initialized with empty data.")
            return jsonify({'message': 'Data initialized successfully (empty)'})
        except Exception as e:
            print(f"Error initializing DataCleaner with empty data: {str(e)}")
            return jsonify({'error': f'Failed to initialize data cleaner: {str(e)}'}), 500
    else:
        # Validate structure of non-empty data
        if not all(isinstance(item, dict) for item in data):
            print("Error: Invalid data format: List items must be dictionaries.")
            return jsonify({'error': 'Invalid data format: List items must be dictionaries.'}), 400

        # Initialize DataCleaner
        try:
            current_cleaner = DataCleaner(data)
            print(f"DataCleaner initialized successfully with {len(data)} rows.")
            return jsonify({'message': 'Data initialized successfully'})
        except Exception as e:
            print(f"Error initializing DataCleaner: {str(e)}")
            return jsonify({'error': f'Failed to initialize data cleaner: {str(e)}'}), 500

# --- Helper function to check if cleaner is initialized ---
def check_cleaner():
    """Checks if the DataCleaner instance exists."""
    if not current_cleaner:
        print("Error: DataCleaner not initialized.") # Add server-side log
        return False, jsonify({'error': 'Data not initialized. Please upload or select data first.'}), 400
    return True, None, None

# --- CLEANING OPERATION ENDPOINTS ---

@app.route('/remove_duplicates', methods=['POST'])
def remove_duplicates_route():
    """Removes duplicate rows."""
    initialized, error_response, status_code = check_cleaner()
    if not initialized:
        return error_response, status_code

    # Optionally get parameters like 'consider_all_columns' from request.json
    # params = request.json or {}
    # consider_all = params.get('consider_all_columns', True)

    try:
        result = current_cleaner.remove_duplicates() # Add params if needed
        return jsonify(result)
    except Exception as e:
        print(f"Error during remove_duplicates: {str(e)}")
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500

@app.route('/handle_missing_values', methods=['POST'])
def handle_missing_values_route():
    """Handles missing values in a specified column."""
    initialized, error_response, status_code = check_cleaner()
    if not initialized:
        return error_response, status_code

    params = request.json
    if not params:
        return jsonify({'error': 'Missing request body.'}), 400

    column = params.get('column')
    method = params.get('method')
    custom_value = params.get('custom_value') # Will be None if not provided

    if not column or not method:
        return jsonify({'error': 'Missing parameters: column and method are required.'}), 400

    try:
        result = current_cleaner.handle_missing_values(column, method, custom_value)
        return jsonify(result)
    except Exception as e:
        print(f"Error during handle_missing_values for column '{column}': {str(e)}")
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500

@app.route('/convert_types', methods=['POST'])
def convert_types_route():
    """Converts the data type of a specified column."""
    initialized, error_response, status_code = check_cleaner()
    if not initialized:
        return error_response, status_code

    params = request.json
    if not params:
        return jsonify({'error': 'Missing request body.'}), 400

    column = params.get('column')
    target_type = params.get('target_type')
    # strict_conversion = params.get('strict', False) # Example if you add strict param

    if not column or not target_type:
        return jsonify({'error': 'Missing parameters: column and target_type are required.'}), 400

    try:
        result = current_cleaner.convert_types(column, target_type) # Add strict param if needed
        return jsonify(result)
    except Exception as e:
        print(f"Error during convert_types for column '{column}' to '{target_type}': {str(e)}")
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500

@app.route('/clean_text', methods=['POST'])
def clean_text_route():
    """Cleans text data in a specified column."""
    initialized, error_response, status_code = check_cleaner()
    if not initialized:
        return error_response, status_code

    params = request.json
    if not params:
        return jsonify({'error': 'Missing request body.'}), 400

    column = params.get('column')
    operations = params.get('operations')

    if not column or operations is None: # Check for operations existence
        return jsonify({'error': 'Missing parameters: column and operations are required.'}), 400
    if not isinstance(operations, list):
         return jsonify({'error': 'Invalid format: operations must be a list.'}), 400

    try:
        result = current_cleaner.clean_text(column, operations)
        return jsonify(result)
    except Exception as e:
        print(f"Error during clean_text for column '{column}': {str(e)}")
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500

@app.route('/normalize_data', methods=['POST'])
def normalize_data_route():
    """Normalizes numeric data using Min-Max scaling."""
    initialized, error_response, status_code = check_cleaner()
    if not initialized:
        return error_response, status_code

    params = request.json
    if not params:
        return jsonify({'error': 'Missing request body.'}), 400

    column = params.get('column')
    preserve_original = params.get('preserve_original', False)

    if not column:
        return jsonify({'error': 'Missing parameter: column is required.'}), 400

    try:
        result = current_cleaner.normalize_data(column, preserve_original)
        return jsonify(result)
    except Exception as e:
        print(f"Error during normalize_data for column '{column}': {str(e)}")
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500

@app.route('/standardize_data', methods=['POST'])
def standardize_data_route():
    """Standardizes numeric data using Z-score scaling."""
    initialized, error_response, status_code = check_cleaner()
    if not initialized:
        return error_response, status_code

    params = request.json
    if not params:
        return jsonify({'error': 'Missing request body.'}), 400

    column = params.get('column')
    preserve_original = params.get('preserve_original', False)

    if not column:
        return jsonify({'error': 'Missing parameter: column is required.'}), 400

    try:
        result = current_cleaner.standardize_data(column, preserve_original)
        return jsonify(result)
    except Exception as e:
        print(f"Error during standardize_data for column '{column}': {str(e)}")
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500

@app.route('/detect_outliers', methods=['POST'])
def detect_outliers_route():
    """Detects outliers in a numeric column."""
    initialized, error_response, status_code = check_cleaner()
    if not initialized:
        return error_response, status_code

    params = request.json
    if not params:
        return jsonify({'error': 'Missing request body.'}), 400

    column = params.get('column')
    method = params.get('method', 'iqr') # Default to iqr
    threshold = params.get('threshold', 3.0) # Default threshold for zscore

    if not column:
        return jsonify({'error': 'Missing parameter: column is required.'}), 400

    try:
        # Ensure threshold is float
        threshold = float(threshold)
        result = current_cleaner.detect_outliers(column, method, threshold)
        return jsonify(result)
    except ValueError:
         return jsonify({'error': 'Invalid threshold value. Threshold must be a number.'}), 400
    except Exception as e:
        print(f"Error during detect_outliers for column '{column}': {str(e)}")
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500

@app.route('/handle_outliers', methods=['POST'])
def handle_outliers_route():
    """Handles outliers in a numeric column."""
    initialized, error_response, status_code = check_cleaner()
    if not initialized:
        return error_response, status_code

    params = request.json
    if not params:
        return jsonify({'error': 'Missing request body.'}), 400

    column = params.get('column')
    method = params.get('method', 'clip') # Default handling method
    detection_method = params.get('detection_method', 'iqr') # Default detection method
    threshold = params.get('threshold', 3.0)

    if not column:
        return jsonify({'error': 'Missing parameter: column is required.'}), 400

    try:
        # Ensure threshold is float
        threshold = float(threshold)
        result = current_cleaner.handle_outliers(column, method, detection_method, threshold)
        return jsonify(result)
    except ValueError:
         return jsonify({'error': 'Invalid threshold value. Threshold must be a number.'}), 400
    except Exception as e:
        print(f"Error during handle_outliers for column '{column}': {str(e)}")
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500

@app.route('/add_derived_column', methods=['POST'])
def add_derived_column_route():
    """Adds a new column derived from existing columns."""
    initialized, error_response, status_code = check_cleaner()
    if not initialized:
        return error_response, status_code

    params = request.json
    if not params:
        return jsonify({'error': 'Missing request body.'}), 400

    operation = params.get('operation')
    columns = params.get('columns')
    new_column_name = params.get('new_column_name') # Optional, can be None or empty string

    if not operation or not columns:
        return jsonify({'error': 'Missing parameters: operation and columns are required.'}), 400
    if not isinstance(columns, list) or len(columns) == 0:
        return jsonify({'error': 'Invalid format: columns must be a non-empty list.'}), 400

    try:
        # Pass None if new_column_name is empty string or None
        effective_new_name = new_column_name if new_column_name else None
        result = current_cleaner.add_derived_column(operation, columns, effective_new_name)
        return jsonify(result)
    except Exception as e:
        print(f"Error during add_derived_column for operation '{operation}': {str(e)}")
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500

@app.route('/handle_inconsistent_data', methods=['POST'])
def handle_inconsistent_data_route():
    """Handles inconsistent categorical or text data."""
    initialized, error_response, status_code = check_cleaner()
    if not initialized:
        return error_response, status_code

    params = request.json
    if not params:
        return jsonify({'error': 'Missing request body.'}), 400

    column = params.get('column')
    mapping = params.get('mapping') # Optional dictionary, can be None
    case_sensitive = params.get('case_sensitive', False)

    if not column:
        return jsonify({'error': 'Missing parameter: column is required.'}), 400

    # Ensure mapping is a dictionary if provided, otherwise pass None
    effective_mapping = mapping if isinstance(mapping, dict) else None

    try:
        result = current_cleaner.handle_inconsistent_data(column, effective_mapping, case_sensitive)
        return jsonify(result)
    except Exception as e:
        print(f"Error during handle_inconsistent_data for column '{column}': {str(e)}")
        return jsonify({'error': f'An unexpected error occurred: {str(e)}'}), 500


@app.route('/reset_changes', methods=['POST'])
def reset_changes_route():
    """Resets the data back to its original state."""
    initialized, error_response, status_code = check_cleaner()
    if not initialized:
        # Decide if reset should be allowed even if not initialized (e.g., if init failed)
        # For now, require initialization to have something to reset from.
        return error_response, status_code

    try:
        result = current_cleaner.reset_changes()
        print("Data reset successful via API call.")
        # Note: The DataCleaner object itself is now reset internally.
        # No need to re-initialize it here unless the reset logic requires it.
        return jsonify(result)
    except Exception as e:
        print(f"Error during reset_changes: {str(e)}")
        return jsonify({'error': f'An unexpected error occurred during reset: {str(e)}'}), 500


# --- OTHER ROUTES ---

@app.route('/suggest_charts', methods=['POST'])
def suggest_charts():
    """Suggests chart types based on data headers and sample rows using Gemini API."""
    print("Suggest charts request received")
    data = request.json
    if not data:
        return jsonify({'error': 'Missing request body.'}), 400

    print("Request data:", data)
    headers = data.get('headers')
    sample_rows = data.get('sample_rows')

    if not headers or not sample_rows:
        return jsonify({'error': 'Missing required parameters: "headers" and "sample_rows" are required.'}), 400
    if not isinstance(headers, list) or not isinstance(sample_rows, list):
        return jsonify({'error': 'Invalid data format: "headers" and "sample_rows" must be lists.'}), 400

    max_retries = 3
    retry_delay = 5  # seconds

    # --- MODIFIED PROMPT ---
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
            - "y": The exact column header for the Y-axis/values (from provided headers only)
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
            "Regional Market Share": {{
                "type": "pie", 
                "x": "region", 
                "y": null,
                "insight": "Highlights untapped market opportunities in western regions",
            }}
        }}

        Ensure your visualization recommendations:
        1. Are tailored to reveal actionable business insights, not just display data
        2. Use appropriate chart types based on the nature of the variables and relationships
        3. Highlight patterns, outliers, or trends that would be valuable for decision-making
        4. Consider the cognitive principles of effective data visualization
        5. Use ONLY the exact column headers provided in the input data
        6. Include at least 5-7 diverse visualization recommendations to provide comprehensive coverage of the dataset

        Your output must be ONLY the valid JSON object with no additional text, explanations or formatting.
        """

    for attempt in range(max_retries):
        try:
            print(f"Generating chart suggestions with Gemini API (Attempt {attempt + 1}/{max_retries})")
            contents = [{"parts": [{"text": prompt}]}]
            # Ensure api_tool is correctly structured and function callable
            if "function" not in api_tool or not callable(api_tool["function"]): #
                 print("Error: api_tool is not configured correctly.") #
                 return jsonify({'error': 'Gemini API tool configuration error.'}), 500 #

            response = api_tool["function"](contents) #

            print("Raw Gemini response:", response) # Log the raw response

            if "error" in response: #
                raise ValueError(f"Gemini API error: {response['error']}") #

            # Adjust extraction based on actual Gemini API response structure
            candidates = response.get("candidates") #
            if not candidates: #
                raise ValueError("No candidates found in Gemini response.") #

            content = candidates[0].get("content") #
            if not content or "parts" not in content: #
                 raise ValueError("No content or parts found in Gemini candidate.") #

            parts = content.get("parts") #
            if not parts or "text" not in parts[0]: #
                 raise ValueError("No text found in Gemini response part.") #

            suggestions_text = parts[0].get("text", "").strip() #
            if not suggestions_text: #
                raise ValueError("Empty text returned by Gemini API") #

            # Clean the response just in case (though prompt asks for pure JSON)
            suggestions_text = re.sub(r'^```json\s*|\s*```$', '', suggestions_text).strip() #

            # Parse the cleaned response as JSON
            try:
                 suggestions = json.loads(suggestions_text) #
            except json.JSONDecodeError as json_e: #
                 print(f"JSONDecodeError: {json_e}. Response text was: '{suggestions_text}'") #
                 raise ValueError(f"Invalid JSON response from Gemini: {json_e}") #

            if not isinstance(suggestions, dict): #
                raise ValueError("Response is not a valid JSON object (dictionary)") #

            print("Suggestions generated:", suggestions) #
            return jsonify(suggestions) #

        except json.JSONDecodeError as e: # Catch error from json.loads specifically
            print(f"Failed to parse Gemini response as JSON: {str(e)}") #
            if attempt < max_retries - 1: #
                print(f"Retrying after {retry_delay} seconds...") #
                time.sleep(retry_delay) #
            else: #
                return jsonify({'error': f'Failed to generate chart suggestions: Invalid JSON response from API.'}), 500 #
        except ValueError as e: # Catch other validation errors
            print(f"ValueError during suggestion generation: {str(e)}") #
            if attempt < max_retries - 1: #
                print(f"Retrying after {retry_delay} seconds...") #
                time.sleep(retry_delay) #
            else: #
                 return jsonify({'error': f'Failed to generate chart suggestions: {str(e)}'}), 500 #
        except Exception as e: # Catch any other unexpected errors
            print(f"Unexpected error in Gemini API call (Attempt {attempt + 1}): {type(e).__name__} - {str(e)}") #
            if attempt < max_retries - 1: #
                print(f"Retrying after {retry_delay} seconds...") #
                time.sleep(retry_delay) #
            else: #
                return jsonify({'error': f'Failed to generate chart suggestions after {max_retries} attempts: {str(e)}'}), 500 #


# --- DASH APP SETUP ---
# Example data for Dash app if no file is loaded initially
sample_data = pd.DataFrame({
    "Date": pd.to_datetime(["2023-11-19", "2023-11-17", "2023-11-15"]),
    "Revenue": [39500, 18450, 25000],
    "Orders": [43, 253, 110]
})

# Initialize Dash app, served under /dashboard/
dash_app = Dash(__name__, server=app, url_base_pathname='/dashboard/')

dash_app.layout = html.Div([
    html.H2("Sales Monitoring Dashboard (Example)", style={'textAlign': 'center'}),
    dcc.Dropdown(
        id='chart-type-dropdown',
        options=[
            {'label': 'Bar Chart', 'value': 'bar'},
            {'label': 'Line Chart', 'value': 'line'},
            {'label': 'Scatter Plot', 'value': 'scatter'}
        ],
        value='bar',
        style={'width': '50%', 'margin': 'auto'}
    ),
    dcc.Graph(id='sales-graph')
])
@app.route('/generate_story', methods=['POST'])
def generate_story_route():
    """Generates a data story narrative using the Gemini API."""
    print("Generate story request received")
    data = request.json
    if not data:
        return jsonify({'error': 'Missing request body.'}), 400

    print("Request data for story:", data)
    headers = data.get('headers')
    sample_rows = data.get('sample_rows')
    # Potentially receive chart_info from frontend in the future:
    # chart_info = data.get('chart_info', None)

    if not headers or not sample_rows:
        return jsonify({'error': 'Missing required parameters: "headers" and "sample_rows" are required.'}), 400
    if not isinstance(headers, list) or not isinstance(sample_rows, list):
        return jsonify({'error': 'Invalid data format: "headers" and "sample_rows" must be lists.'}), 400

    max_retries = 3
    retry_delay = 5  # seconds

    # --- STORYTELLING PROMPT ---
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

    # Optional: Add chart information to the prompt if available
    # if chart_info:
    #     prompt += f"\n\nConsider these visualizations during your analysis:\n{json.dumps(chart_info)}"

    for attempt in range(max_retries):
        try:
            print(f"Generating story with Gemini API (Attempt {attempt + 1}/{max_retries})")
            contents = [{"parts": [{"text": prompt}]}]

            if "function" not in api_tool or not callable(api_tool["function"]):
                 print("Error: api_tool is not configured correctly.")
                 return jsonify({'error': 'Gemini API tool configuration error.'}), 500

            response = api_tool["function"](contents)

            print("Raw Gemini response for story:", response)

            if "error" in response:
                raise ValueError(f"Gemini API error: {response['error']}")

            candidates = response.get("candidates")
            if not candidates:
                raise ValueError("No candidates found in Gemini response.")

            content = candidates[0].get("content")
            if not content or "parts" not in content:
                 raise ValueError("No content or parts found in Gemini candidate.")

            parts = content.get("parts")
            if not parts or "text" not in parts[0]:
                 raise ValueError("No text found in Gemini response part.")

            story_text = parts[0].get("text", "").strip()
            if not story_text:
                raise ValueError("Empty text returned by Gemini API for story")

            # Basic cleanup (remove potential markdown backticks if any)
            story_text = re.sub(r'^```\w*\s*|\s*```$', '', story_text).strip()

            print("Generated story text:", story_text)
            # Return just the story text for now
            return jsonify({'story': story_text})

        except ValueError as e:
            print(f"ValueError during story generation: {str(e)}")
            if attempt < max_retries - 1:
                print(f"Retrying after {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                 return jsonify({'error': f'Failed to generate story: {str(e)}'}), 500
        except Exception as e:
            print(f"Unexpected error in Gemini API call (Attempt {attempt + 1}): {type(e).__name__} - {str(e)}")
            if attempt < max_retries - 1:
                print(f"Retrying after {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                return jsonify({'error': f'Failed to generate story after {max_retries} attempts: {str(e)}'}), 500

# --- MAIN EXECUTION ---
if __name__ == '__main__':
    # Runs the Flask app on port 5000, accessible on the network
    # Debug=True automatically reloads on code changes
    app.run(debug=True, host='0.0.0.0', port=5000) #