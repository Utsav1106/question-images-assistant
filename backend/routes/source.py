from flask import Blueprint, request, jsonify
import os

source_bp = Blueprint('source', __name__)

@source_bp.get('/')
def get_sources():
    source_dirs = os.listdir('uploads/sources')
    sources = [{"name": dir, "images": list(filter(lambda x: x.endswith(('.png', '.jpg', '.jpeg')), os.listdir(f'uploads/sources/{dir}')))} for dir in source_dirs]
    return jsonify({"sources": sources}), 200


@source_bp.post('/')
def create_source():
    data = request.get_json()
    source_name = data.get("name")
    if not source_name:
        return jsonify({"message": "Source name is required"}), 400
    source_path = f'uploads/sources/{source_name}'
    if os.path.exists(source_path):
        return jsonify({"message": "Source already exists"}), 400
    os.makedirs(source_path)
    return jsonify({"message": "Source created successfully"}), 201

@source_bp.get('/<source_name>')
def get_source(source_name):
    source_path = f"uploads/sources/{source_name}"
    if not os.path.exists(source_path):
        return jsonify({"message": "Source not found"}), 404
    images = list(filter(lambda x: x.endswith(('.png', '.jpg', '.jpeg')), os.listdir(source_path)))
    return jsonify({"name": source_name, "images": images}), 200


@source_bp.delete('/<source_name>')
def delete_source(source_name):
    source_path = f'uploads/sources/{source_name}'
    if os.path.exists(source_path):
        os.rmdir(source_path)
        return jsonify({"message": "Source deleted successfully"}), 200
    return jsonify({"message": "Source not found"}), 404

@source_bp.post('/<source_name>/upload')
def upload_image(source_name):
    source_path = f'uploads/sources/{source_name}'
    if not os.path.exists(source_path):
        return jsonify({"message": "Source not found"}), 404
    if 'file' not in request.files:
        return jsonify({"message": "No file uploaded"}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({"message": "No file selected"}), 400
    if not file.filename.endswith(('.png', '.jpg', '.jpeg')):
        return jsonify({"message": "Invalid file type"}), 400
    file.save(os.path.join(source_path, file.filename))
    return jsonify({"message": "File uploaded successfully"}), 201

@source_bp.delete('/<source_name>/files')
def delete_uploaded_files(source_name):
    filenames = request.json.get("fileNames", [])
    source_path = f'uploads/sources/{source_name}'
    if not os.path.exists(source_path):
        return jsonify({"message": "Source not found"}), 404
    for filename in filenames:
        file_path = os.path.join(source_path, filename)
        if os.path.exists(file_path):
            os.remove(file_path)
    return jsonify({"message": "Files deleted successfully"}), 200