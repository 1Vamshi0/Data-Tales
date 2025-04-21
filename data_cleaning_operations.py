import pandas as pd
import numpy as np
from typing import List, Dict, Union, Optional, Tuple

class DataCleaner:
    def __init__(self, data: List[Dict]):
        """
        Initialize the DataCleaner with the data to be cleaned.

        Args:
            data: List of dictionaries containing the data rows
        """
        # Store original data to allow resetting changes
        self.original_data = [row.copy() for row in data]  # Use deep copy for safety
        self.df = pd.DataFrame(data)

    def _check_column_exists(self, column: str) -> bool:
        """Check if a column exists in the DataFrame."""
        return column in self.df.columns

    def _check_dataframe_empty(self) -> bool:
        """Check if the DataFrame is empty."""
        return self.df.empty

    def _get_data_as_records(self) -> List[Dict]:
        """Convert the current DataFrame state to a list of dictionaries."""
        # Handle potential NaN values, replacing them with None for JSON compatibility
        return self.df.replace({np.nan: None}).to_dict('records')

    def remove_duplicates(self, consider_all_columns: bool = True) -> Dict:
        """
        Remove duplicate rows from the data.

        Args:
            consider_all_columns: If True, consider all columns to identify duplicates; otherwise, use specific columns (not implemented here).

        Returns:
            Dictionary containing the cleaned data and number of duplicates removed,
            or an error dictionary.
        """
        if self._check_dataframe_empty():
            return {'data': [], 'removed_count': 0}

        original_length = len(self.df)
        try:
            subset = None if consider_all_columns else None  # Extend with specific columns if needed
            self.df = self.df.drop_duplicates(subset=subset)
            removed_count = original_length - len(self.df)
            return {
                'data': self._get_data_as_records(),
                'removed_count': removed_count
            }
        except Exception as e:
            return {'error': f"Failed to remove duplicates: {str(e)}"}

    def handle_missing_values(self, column: str, method: str, custom_value: Optional[Union[str, float]] = None) -> Dict:
        """
        Handle missing values in a specified column.

        Args:
            column: Name of the column to clean.
            method: Method to handle missing values ('remove', 'mean', 'median', 'mode', 'custom').
            custom_value: Custom value to fill missing values with (required if method is 'custom').

        Returns:
            Dictionary containing the cleaned data and operation details, or an error dictionary.
        """
        if self._check_dataframe_empty():
            return {'error': 'Cannot handle missing values on empty data.'}
        if not self._check_column_exists(column):
            return {'error': f"Column '{column}' not found."}

        missing_count = self.df[column].isna().sum()
        if missing_count == 0:
            return {
                'data': self._get_data_as_records(),
                'missing_count': 0,
                'method': method,
                'message': f"No missing values found in column '{column}'."
            }

        original_dtype = self.df[column].dtype

        try:
            if method == 'remove':
                self.df = self.df.dropna(subset=[column])
            elif method in ['mean', 'median']:
                # Ensure column is numeric for mean/median
                if not pd.api.types.is_numeric_dtype(self.df[column]):
                    numeric_col = pd.to_numeric(self.df[column], errors='coerce')
                    if numeric_col.isna().all():
                        return {'error': f"Cannot calculate {method} for non-numeric column '{column}'."}
                    fill_value = numeric_col.mean() if method == 'mean' else numeric_col.median()
                    self.df[column] = self.df[column].fillna(fill_value)
                else:
                    fill_value = self.df[column].mean() if method == 'mean' else self.df[column].median()
                    self.df[column] = self.df[column].fillna(fill_value)
            elif method == 'mode':
                mode_value = self.df[column].mode()
                if not mode_value.empty:
                    self.df[column] = self.df[column].fillna(mode_value[0])
                else:
                    return {'error': f"Cannot calculate mode for column '{column}' (possibly all NaN or empty)."}
            elif method == 'custom':
                if custom_value is None:
                    return {'error': "Custom value must be provided for method 'custom'."}
                try:
                    typed_value = pd.Series([custom_value]).astype(original_dtype).iloc[0]
                    self.df[column] = self.df[column].fillna(typed_value)
                except (ValueError, TypeError):
                    self.df[column] = self.df[column].fillna(custom_value)
            else:
                return {'error': f"Invalid method '{method}'. Choose from 'remove', 'mean', 'median', 'mode', 'custom'."}

            return {
                'data': self._get_data_as_records(),
                'missing_count': int(missing_count),
                'method': method
            }
        except Exception as e:
            return {'error': f"Failed to handle missing values in '{column}' using method '{method}': {str(e)}"}

    def convert_types(self, column: str, target_type: str) -> Dict:
        """
        Convert data type of a specified column.

        Args:
            column: Name of the column to convert.
            target_type: Target data type ('text', 'number', 'date', 'boolean').

        Returns:
            Dictionary containing the converted data and operation details, or an error dictionary.
        """
        if self._check_dataframe_empty():
            return {'error': 'Cannot convert types on empty data.'}
        if not self._check_column_exists(column):
            return {'error': f"Column '{column}' not found."}

        original_type = str(self.df[column].dtype)
        conversion_errors = 0

        try:
            if target_type == 'text':
                self.df[column] = self.df[column].astype(str)
            elif target_type == 'number':
                original_nan_count = self.df[column].isna().sum()
                converted_col = pd.to_numeric(self.df[column], errors='coerce')
                final_nan_count = converted_col.isna().sum()
                conversion_errors = final_nan_count - original_nan_count
                self.df[column] = converted_col
            elif target_type == 'date':
                original_nat_count = self.df[column].isna().sum()
                converted_col = pd.to_datetime(self.df[column], errors='coerce')
                final_nat_count = converted_col.isna().sum()
                conversion_errors = final_nat_count - original_nat_count
                self.df[column] = converted_col
            elif target_type == 'boolean':
                bool_map = {'true': True, 'false': False, '1': True, '0': False, 1: True, 0: False, 'yes': True, 'no': False}
                original_nan_count = self.df[column].isna().sum()
                converted_col = self.df[column].astype(str).str.lower().map(bool_map)
                final_nan_count = converted_col.isna().sum()
                conversion_errors = final_nan_count - original_nan_count
                self.df[column] = converted_col
            else:
                return {'error': f"Invalid target type '{target_type}'. Choose from 'text', 'number', 'date', 'boolean'."}

            result = {
                'data': self._get_data_as_records(),
                'column': column,
                'original_type': original_type,
                'new_type': target_type
            }
            if conversion_errors > 0:
                result['warning'] = f"{conversion_errors} value(s) could not be converted and were set to null."

            return result
        except Exception as e:
            return {'error': f"Failed to convert column '{column}' to type '{target_type}': {str(e)}"}

    def clean_text(self, column: str, operations: List[str]) -> Dict:
        """
        Clean text data in a specified column.

        Args:
            column: Name of the column to clean.
            operations: List of operations to perform ('trim', 'lowercase', 'uppercase', 'remove_punctuation', 'remove_digits').

        Returns:
            Dictionary containing the cleaned data and operation details, or an error dictionary.
        """
        if self._check_dataframe_empty():
            return {'error': 'Cannot clean text on empty data.'}
        if not self._check_column_exists(column):
            return {'error': f"Column '{column}' not found."}

        if not pd.api.types.is_string_dtype(self.df[column]) and not pd.api.types.is_object_dtype(self.df[column]):
            self.df[column] = self.df[column].astype(str)

        try:
            temp_col = self.df[column].astype(str)
            valid_operations = []
            for operation in operations:
                if operation == 'trim':
                    temp_col = temp_col.str.strip()
                    valid_operations.append(operation)
                elif operation == 'lowercase':
                    temp_col = temp_col.str.lower()
                    valid_operations.append(operation)
                elif operation == 'uppercase':
                    temp_col = temp_col.str.upper()
                    valid_operations.append(operation)
                elif operation == 'remove_punctuation':
                    temp_col = temp_col.str.replace(r'[^\w\s]', '', regex=True)
                    valid_operations.append(operation)
                elif operation == 'remove_digits':
                    temp_col = temp_col.str.replace(r'\d', '', regex=True)
                    valid_operations.append(operation)

            self.df[column] = temp_col

            return {
                'data': self._get_data_as_records(),
                'column': column,
                'operations': valid_operations
            }
        except Exception as e:
            return {'error': f"Failed to clean text in column '{column}': {str(e)}"}

    def _scale_column(self, column: str, method: str = 'normalize', preserve_original: bool = False) -> Dict:
        """
        Internal helper to scale numeric data (Min-Max or Z-score).

        Args:
            column: Name of the column to scale.
            method: Scaling method ('normalize' or 'standardize').
            preserve_original: If True, create a new column instead of overwriting.

        Returns:
            Dictionary with scaled data and details, or an error dictionary.
        """
        if self._check_dataframe_empty():
            return {'error': 'Cannot scale data on empty DataFrame.'}
        if not self._check_column_exists(column):
            return {'error': f"Column '{column}' not found."}

        try:
            numeric_col = pd.to_numeric(self.df[column], errors='coerce')
            if numeric_col.isna().all():
                return {'error': f"Column '{column}' cannot be scaled as it does not contain numeric data."}

            original_nans = numeric_col.isna()
            valid_data = numeric_col.dropna()
            if valid_data.empty:
                return {'error': f"No valid numeric data found in column '{column}' to scale."}

            target_column = f"{column}_{method}d" if preserve_original else column
            if preserve_original and target_column in self.df.columns:
                return {'error': f"Column '{target_column}' already exists."}

            min_val, max_val, mean_val, std_val = None, None, None, None

            if method == 'normalize':
                min_val = valid_data.min()
                max_val = valid_data.max()
                range_val = max_val - min_val
                if range_val == 0:
                    scaled_col = pd.Series(0.0, index=numeric_col.index)
                else:
                    scaled_col = (numeric_col - min_val) / range_val
                scaling_details = {'min': min_val, 'max': max_val}
            elif method == 'standardize':
                mean_val = valid_data.mean()
                std_val = valid_data.std()
                if std_val == 0:
                    scaled_col = pd.Series(0.0, index=numeric_col.index)
                else:
                    scaled_col = (numeric_col - mean_val) / std_val
                scaling_details = {'mean': mean_val, 'std_dev': std_val}
            else:
                return {'error': "Invalid scaling method. Use 'normalize' or 'standardize'."}

            scaled_col[original_nans] = np.nan
            self.df[target_column] = scaled_col

            result = {
                'data': self._get_data_as_records(),
                'column': column,
                'method': method,
                'details': scaling_details
            }
            if preserve_original:
                result['new_column'] = target_column

            return result
        except Exception as e:
            return {'error': f"Failed to {method} column '{column}': {str(e)}"}

    def normalize_data(self, column: str, preserve_original: bool = False) -> Dict:
        """
        Normalize numeric data in a specified column using Min-Max scaling (0 to 1).

        Args:
            column: Name of the column to normalize.
            preserve_original: If True, create a new column instead of overwriting.

        Returns:
            Dictionary containing the normalized data and operation details, or an error dictionary.
        """
        return self._scale_column(column, method='normalize', preserve_original=preserve_original)

    def standardize_data(self, column: str, preserve_original: bool = False) -> Dict:
        """
        Standardize numeric data in a specified column using Z-score scaling (mean 0, std dev 1).

        Args:
            column: Name of the column to standardize.
            preserve_original: If True, create a new column instead of overwriting.

        Returns:
            Dictionary containing the standardized data and operation details, or an error dictionary.
        """
        return self._scale_column(column, method='standardize', preserve_original=preserve_original)

    def reset_changes(self) -> Dict:
        """
        Reset all changes and return to the original data state.

        Returns:
            Dictionary containing the original data.
        """
        try:
            self.df = pd.DataFrame(self.original_data)
            return {
                'data': self._get_data_as_records(),
                'message': 'Data reset to original state successfully.'
            }
        except Exception as e:
            self.df = pd.DataFrame()
            return {'error': f"Failed to reset data: {str(e)}", 'data': []}

    def detect_outliers(self, column: str, method: str = 'zscore', threshold: float = 3.0) -> Dict:
        """
        Detect outliers in a numeric column using specified method.
        
        Args:
            column: Name of the column to analyze.
            method: Detection method ('zscore' or 'iqr').
            threshold: Threshold for outlier detection.
            
        Returns:
            Dictionary containing outlier indices and details, or an error dictionary.
        """
        if self._check_dataframe_empty():
            return {'error': 'Cannot detect outliers on empty data.'}
        if not self._check_column_exists(column):
            return {'error': f"Column '{column}' not found."}
        
        try:
            numeric_col = pd.to_numeric(self.df[column], errors='coerce')
            valid_data = numeric_col.dropna()
            if valid_data.empty:
                return {'error': f"No valid numeric data found in column '{column}'."}
            
            outliers = pd.Series(False, index=self.df.index)
            details = {}
            
            if method == 'zscore':
                mean = valid_data.mean()
                std = valid_data.std()
                if std == 0:
                    return {
                        'column': column,
                        'method': method,
                        'outlier_count': 0,
                        'message': f"No outliers detected (all values identical in '{column}')."
                    }
                
                z_scores = (numeric_col - mean) / std
                outliers = abs(z_scores) > threshold
                details = {
                    'mean': mean,
                    'std_dev': std,
                    'threshold': threshold
                }
                
            elif method == 'iqr':
                q1 = valid_data.quantile(0.25)
                q3 = valid_data.quantile(0.75)
                iqr = q3 - q1
                if iqr == 0:
                    return {
                        'column': column,
                        'method': method,
                        'outlier_count': 0,
                        'message': f"No outliers detected (IQR is 0 in '{column}')."
                    }
                
                lower_bound = q1 - (1.5 * iqr)
                upper_bound = q3 + (1.5 * iqr)
                outliers = (numeric_col < lower_bound) | (numeric_col > upper_bound)
                details = {
                    'q1': q1,
                    'q3': q3,
                    'iqr': iqr,
                    'lower_bound': lower_bound,
                    'upper_bound': upper_bound
                }
                
            else:
                return {'error': f"Invalid method '{method}'. Choose 'zscore' or 'iqr'."}
            
            outlier_indices = outliers[outliers].index.tolist()
            return {
                'column': column,
                'method': method,
                'outlier_count': len(outlier_indices),
                'outlier_indices': outlier_indices,
                'details': details
            }
            
        except Exception as e:
            return {'error': f"Failed to detect outliers in '{column}': {str(e)}"}

    def handle_outliers(self, column: str, method: str = 'clip', detection_method: str = 'iqr', threshold: float = 3.0) -> Dict:
        """
        Handle outliers in a numeric column.
        
        Args:
            column: Name of the column to process.
            method: Handling method ('clip', 'remove', 'mean', 'median').
            detection_method: Outlier detection method ('zscore' or 'iqr').
            threshold: Threshold for outlier detection (for zscore).
            
        Returns:
            Dictionary containing the processed data and operation details, or an error dictionary.
        """
        detection_result = self.detect_outliers(column, detection_method, threshold)
        if 'error' in detection_result:
            return detection_result
        
        if detection_result['outlier_count'] == 0:
            return {
                'data': self._get_data_as_records(),
                'column': column,
                'method': method,
                'message': f"No outliers detected in '{column}' using {detection_method}.",
                'outlier_count': 0
            }
        
        try:
            numeric_col = pd.to_numeric(self.df[column], errors='coerce')
            valid_data = numeric_col.dropna()
            
            if method == 'clip':
                if detection_method == 'iqr':
                    lower_bound = detection_result['details']['lower_bound']
                    upper_bound = detection_result['details']['upper_bound']
                else:
                    mean = detection_result['details']['mean']
                    std = detection_result['details']['std_dev']
                    lower_bound = mean - (threshold * std)
                    upper_bound = mean + (threshold * std)
                    
                self.df[column] = numeric_col.clip(lower_bound, upper_bound)
                
            elif method == 'remove':
                self.df = self.df.drop(detection_result['outlier_indices'])
                
            elif method in ['mean', 'median']:
                replacement_value = valid_data.mean() if method == 'mean' else valid_data.median()
                self.df.loc[detection_result['outlier_indices'], column] = replacement_value
                
            else:
                return {'error': f"Invalid method '{method}'. Choose 'clip', 'remove', 'mean', or 'median'."}
            
            return {
                'data': self._get_data_as_records(),
                'column': column,
                'method': method,
                'detection_method': detection_method,
                'outlier_count': detection_result['outlier_count'],
                'details': detection_result['details']
            }
            
        except Exception as e:
            return {'error': f"Failed to handle outliers in '{column}': {str(e)}"}

    def add_derived_column(self, operation: str, columns: List[str], new_column_name: str = None) -> Dict:
        """
        Add a new column derived from existing columns.

        Args:
            operation: Operation to perform ('sum', 'mean', 'median', 'mode', 'product', 'difference').
            columns: List of columns to use in the operation.
            new_column_name: Name for the new column (auto-generated if None).

        Returns:
            Dictionary containing the updated data and operation details, or an error dictionary.
        """
        if self._check_dataframe_empty():
            return {'error': 'Cannot add derived column to empty data.'}
        if not columns:
            return {'error': 'No columns specified for operation.'}

        # Check if all specified columns exist
        for col in columns:
            if not self._check_column_exists(col):
                return {'error': f"Column '{col}' not found."}

        # Auto-generate column name if not provided
        if new_column_name is None:
            # Limit the length of combined column names in the auto-generated name for readability
            col_name_part = '_and_'.join(columns)
            if len(col_name_part) > 50:  # Adjust limit as needed
                col_name_part = f"{len(columns)}_columns"
            new_column_name = f"{operation}_of_{col_name_part}"

        # Check if the new column name already exists
        if new_column_name in self.df.columns:
            return {'error': f"Column '{new_column_name}' already exists."}

        try:
            # Attempt numeric conversion upfront for relevant operations
            if operation in ['sum', 'mean', 'median', 'product']:
                # Convert selected columns to numeric, coercing errors to NaN
                numeric_df = self.df[columns].apply(pd.to_numeric, errors='coerce')

                if operation == 'sum':
                    # Sum numeric columns, fill resulting NaN (if all inputs were NaN) with 0
                    self.df[new_column_name] = numeric_df.sum(axis=1).fillna(0)
                elif operation == 'mean':
                    # Calculate mean, result might be NaN if all inputs are NaN for a row
                    self.df[new_column_name] = numeric_df.mean(axis=1)
                elif operation == 'median':
                    # Calculate median, result might be NaN
                    self.df[new_column_name] = numeric_df.median(axis=1)
                elif operation == 'product':
                    # Calculate product, fill resulting NaN with 1 (identity for product)
                    self.df[new_column_name] = numeric_df.product(axis=1).fillna(1)

            elif operation == 'difference':
                if len(columns) != 2:
                    return {'error': "Difference operation requires exactly 2 columns."}
                # Convert the two specific columns individually
                col1_numeric = pd.to_numeric(self.df[columns[0]], errors='coerce')
                col2_numeric = pd.to_numeric(self.df[columns[1]], errors='coerce')
                # Perform subtraction, result might be NaN if either input is NaN
                self.df[new_column_name] = col1_numeric - col2_numeric

            elif operation == 'mode':
                # Mode can work on non-numeric data
                self.df[new_column_name] = self.df[columns].mode(axis=1).iloc[:, 0]

            else:
                return {'error': f"Invalid operation '{operation}'. Choose 'sum', 'mean', 'median', 'mode', 'product', or 'difference'."}

            # If operation was successful, return the updated data
            return {
                'data': self._get_data_as_records(),
                'operation': operation,
                'source_columns': columns,
                'new_column': new_column_name
            }

        except Exception as e:
            return {'error': f"Failed to add derived column '{new_column_name}'. Check if columns are suitable for '{operation}'. Error: {str(e)}"}

    def handle_inconsistent_data(self, column: str, mapping: Dict = None, case_sensitive: bool = False) -> Dict:
        """
        Handle inconsistent data in a column by standardizing values.
        
        Args:
            column: Name of the column to process.
            mapping: Dictionary mapping inconsistent values to standardized values.
            case_sensitive: Whether to perform case-sensitive matching.
            
        Returns:
            Dictionary containing the processed data and operation details, or an error dictionary.
        """
        if self._check_dataframe_empty():
            return {'error': 'Cannot process inconsistent data on empty data.'}
        if not self._check_column_exists(column):
            return {'error': f"Column '{column}' not found."}
        
        try:
            original_values = self.df[column].unique()
            standardized_values = []
            
            if mapping:
                if case_sensitive:
                    self.df[column] = self.df[column].map(mapping).fillna(self.df[column])
                else:
                    case_insensitive_mapping = {k.lower(): v for k, v in mapping.items()}
                    self.df[column] = self.df[column].apply(
                        lambda x: case_insensitive_mapping.get(str(x).lower(), x)
                    )
            else:
                self.df[column] = self.df[column].astype(str).str.strip()
                bool_map = {
                    'true': True, 'false': False,
                    'yes': True, 'no': False,
                    '1': True, '0': False,
                    't': True, 'f': False,
                    'y': True, 'n': False
                }
                if self.df[column].str.lower().isin(bool_map.keys()).all():
                    self.df[column] = self.df[column].str.lower().map(bool_map)
                
                null_values = ['null', 'none', 'nan', 'na', '']
                self.df[column] = self.df[column].apply(
                    lambda x: None if str(x).lower() in null_values else x
                )
            
            standardized_values = self.df[column].unique()
            
            return {
                'data': self._get_data_as_records(),
                'column': column,
                'original_values': original_values.tolist(),
                'standardized_values': standardized_values.tolist(),
                'mapping_applied': bool(mapping)
            }
            
        except Exception as e:
            return {'error': f"Failed to standardize inconsistent data in '{column}': {str(e)}"}

if __name__ == "__main__":
    data = [
        {'id': 1, 'name': ' John ', 'age': 25, 'score': 85.0, 'city': 'New York', 'active': 'TRUE'},
        {'id': 2, 'name': 'Jane', 'age': 30, 'score': 90.5, 'city': 'London', 'active': 'FALSE'},
        {'id': 3, 'name': 'Bob', 'age': None, 'score': 75.0, 'city': 'New York', 'active': '1'},
        {'id': 4, 'name': 'Alice', 'age': 28, 'score': None, 'city': 'Paris', 'active': '0'},
        {'id': 5, 'name': ' John ', 'age': 25, 'score': 85.0, 'city': 'New York', 'active': 'TRUE'},
        {'id': 6, 'name': 'Charlie', 'age': 35, 'score': 75.0, 'city': 'London', 'active': None},
        {'id': 7, 'name': 'David', 'age': 28, 'score': 95.0, 'city': 'Paris', 'active': 'yes'},
        {'id': 8, 'name': 'Eve  ', 'age': '?', 'score': 88.0, 'city': 'tokyo', 'active': 'no'},
    ]

    cleaner = DataCleaner(data)

    print("------- Original Data -------")
    print(pd.DataFrame(cleaner.original_data))

    print("\n------- 1. Remove Duplicates -------")
    result = cleaner.remove_duplicates()
    if 'error' in result: print("Error:", result['error'])
    else: print(f"Removed {result['removed_count']} duplicates.\n", cleaner.df)

    print("\n------- 2. Handle Missing 'age' (Median) -------")
    result = cleaner.handle_missing_values('age', 'median')
    if 'error' in result: print("Error:", result['error'])
    else: print(f"Handled {result['missing_count']} missing values using {result['method']}.\n", cleaner.df)

    print("\n------- 3. Handle Missing 'score' (Custom Value 0) -------")
    result = cleaner.handle_missing_values('score', 'custom', custom_value=0)
    if 'error' in result: print("Error:", result['error'])
    else: print(f"Handled {result['missing_count']} missing values using {result['method']} (custom=0).\n", cleaner.df)

    print("\n------- 4. Convert 'age' to Number -------")
    result = cleaner.convert_types('age', 'number')
    if 'error' in result: print("Error:", result['error'])
    else:
        print(f"Converted '{result['column']}' from {result['original_type']} to {result['new_type']}.")
        if 'warning' in result: print("Warning:", result['warning'])
        print(cleaner.df)

    print("\n------- 4b. Handle remaining missing 'age' (Mode) -------")
    result = cleaner.handle_missing_values('age', 'mode')
    if 'error' in result: print("Error:", result['error'])
    else: print(f"Handled {result['missing_count']} missing values using {result['method']}.\n", cleaner.df)

    print("\n------- 5. Convert 'active' to Boolean -------")
    result = cleaner.convert_types('active', 'boolean')
    if 'error' in result: print("Error:", result['error'])
    else:
        print(f"Converted '{result['column']}' from {result['original_type']} to {result['new_type']}.")
        if 'warning' in result: print("Warning:", result['warning'])
        print(cleaner.df)

    print("\n------- 6. Clean 'name' Text (Trim, Uppercase) -------")
    result = cleaner.clean_text('name', ['trim', 'uppercase'])
    if 'error' in result: print("Error:", result['error'])
    else: print(f"Applied operations {result['operations']} to '{result['column']}'.\n", cleaner.df)

    print("\n------- 7. Normalize 'score' (Min-Max) -------")
    result = cleaner.normalize_data('score')
    if 'error' in result: print("Error:", result['error'])
    else: print(f"Normalized '{result['column']}' using {result['method']} (min: {result['details']['min']:.2f}, max: {result['details']['max']:.2f}).\n", cleaner.df[['id', 'name', 'score']])

    print("\n------- 8. Standardize 'age' (Z-score) -------")
    result = cleaner.standardize_data('age')
    if 'error' in result: print("Error:", result['error'])
    else: print(f"Standardized '{result['column']}' using {result['method']} (mean: {result['details']['mean']:.2f}, std: {result['details']['std_dev']:.2f}).\n", cleaner.df[['id', 'name', 'age']])

    print("\n------- 9. Clean 'city' Text (Lowercase) -------")
    result = cleaner.clean_text('city', ['lowercase', 'remove_punctuation'])
    if 'error' in result: print("Error:", result['error'])
    else: print(f"Applied operations {result['operations']} to '{result['column']}'.\n", cleaner.df)

    print("\n------- 10. Reset Changes -------")
    result = cleaner.reset_changes()
    if 'error' in result: print("Error:", result['error'])
    else: print(f"{result['message']}\n", cleaner.df)

    print("\n------- 11. Error Example: Normalize 'name' -------")
    result = cleaner.normalize_data('name')
    if 'error' in result: print("Error:", result['error'])
    else: print("Result:", result)