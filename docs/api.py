import os
import datetime
import json
import uuid
from flask import Flask, request, jsonify, send_from_directory, render_template_string, make_response
from PIL import Image 
from flask_cors import CORS
import google.generativeai as genai

# Configure Google Generative AI
genai.configure(api_key="api key here")

app = Flask(__name__)

# More permissive CORS configuration
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"]
    }
})

# Use absolute path for uploads folder
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
print(f"Upload folder path: {UPLOAD_FOLDER}")

# Modify/replace the existing serve_static route with this improved version:
@app.route('/<path:filename>')
def serve_static(filename):
    print(f"Trying to serve: {filename}")
    # First check if filename is requesting an asset
    if filename.startswith('assets/'):
        # Look for assets in parent directory 
        assets_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets')
        asset_file = os.path.basename(filename)
        return send_from_directory(assets_path, asset_file)
        
    # Otherwise, check if file exists in current directory
    if os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), filename)):
        return send_from_directory(os.path.dirname(os.path.abspath(__file__)), filename)
    # If not found, try looking in 'docs' folder if we're not already in it
    elif not os.path.dirname(os.path.abspath(__file__)).endswith('docs') and os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'docs', filename)):
        return send_from_directory(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'docs'), filename)
    else:
        app.logger.error(f"File not found: {filename}")
        # If still not found, return 404 with HTML message instead of JSON
        return f"""
        <html>
        <head><title>File Not Found</title></head>
        <body>
            <h1>File Not Found</h1>
            <p>The requested file "{filename}" could not be found.</p>
            <p>Debug info: Looking in directory {os.path.dirname(os.path.abspath(__file__))}</p>
            <p>Directory contents: {os.listdir(os.path.dirname(os.path.abspath(__file__)))}</p>
        </body>
        </html>
        """, 404

@app.after_request
def add_cors_headers(response):
    """Add CORS headers to all responses"""
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
    return response

@app.route('/', methods=['GET', 'OPTIONS'])
def index():
    """Root endpoint to check if the server is running"""
    if request.method == 'OPTIONS':
        return handle_preflight()
        
    return render_template_string("""
    <!DOCTYPE html>
    <html>
    <head>
        <title>FoodBridge API</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                max-width: 800px;
                margin: 40px auto;
                padding: 20px;
                line-height: 1.6;
            }
            .success {
                background-color: #d4edda;
                color: #155724;
                padding: 15px;
                border-radius: 4px;
                margin-bottom: 20px;
            }
            h1 { color: #2C9F45; }
        </style>
    </head>
    <body>
        <div class="success">
            <h2>API Server is Running!</h2>
            <p>The FoodBridge API server is running correctly.</p>
        </div>
        
        <h1>Available Endpoints:</h1>
        <ul>
            <li><strong>/upload</strong> - POST an image for food quality analysis</li>
            <li><strong>/uploads/[filename]</strong> - GET an uploaded image</li>
        </ul>
    </body>
    </html>
    """)

def handle_preflight():
    """Handle preflight OPTIONS requests"""
    response = make_response()
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "Content-Type,Authorization,X-Requested-With")
    response.headers.add("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
    return response

@app.route('/upload', methods=['GET', 'POST', 'OPTIONS'])
def upload_file():
    # Handle preflight OPTIONS requests
    if request.method == 'OPTIONS':
        return handle_preflight()
    
    # If it's a GET request, show a simple page explaining the API
    if request.method == 'GET':
        html = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>FoodBridge API</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    margin: 0;
                    padding: 20px;
                    color: #333;
                    max-width: 800px;
                    margin: 0 auto;
                }
                h1 {
                    color: #2C9F45;
                }
                pre {
                    background: #f4f4f4;
                    border-left: 3px solid #2C9F45;
                    padding: 15px;
                    overflow: auto;
                }
                .note {
                    background-color: #e7f3fe;
                    border-left: 6px solid #2196F3;
                    padding: 10px;
                    margin: 20px 0;
                }
                .success {
                    background-color: #d4edda;
                    color: #155724;
                    padding: 15px;
                    border-radius: 4px;
                    margin-bottom: 20px;
                }
            </style>
        </head>
        <body>
            <div class="success">
                <h2>Server Status: ONLINE</h2>
                <p>The API server is running correctly!</p>
            </div>
            
            <h1>FoodBridge API</h1>
            <p>This is the API endpoint for food quality analysis. You cannot access this directly from a browser as it requires a POST request with an image file.</p>
            
            <div class="note">
                <p><strong>Note:</strong> This message just means you're trying to access it via a web browser.</p>
            </div>
            
            <h2>How to use this API:</h2>
            <p>You should access this API through the FoodBridge web application, which will handle file uploads and display results.</p>
            
            <h3>For developers:</h3>
            <p>To test the API, send a POST request with an image file:</p>
            <pre>
fetch("http://127.0.0.1:5002/upload", {
    method: "POST",
    body: formData  // formData should contain a file with key 'file'
})
.then(response => response.json())
.then(data => console.log(data))
            </pre>
            
            <p>Current uploads folder: {uploads_folder}</p>
            <p>Sample uploaded files:</p>
            <ul>
                {uploaded_files}
            </ul>
        </body>
        </html>
        """
        
        # List some sample uploads
        try:
            files = os.listdir(UPLOAD_FOLDER)
            uploaded_files_html = "".join([f"<li>{f}</li>" for f in files[:5]])
            if not uploaded_files_html:
                uploaded_files_html = "<li>No files uploaded yet</li>"
        except Exception as e:
            uploaded_files_html = f"<li>Error listing files: {str(e)}</li>"
            
        return render_template_string(html, 
                                     uploads_folder=UPLOAD_FOLDER,
                                     uploaded_files=uploaded_files_html)
    
    # Handle POST requests for file upload
    if 'file' not in request.files:
        print("No file in request.files:", request.files)
        return jsonify({"error": "No file part"}), 400

    file = request.files['file']
    print("Received file:", file.filename)

    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    # Generate a unique filename to avoid overwriting and caching issues
    ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_FOLDER, unique_filename)
    file.save(file_path)
    print(f"Saved file to {file_path}")

    try:
        with Image.open(file_path) as img:
            width, height = img.size
            
            # First check if the image contains food
            model = genai.GenerativeModel('gemini-2.0-flash')
            food_check = model.generate_content(["Does this image contain food? Answer only 'yes' or 'no'.", img])
            
            contains_food = "yes" in food_check.text.lower()
            
            if not contains_food:
                print("No food detected in the image")
                response_data = {
                    "image_url": f"{request.host_url}uploads/{unique_filename}",
                    "width": width,
                    "height": height,
                    "ai_analysis": {
                        "freshness": "N/A",
                        "quality": "Not Food",
                        "quantity": "N/A",
                        "nutrition value": "N/A",
                        "is_food": False,
                        "message": "The uploaded image does not appear to contain food. Please upload an image of food for analysis."
                    }
                }
                return jsonify(response_data)
            
            # If it contains food, proceed with quality analysis
            ai_response = model.generate_content(
                ["Identify the dish in the image and rate the quality of the food in this image on a scale of 100 \
                based on its freshness, edibility, quantity and nutrition value (out of 100) and return a json string output with the keys as freshness, quality (Unhealthy, Bad, Can't Determine, Good, Very Good), \
                quantity, nutrition value, dish", img]
            )
            
            try:
                import json
                import re
                
                ai_text = ai_response.text
                
                json_match = re.search(r'```json\s*(.*?)\s*```', ai_text, re.DOTALL)
                if json_match:
                    ai_text = json_match.group(1)
                
                ai_text = re.sub(r'^[^{]*', '', ai_text)
                ai_text = re.sub(r'[^}]*$', '', ai_text)
                
                ai_data = json.loads(ai_text)
                ai_data["is_food"] = True
                print("AI analysis result:", ai_data)
            except Exception as e:
                print(f"Error parsing AI response: {str(e)}")
                print(f"Raw AI response: {ai_response.text}")
                ai_data = {
                    "freshness": "75",
                    "quality": "Good",
                    "quantity": "Medium",
                    "nutrition_value": "70",
                    "dish": "Unknown Food",
                    "is_food": True
                }
        
        # Generate image URL using request.host_url for dynamic host/port
        image_url = f"{request.host_url}uploads/{unique_filename}".replace("///", "//")
            
        response_data = {
            "image_url": image_url,
            "width": width,
            "height": height,
            "ai_analysis": ai_data
        }
        
        print("Returning combined response:", response_data)
        return jsonify(response_data)
    
    except Exception as e:
        print(f"Error processing image: {str(e)}")
        return jsonify({
            "error": f"Error processing image: {str(e)}",
            "image_url": f"{request.host_url}uploads/{unique_filename}"
        }), 500

@app.route('/user/<username>')
def profile(username):
    return f'{username}\'s profile'

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    response = send_from_directory(UPLOAD_FOLDER, filename)
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response

@app.route('/narenlol', methods=['POST'])
def my_function():
    data = request.get_json()
    data['testing'] = "HELLO MY NAME IS NAREN"
    return jsonify(data)

# Add a specific route for assets (add this after the existing routes)
@app.route('/assets/<path:filename>')
def serve_assets(filename):
    # Try to serve from parent assets directory first
    parent_assets = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'assets')
    if os.path.exists(os.path.join(parent_assets, filename)):
        return send_from_directory(parent_assets, filename)
    
    # Then try docs/assets if it exists
    docs_assets = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'assets')
    if os.path.exists(os.path.join(docs_assets, filename)):
        return send_from_directory(docs_assets, filename)
    
    return f"Asset not found: {filename}", 404

@app.errorhandler(404)
def not_found(e):
    return jsonify({"error": "Resource not found", "status": 404}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({"error": "Internal server error", "status": 500}), 500

if __name__ == '__main__':
    print("Starting Flask server...")
    try:
        # Allow connections from any IP address
        app.run(debug=True, port=5002, host='0.0.0.0')
    except Exception as e:
        print(f"Error starting Flask server: {str(e)}")