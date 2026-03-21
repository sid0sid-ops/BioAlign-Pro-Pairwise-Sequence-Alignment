@echo off
echo Starting local web server...
echo Serving BioAlign-Pro at http://localhost:8000
start http://localhost:8000
python -m http.server 8000
