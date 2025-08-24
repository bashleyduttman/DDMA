# main.py
from fastapi import FastAPI, UploadFile, File
from flood_detection import detect_flood
import shutil

app = FastAPI()

@app.post("/detect-flood/")
async def detect_flood_api(before: UploadFile = File(...), after: UploadFile = File(...), current: UploadFile = File(...)):
    # Save uploaded files temporarily
    before_path = f"temp_{before.filename}"
    after_path = f"temp_{after.filename}"
    current_path = f"temp_{current.filename}"

    for f, path in [(before, before_path), (after, after_path), (current, current_path)]:
        with open(path, "wb") as buffer:
            shutil.copyfileobj(f.file, buffer)

    # Run flood detection
    result = detect_flood(before_path, after_path, current_path)

    return result