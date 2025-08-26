# main.py
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import shutil, os
import numpy as np
from collections.abc import Mapping, Sequence
from flood_detection import detect_flood

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust as needed for your frontend
    allow_credentials=True,
    allow_methods=["*"],  # Or specify: ["GET", "POST", "PUT", "DELETE"]
    allow_headers=["*"],  # Or specify specific headers
)

def to_serializable(x):
    # NumPy array -> list
    if isinstance(x, np.ndarray):
        return x.tolist()
    # Any NumPy scalar (incl. bool_, int64, float32, etc.) -> Python scalar
    if isinstance(x, np.generic):
        return x.item()
    # Dict-like -> recurse
    if isinstance(x, Mapping):
        return {str(k): to_serializable(v) for k, v in x.items()}
    # List/tuple/set -> recurse (but not str/bytes)
    if isinstance(x, Sequence) and not isinstance(x, (str, bytes, bytearray)):
        return [to_serializable(v) for v in x]
    return x

@app.post("/detect-flood/")
async def detect_flood_api(
    before: UploadFile = File(...),
    after: UploadFile = File(...),
    current: UploadFile = File(...)
):
    before_path = f"temp_{before.filename}"
    after_path = f"temp_{after.filename}"
    current_path = f"temp_{current.filename}"

    try:
        for f, path in [(before, before_path), (after, after_path), (current, current_path)]:
            with open(path, "wb") as buffer:
                shutil.copyfileobj(f.file, buffer)

        result = detect_flood(before_path, after_path, current_path)

        # If your function ever returns a bare NumPy bool/scalar,
        # this will safely coerce it, so no need for np.bool8 checks.
        payload = to_serializable(result)
        return JSONResponse(content=payload)

    finally:
        for path in (before_path, after_path, current_path):
            try: os.remove(path)
            except FileNotFoundError: pass