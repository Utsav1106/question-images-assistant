
from flask import Flask, send_from_directory
from config import PORT
from routes.source import source_bp
from routes.assistant import assistant_bp
import os
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)
app.url_map.strict_slashes = False

@app.route('/uploads/<path:filename>')

def uploaded_file(filename):
    """Serves a file from the upload directory."""
    return send_from_directory(os.path.join(app.root_path, 'uploads'), filename)

app.register_blueprint(source_bp, url_prefix='/source')
app.register_blueprint(assistant_bp, url_prefix='/assistant')

if __name__ == '__main__':
    app.run(debug=False, port=PORT)