import os
import re
from fastapi import FastAPI, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import pdfplumber
from playwright.async_api import async_playwright

app = FastAPI(title="LeaseLogic PDF Parser & Automation Service")

class RegistryTerms(BaseModel):
    tenant_name: str
    landlord_name: str
    commencement_date: str
    expiration_date: str
    initial_rent: str
    notes: Optional[str] = ""

class RegistryRequest(BaseModel):
    lease_id: str
    terms: RegistryTerms

# Helper to identify legal clause headings using Regex
CLAUSE_REGEX = re.compile(
    r'^\s*(?:(?:Section|SECTION|Article|ARTICLE|Clause|CLAUSE|Para|Paragraph)\s+(\d+(?:\.\d+)*|\w+)|(\d+\.\d+))\s*(.*)$',
    re.MULTILINE
)

def chunk_fixed_size(text: str, size: int = 500, overlap: int = 100):
    chunks = []
    start = 0
    while start < len(text):
        end = start + size
        chunk_text = text[start:end]
        chunks.append({
            "text": chunk_text,
            "clause_number": None,
            "clause_title": "Fixed-Size Chunk",
            "page_number": None
        })
        start += (size - overlap)
    return chunks

@app.post("/parse")
async def parse_lease(file: UploadFile = File(...)):
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    # Save the file temporarily
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as f:
        f.write(await file.read())
        
    full_text = ""
    chunks = []
    
    try:
        with pdfplumber.open(temp_path) as pdf:
            for page_idx, page in enumerate(pdf.pages):
                page_num = page_idx + 1
                page_text = page.extract_text() or ""
                
                # Extract tables on the page
                tables = page.extract_tables()
                table_text = ""
                if tables:
                    for table in tables:
                        table_text += "\n--- Table Start ---\n"
                        for row in table:
                            # Filter out None values and join elements
                            row_str = " | ".join([str(cell) if cell is not None else "" for cell in row])
                            table_text += f"| {row_str} |\n"
                        table_text += "--- Table End ---\n"
                
                combined_page_text = page_text
                if table_text:
                    combined_page_text += "\n" + table_text
                    
                full_text += f"\n--- Page {page_num} ---\n" + combined_page_text
                
                # Split page text into clause boundary chunks
                # We find matches for Section headers
                lines = combined_page_text.split('\n')
                current_chunk = []
                current_clause_num = None
                current_clause_title = "Preamble"
                
                for line in lines:
                    match = CLAUSE_REGEX.match(line)
                    if match:
                        # Save previous chunk
                        if current_chunk:
                            clause_text = "\n".join(current_chunk).strip()
                            if len(clause_text) > 30:
                                chunks.append({
                                    "text": clause_text,
                                    "clause_number": current_clause_num,
                                    "clause_title": current_clause_title,
                                    "page_number": page_num
                                })
                        
                        # Start new chunk
                        current_clause_num = match.group(1) or match.group(2)
                        current_clause_title = match.group(3).strip() if match.group(3) else "Clause Header"
                        current_chunk = [line]
                    else:
                        current_chunk.append(line)
                
                # Save remaining chunk for the page
                if current_chunk:
                    clause_text = "\n".join(current_chunk).strip()
                    if len(clause_text) > 30:
                        chunks.append({
                            "text": clause_text,
                            "clause_number": current_clause_num,
                            "clause_title": current_clause_title,
                            "page_number": page_num
                        })
                        
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=f"Failed to parse PDF: {str(e)}")
        
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)
            
    # If no clause boundary chunks were detected, fall back to fixed-size chunking
    if len(chunks) <= 1:
        chunks = chunk_fixed_size(full_text)
        
    return {
        "text": full_text.strip(),
        "chunks": chunks
    }

@app.post("/automation/registry")
async def run_registry_automation(req: RegistryRequest):
    async with async_playwright() as p:
        try:
            # Launch Chromium Headless
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            # Go to the mock land registry hosted on Express backend
            target_url = "http://localhost:5000/mock-registry"
            await page.goto(target_url, timeout=10000)
            
            # Fill out form fields
            await page.fill("#tenantName", req.terms.tenant_name)
            await page.fill("#landlordName", req.terms.landlord_name)
            await page.fill("#commencementDate", req.terms.commencement_date)
            await page.fill("#expirationDate", req.terms.expiration_date)
            await page.fill("#rentAmount", req.terms.initial_rent)
            await page.fill("#notes", req.terms.notes)
            
            # Submit the form
            await page.click("#submitBtn")
            
            # Wait for success message to display
            await page.wait_for_selector("#successMsg", state="visible", timeout=5000)
            success_msg = await page.text_content("#successMsg")
            
            await browser.close()
            
            return {
                "success": True,
                "message": "Playwright Land Registry registration completed.",
                "details": success_msg.strip()
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Automation failed: {str(e)}"
            }
