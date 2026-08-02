import io
import re
import pypdf

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Extract text from a PDF file.
    Returns the extracted text, stripped of excessive whitespace.
    """
    try:
        reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
        extracted_text = []
        for page in reader.pages:
            text = page.extract_text()
            if text:
                extracted_text.append(text)
                
        full_text = "\n".join(extracted_text)
        
        # Clean up excessive whitespace
        full_text = re.sub(r'\n+', '\n', full_text)
        full_text = re.sub(r'[ \t]+', ' ', full_text)
        
        return full_text.strip()
    except Exception as e:
        print(f"Error extracting text from PDF: {e}")
        return ""
