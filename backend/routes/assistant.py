from flask import Blueprint, Response, request, jsonify
import os
from werkzeug.utils import secure_filename
from services.assistant import HomeworkAnswerAssistant
from services.ocr import ocr_multiple_files, combine_ocr_results
import tempfile
import json
from typing import List

assistant_bp = Blueprint("Assistant", __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff'}
MAX_FILES = 10

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@assistant_bp.route("/<source_name>/detect", methods=['POST'])
def detect_questions(source_name):
    try:
        assistant = HomeworkAnswerAssistant(source_name=source_name)

        text_input = request.form.get('text', '').strip()
        user_corrections = request.form.get('user_corrections', '').strip()

        files = request.files.getlist('file')

        if len(files) > MAX_FILES:
            return jsonify({
                "error": f"Maximum {MAX_FILES} files allowed. You uploaded {len(files)} files."
            }), 400

        ocr_content = ""

        if files and files[0].filename:
            temp_file_paths = []
            try:
                for file in files:
                    if file and file.filename and allowed_file(file.filename):
                        temp_fd, temp_path = tempfile.mkstemp(suffix=os.path.splitext(file.filename)[1])
                        os.close(temp_fd)
                        file.save(temp_path)
                        temp_file_paths.append(temp_path)
                if temp_file_paths:
                    ocr_results = ocr_multiple_files(temp_file_paths)
                    ocr_content = combine_ocr_results(ocr_results)
                    if len(temp_file_paths) > 1:
                        ocr_content = "**NOTE: Images may not be in any particular order.**\n\n" + ocr_content
            finally:
                for temp_path in temp_file_paths:
                    try:
                        os.unlink(temp_path)
                    except:
                        pass

        if not ocr_content and not text_input:
            return jsonify({
                "error": "Please provide either text input or upload image files for OCR processing."
            }), 400

        detection_result = assistant.detect_questions(ocr_content, text_input, user_corrections)

        if detection_result.get("error"):
            return jsonify(detection_result), 500

        return jsonify({
            "type": "questions_detected",
            "result": detection_result,
            "source_name": source_name,
            "ocr_content": ocr_content,
            "text_input": text_input,
            "files_processed": len(files) if files and files[0].filename else 0
        })

    except Exception as e:
        return jsonify({
            "error": f"An error occurred during question detection: {str(e)}"
        }), 500

@assistant_bp.route("/<source_name>/answer", methods=['POST'])
def answer_questions(source_name):
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data provided"}), 400

        ocr_content = data.get('ocr_content', '')
        text_input = data.get('text_input', '')
        detection_result = data.get('detection_result', {})

        if not detection_result:
            return jsonify({"error": "No detection result provided"}), 400

        assistant = HomeworkAnswerAssistant(source_name=source_name)
        result = assistant.answer_all_questions(detection_result, ocr_content, text_input)

        if result.get("error"):
            return jsonify(result), 500

        user_input = f"Text: {text_input}\n" if text_input else ""
        if ocr_content:
            ocr_preview = ocr_content[:300] + "..." if len(ocr_content) > 300 else ocr_content
            user_input += f"OCR Content: {ocr_preview}"

        if result.get("type") == "structured_answers":
            history_response = result.get("markdown", "")
            if not history_response:
                sections_summary = result.get("sections_summary", {})
                sections_text = ", ".join([f"{section}: {count} questions" for section, count in sections_summary.items()])
                history_response = f"Answered {result.get('total_questions', 0)} questions from {source_name} ({sections_text})"
        else:
            history_response = "Generated response"

        assistant.add_to_chat_history(user_input, history_response)

        return jsonify({
            "type": result.get("type", "answer"),
            "result": result,
            "source_name": source_name,
            "chat_history_length": len(assistant.get_chat_history())
        })

    except Exception as e:
        return jsonify({"error": f"An error occurred during answer generation: {str(e)}"}), 500

@assistant_bp.route("/<source_name>/ask", methods=['POST'])
def ask_assistant(source_name):
    try:
        assistant = HomeworkAnswerAssistant(source_name=source_name)
        text_input = request.form.get('text', '').strip()
        user_corrections = request.form.get('user_corrections', '').strip()
        files = request.files.getlist('file')

        if len(files) > MAX_FILES:
            return jsonify({"error": f"Maximum {MAX_FILES} files allowed. You uploaded {len(files)} files."}), 400

        ocr_content = ""
        if files and files[0].filename:
            temp_file_paths = []
            try:
                for file in files:
                    if file and file.filename and allowed_file(file.filename):
                        temp_fd, temp_path = tempfile.mkstemp(suffix=os.path.splitext(file.filename)[1])
                        os.close(temp_fd)
                        file.save(temp_path)
                        temp_file_paths.append(temp_path)
                if temp_file_paths:
                    ocr_results = ocr_multiple_files(temp_file_paths)
                    ocr_content = combine_ocr_results(ocr_results)
                    if len(temp_file_paths) > 1:
                        ocr_content = "**NOTE: Images may not be in any particular order.**\n\n" + ocr_content
            finally:
                for temp_path in temp_file_paths:
                    try:
                        os.unlink(temp_path)
                    except:
                        pass

        if not ocr_content and not text_input:
            return jsonify({"error": "Please provide either text input or upload image files for OCR processing."}), 400

        result = assistant.process_content(ocr_content, text_input, user_corrections)
        if result.get("error"):
            return jsonify(result), 500
        
        user_input = f"Text: {text_input}\n" if text_input else ""
        if ocr_content:
            user_input += f"OCR Content: {ocr_content[:200]}..." if len(ocr_content) > 200 else f"OCR Content: {ocr_content}"
        if user_corrections:
            user_input += f"\nUser corrections: {user_corrections}"

        if result.get("type") == "structured_answers":
            history_response = result.get("markdown", "")
            if not history_response:
                sections_summary = result.get("sections_summary", {})
                sections_text = ", ".join([f"{section}: {count} questions" for section, count in sections_summary.items()])
                history_response = f"Answered {result.get('total_questions', 0)} questions from {source_name} ({sections_text})"
        elif result.get("type") == "single_response":
            history_response = result.get("markdown", result.get("response", "Generated response"))
        else:
            history_response = "Generated response"

        assistant.add_to_chat_history(user_input, history_response)

        clean_result = {str(k): v for k, v in result.items()}
        response_data = {
            "type": result.get("type", "answer"),
            "result": clean_result,
            "source_name": source_name,
            "files_processed": len(files) if files and files[0].filename else 0,
            "chat_history_length": len(assistant.get_chat_history())
        }

        json_response = json.dumps(response_data, sort_keys=False)

        return Response(response=json_response, status=200, mimetype="application/json")
    
    except Exception as e:
        print(e)
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@assistant_bp.route("/<source_name>/history", methods=['GET'])
def get_chat_history(source_name):
    try:
        assistant = HomeworkAnswerAssistant(source_name=source_name)
        history = assistant.get_chat_history()
        return jsonify({"source_name": source_name, "history": history, "total_exchanges": len(history)})
    except Exception as e:
        return jsonify({"error": f"Failed to retrieve chat history: {str(e)}"}), 500

@assistant_bp.route("/<source_name>/clear_history", methods=['POST'])
def clear_chat_history(source_name):
    try:
        from services.assistant import chat_histories
        if source_name in chat_histories:
            del chat_histories[source_name]
        return jsonify({"message": f"Chat history cleared for source: {source_name}"})
    except Exception as e:
        return jsonify({"error": f"Failed to clear chat history: {str(e)}"}), 500
