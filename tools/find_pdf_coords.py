#!/usr/bin/env python3
"""
PDF Coordinate Finder - Web Version
Buka di browser untuk klik dan dapatkan koordinat signature.
"""

import sys
import os
import json
import base64
import io

try:
    import fitz  # PyMuPDF
except ImportError:
    print("Installing PyMuPDF...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "PyMuPDF", "-q"])
    import fitz

from http.server import HTTPServer, SimpleHTTPRequestHandler
import urllib.parse
import webbrowser

PDF_PATH = None
PDF_DOC = None

HTML_TEMPLATE = '''<!DOCTYPE html>
<html>
<head>
    <title>PDF Coordinate Finder</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; background: #1a1a2e; color: white; min-height: 100vh; }
        .header { background: #16213e; padding: 15px 20px; display: flex; align-items: center; gap: 20px; flex-wrap: wrap; }
        .header h1 { font-size: 18px; color: #4ecca3; }
        .header input[type="file"] { padding: 8px; background: #4ecca3; border: none; border-radius: 5px; cursor: pointer; }
        .header button { padding: 8px 16px; border: none; border-radius: 5px; cursor: pointer; font-weight: bold; }
        .btn-reset { background: #e94560; color: white; }
        .btn-generate { background: #4ecca3; color: #1a1a2e; }
        .status { background: #0f3460; padding: 10px 20px; display: flex; gap: 20px; align-items: center; flex-wrap: wrap; }
        .status .current { color: #4ecca3; font-weight: bold; }
        .container { display: flex; gap: 20px; padding: 20px; }
        .pdf-view { flex: 1; background: #16213e; border-radius: 10px; overflow: auto; max-height: 70vh; }
        .pdf-view img { cursor: crosshair; display: block; }
        .sidebar { width: 300px; background: #16213e; border-radius: 10px; padding: 15px; }
        .sidebar h3 { color: #4ecca3; margin-bottom: 10px; font-size: 14px; }
        .coord-list { font-family: monospace; font-size: 12px; background: #0f3460; padding: 10px; border-radius: 5px; margin-bottom: 15px; }
        .coord-item { padding: 5px 0; border-bottom: 1px solid #1a1a2e; }
        .coord-item.done { color: #4ecca3; }
        .code-output { background: #0f3460; padding: 10px; border-radius: 5px; font-family: monospace; font-size: 10px; white-space: pre-wrap; max-height: 200px; overflow: auto; }
        .marker { position: absolute; width: 16px; height: 16px; border: 3px solid; border-radius: 50%; transform: translate(-50%, -50%); pointer-events: none; }
        .nav-buttons { display: flex; gap: 10px; }
        .nav-buttons button { padding: 5px 15px; }
        .page-info { color: #4ecca3; }
        #pdfContainer { position: relative; display: inline-block; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📍 PDF Coordinate Finder</h1>
        <input type="file" id="pdfInput" accept=".pdf">
        <div class="nav-buttons">
            <button onclick="prevPage()">◀ Prev</button>
            <span class="page-info" id="pageInfo">Page: 0/0</span>
            <button onclick="nextPage()">Next ▶</button>
        </div>
        <button class="btn-reset" onclick="resetCoords()">🔄 Reset</button>
        <button class="btn-generate" onclick="generateCode()">📋 Generate Code</button>
    </div>
    
    <div class="status">
        <span>Klik posisi: </span>
        <span class="current" id="currentJabatan">Upload PDF dulu...</span>
    </div>
    
    <div class="container">
        <div class="pdf-view">
            <div id="pdfContainer">
                <img id="pdfImage" onclick="handleClick(event)">
            </div>
        </div>
        <div class="sidebar">
            <h3>📍 Koordinat Signature</h3>
            <div class="coord-list" id="coordList">
                <div class="coord-item" id="coord-0">1. Area Supervisor: -</div>
                <div class="coord-item" id="coord-1">2. Area Manager: -</div>
                <div class="coord-item" id="coord-2">3. DBM ADM / DBM OPR: -</div>
                <div class="coord-item" id="coord-3">4. EDP Manager: -</div>
                <div class="coord-item" id="coord-4">5. Office Manager: -</div>
            </div>
            <h3>📝 Generated Code</h3>
            <div class="code-output" id="codeOutput">Klik semua 5 posisi untuk generate code...</div>
        </div>
    </div>

    <script>
        const jabatanList = ["Area Supervisor", "Area Manager", "DBM ADM / DBM OPR", "EDP Manager", "Office Manager"];
        const markerColors = ["#e94560", "#4ecca3", "#ffc107", "#2196f3", "#9c27b0"];
        let currentIdx = 0;
        let coordinates = {};
        let pageWidth = 0, pageHeight = 0;
        let scale = 1;
        let currentPage = 0;
        let totalPages = 0;
        let pdfBase64 = null;
        
        document.getElementById('pdfInput').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const formData = new FormData();
            formData.append('pdf', file);
            
            const response = await fetch('/upload', { method: 'POST', body: formData });
            const data = await response.json();
            
            totalPages = data.totalPages;
            pageWidth = data.width;
            pageHeight = data.height;
            currentPage = 0;
            
            loadPage(0);
            document.getElementById('currentJabatan').textContent = jabatanList[0];
        });
        
        async function loadPage(page) {
            const response = await fetch(`/page/${page}`);
            const data = await response.json();
            
            const img = document.getElementById('pdfImage');
            img.src = 'data:image/png;base64,' + data.image;
            scale = data.scale;
            pageWidth = data.width;
            pageHeight = data.height;
            
            document.getElementById('pageInfo').textContent = `Page: ${page + 1}/${totalPages}`;
            
            // Redraw markers
            document.querySelectorAll('.marker').forEach(m => m.remove());
            Object.entries(coordinates).forEach(([jabatan, coord]) => {
                if (coord.page === currentPage) {
                    drawMarker(coord.canvasX, coord.canvasY, jabatanList.indexOf(jabatan));
                }
            });
        }
        
        function prevPage() {
            if (currentPage > 0) {
                currentPage--;
                loadPage(currentPage);
            }
        }
        
        function nextPage() {
            if (currentPage < totalPages - 1) {
                currentPage++;
                loadPage(currentPage);
            }
        }
        
        function handleClick(event) {
            if (currentIdx >= 5) return;
            
            const rect = event.target.getBoundingClientRect();
            const canvasX = event.clientX - rect.left;
            const canvasY = event.clientY - rect.top;
            
            // Convert to PDF coordinates
            const pdfX = Math.round(canvasX / scale);
            const pdfY = Math.round(pageHeight - (canvasY / scale)); // Flip Y
            
            const jabatan = jabatanList[currentIdx];
            coordinates[jabatan] = { x: pdfX, y: pdfY, canvasX, canvasY, page: currentPage };
            
            // Update UI
            const coordEl = document.getElementById(`coord-${currentIdx}`);
            coordEl.textContent = `${currentIdx + 1}. ${jabatan}: x=${pdfX}, y=${pdfY}`;
            coordEl.classList.add('done');
            
            // Draw marker
            drawMarker(canvasX, canvasY, currentIdx);
            
            currentIdx++;
            
            if (currentIdx < 5) {
                document.getElementById('currentJabatan').textContent = jabatanList[currentIdx];
            } else {
                document.getElementById('currentJabatan').textContent = '✅ Semua selesai! Klik Generate Code';
                generateCode();
            }
        }
        
        function drawMarker(x, y, idx) {
            const marker = document.createElement('div');
            marker.className = 'marker';
            marker.style.left = x + 'px';
            marker.style.top = y + 'px';
            marker.style.borderColor = markerColors[idx];
            document.getElementById('pdfContainer').appendChild(marker);
        }
        
        function resetCoords() {
            currentIdx = 0;
            coordinates = {};
            document.querySelectorAll('.coord-item').forEach((el, i) => {
                el.textContent = `${i + 1}. ${jabatanList[i]}: -`;
                el.classList.remove('done');
            });
            document.querySelectorAll('.marker').forEach(m => m.remove());
            document.getElementById('currentJabatan').textContent = jabatanList[0];
            document.getElementById('codeOutput').textContent = 'Klik semua 5 posisi untuk generate code...';
        }
        
        function generateCode() {
            if (Object.keys(coordinates).length < 5) {
                alert('Belum lengkap! Klik 5 posisi signature dulu.');
                return;
            }
            
            let code = `// Koordinat dari PDF Coordinate Finder\\nconst jabatanPositions = {\\n`;
            jabatanList.forEach(jab => {
                const c = coordinates[jab];
                const adjX = c.x - 50;
                const adjY = c.y - 22;
                code += `    '${jab}': { x: ${adjX}, y: ${adjY} },\\n`;
            });
            code += `};`;
            
            document.getElementById('codeOutput').textContent = code;
            
            // Copy to clipboard
            navigator.clipboard.writeText(code.replace(/\\\\n/g, '\\n')).then(() => {
                alert('✅ Code sudah di-copy ke clipboard!');
            });
        }
    </script>
</body>
</html>'''

class CoordHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(HTML_TEMPLATE.encode())
        elif self.path.startswith('/page/'):
            page_num = int(self.path.split('/')[-1])
            self.serve_page(page_num)
        else:
            super().do_GET()
    
    def do_POST(self):
        if self.path == '/upload':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            # Parse multipart form data
            boundary = self.headers['Content-Type'].split('=')[1].encode()
            parts = post_data.split(b'--' + boundary)
            
            for part in parts:
                if b'filename=' in part:
                    # Extract PDF data
                    header_end = part.find(b'\r\n\r\n')
                    pdf_data = part[header_end + 4:].rstrip(b'\r\n--')
                    
                    global PDF_DOC
                    PDF_DOC = fitz.open(stream=pdf_data, filetype="pdf")
                    
                    page = PDF_DOC[0]
                    self.send_response(200)
                    self.send_header('Content-type', 'application/json')
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        'totalPages': len(PDF_DOC),
                        'width': page.rect.width,
                        'height': page.rect.height
                    }).encode())
                    return
    
    def serve_page(self, page_num):
        global PDF_DOC
        if not PDF_DOC:
            self.send_error(400, 'No PDF loaded')
            return
        
        page = PDF_DOC[page_num]
        mat = fitz.Matrix(1.5, 1.5)
        pix = page.get_pixmap(matrix=mat)
        
        img_data = pix.tobytes("png")
        img_b64 = base64.b64encode(img_data).decode()
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({
            'image': img_b64,
            'scale': 1.5,
            'width': page.rect.width,
            'height': page.rect.height
        }).encode())
    
    def log_message(self, format, *args):
        pass  # Suppress logging

def main():
    port = 3005
    server = HTTPServer(('localhost', port), CoordHandler)
    print(f"\n{'='*50}")
    print(f"🚀 PDF Coordinate Finder running at:")
    print(f"   http://localhost:{port}")
    print(f"{'='*50}")
    print("\nCara pakai:")
    print("1. Upload PDF BA yang sudah jadi")
    print("2. Klik TENGAH setiap kotak signature (urutan: AS, AM, DBM, EDP, OM)")
    print("3. Code akan otomatis di-generate dan copy ke clipboard")
    print("\nTekan Ctrl+C untuk stop server")
    print("="*50)
    
    webbrowser.open(f'http://localhost:{port}')
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")

if __name__ == "__main__":
    main()
