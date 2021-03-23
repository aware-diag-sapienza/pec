from http.server import HTTPServer, CGIHTTPRequestHandler
import webbrowser
import os
import sys

web_dir = os.path.join(os.path.dirname(__file__), "frontend")
os.chdir(web_dir)

port = 8000
host_name = "localhost"
addr = f"http://{host_name}:{port}"

httpd = HTTPServer((host_name, port), CGIHTTPRequestHandler)
print(f"Server started at {addr}")
webbrowser.open_new_tab(addr)
httpd.serve_forever()