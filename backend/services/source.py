from typing import List
from pathlib import Path
import os
from services.ocr import ocr_file

def read_sources(source_name: str) -> List[str]:
    """
    Reads the content of all source files in the specified folder.
    """
    try:
        sources = []
        source_dir_path = Path(f"uploads/sources/{source_name}")
        files = os.listdir(source_dir_path)
        allowed_file_ext = ["png", "jpg", "jpeg"]

        for file in files:
            file_ext = file.lower().split('.')[-1]
            file_name = '.'.join(file.lower().split('.')[:-1])
            text_file_path = source_dir_path / f"{file_name}.txt"
            if file_ext == "txt": continue
            if text_file_path.exists():
                with open(text_file_path, 'r', encoding='utf-8') as f:
                    sources.append(f.read())
            else:
                if file_ext in allowed_file_ext:
                    file_path = source_dir_path / file
                    ocr_result = ocr_file(str(file_path))
                    with open(text_file_path, 'w', encoding='utf-8') as f:
                        f.write(ocr_result)
                    sources.append(ocr_result)
        return sources
    except FileNotFoundError:
        print(f"File {source_name} not found.")
        return []
    except Exception as e:
        print(f"An error occurred while reading the file: {e}")
        return []