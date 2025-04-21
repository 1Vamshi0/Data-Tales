import requests

def generate_content(contents):
    """
    Function to generate content using the Gemini API.

    :param contents: A list of dictionaries containing the parts of the content to generate.
    :return: The response from the Gemini API as a dictionary.
    """
    url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
    api_key = "AIzaSyAbP1ZXHiwi-ZpJinxs1FpngBXPbHDPxsg"  # will be provided by the user

    headers = {
        "Content-Type": "application/json"
    }

    data = {
        "contents": contents
    }

    try:
        response = requests.post(f"{url}?key={api_key}", json=data, headers=headers)
        response.raise_for_status()  # Raises an error for HTTP errors
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error generating content: {e}")
        return {"error": "An error occurred while generating content."}


api_tool = {
    "function": generate_content,
    "definition": {
        "name": "generate_content",
        "description": "Generate content using the Gemini API.",
        "parameters": {
            "type": "object",
            "properties": {
                "contents": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "parts": {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "text": {
                                            "type": "string",
                                            "description": "The text to be included in the content."
                                        }
                                    },
                                    "required": ["text"]
                                }
                            }
                        },
                        "required": ["parts"]
                    }
                }
            },
            "required": ["contents"]
        }
    }
}

# If this script is imported as a module, we expose `api_tool`
__all__ = ["api_tool"]