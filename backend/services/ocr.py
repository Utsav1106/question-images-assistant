import ocrspace
import os
from typing import List, Dict
from config import OCR_SPACE_API_KEY

print(OCR_SPACE_API_KEY, 'OCR')
api = ocrspace.API(
    api_key=OCR_SPACE_API_KEY,
    OCREngine=2
)

def ocr_file(file_path: str) -> str:
    """
    Performs pre-processing on an image file and sends it to the OCR.space API.
    """
    
    try:
        result = api.ocr_file(file_path)
        
        if isinstance(result, dict) and 'ParsedResults' in result:
            if result['ParsedResults'] and len(result['ParsedResults']) > 0:
                return result['ParsedResults'][0].get('ParsedText', '')
        elif isinstance(result, str):
            return result
        
        return ""

    except Exception as e:
        print(f"An error occurred: {e}")
        return ""

def ocr_multiple_files(file_paths: List[str]) -> Dict[str, str]:
    """
    Performs OCR on multiple files and returns a dictionary with filenames and their OCR results.
    """
    results = {}
    
    for file_path in file_paths:
        try:
            filename = os.path.basename(file_path)
            ocr_result = ocr_file(file_path)
            results[filename] = ocr_result
            print(f"OCR completed for: {filename}")
        except Exception as e:
            print(f"Error processing {file_path}: {e}")
            results[os.path.basename(file_path)] = ""
    
    return results

def combine_ocr_results(ocr_results: Dict[str, str]) -> str:
    """
    Combines OCR results from multiple files into a single text with file markers.
    """
    combined_text = ""
    
    for filename, text in ocr_results.items():
        if text.strip():
            combined_text += f"\n--- FILE: {filename} ---\n"
            combined_text += text
            combined_text += f"\n--- END OF {filename} ---\n"
    
    return combined_text.strip()
