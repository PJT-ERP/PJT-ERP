import io
import json
import urllib.request
import urllib.parse
import urllib.error

BASE_URL = "http://localhost:5000"

def make_request(url, method="GET", headers=None, data=None):
    if headers is None:
        headers = {}
    
    headers["X-PJT-Client"] = "Frontend"
    headers["X-Requested-With"] = "XMLHttpRequest"

    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, dict(resp.headers), resp.read().decode('utf-8', errors='ignore')
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8', errors='ignore')
        return e.code, dict(e.headers), body
    except Exception as e:
        return 0, {}, str(e)

def login(email, password):
    login_url = f"{BASE_URL}/api/v1/auth/login"
    payload = json.dumps({"email": email, "password": password}).encode('utf-8')
    headers = {"Content-Type": "application/json"}
    status, resp_headers, body = make_request(login_url, method="POST", headers=headers, data=payload)
    if status == 200:
        cookies = resp_headers.get("Set-Cookie") or resp_headers.get("set-cookie") or ""
        token = ""
        if "access_token=" in cookies:
            token = cookies.split("access_token=")[1].split(";")[0]
        return token
    return None

def run_tests():
    print("==========================================================")
    print("      LIVE RUNTIME SECURITY VERIFICATION SUITE           ")
    print("==========================================================")

    # 1. UNAUTHENTICATED ACCESS TEST
    print("\n--- 1. UNAUTHENTICATED ACCESS TESTS ---")
    unauth_urls = [
        f"{BASE_URL}/proofs/test-proof.pdf",
        f"{BASE_URL}/qc-photos/test-photo.webp",
        f"{BASE_URL}/engineering-drawings/test-drawing.pdf"
    ]
    all_unauth_passed = True
    for url in unauth_urls:
        status, headers, body = make_request(url)
        passed = status in (401, 403)
        if not passed: all_unauth_passed = False
        result = "PASS (DENIED 401/403)" if passed else f"FAIL (Status: {status})"
        print(f"GET {url} -> Status: {status} | Result: {result}")

    # LOG IN TO GET VALID USER JWT TOKEN
    print("\n--- LOGGING IN AS ENGINEER (engineering@pjt.local) ---")
    token = login("engineering@pjt.local", "Dev123!")
    if token:
        print("Logged in successfully. Obtained JWT Token.")
    else:
        print("Login failed, falling back to DevMaster authorization.")
        token = "dev-master-token"

    auth_headers = {"Authorization": f"Bearer {token}"}

    # 2. UPLOAD BYPASS TESTS (Disallowed extensions & Signature Mismatches)
    print("\n--- 2. UPLOAD BYPASS TESTS ---")
    upload_url = f"{BASE_URL}/api/v1/production/sales-orders/upload-drawing-file"
    
    test_files = [
        ("malicious.html", "text/html", b"<html><body><script>alert('XSS')</script></body></html>"),
        ("vector.svg", "image/svg+xml", b"<svg><script>alert('XSS')</script></svg>"),
        ("script.js", "application/javascript", b"console.log('XSS')"),
        ("executable.exe", "application/x-msdownload", b"MZ fake binary executable header"),
        ("fake_jpeg.pdf", "application/pdf", b"\xFF\xD8\xFF\xE0\x00\x10\x4A\x46\x49\x46"), # PDF ext + JPEG magic
        ("fake_png.jpg", "image/jpeg", b"\x89\x50\x4E\x47\x0D\x0A\x1A\x0A") # JPG ext + PNG magic
    ]

    all_uploads_rejected = True
    for filename, content_type, file_bytes in test_files:
        boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
        body_bytes = io.BytesIO()
        body_bytes.write(f"--{boundary}\r\n".encode())
        body_bytes.write(f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'.encode())
        body_bytes.write(f"Content-Type: {content_type}\r\n\r\n".encode())
        body_bytes.write(file_bytes)
        body_bytes.write(f"\r\n--{boundary}--\r\n".encode())

        headers = dict(auth_headers)
        headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"

        status, resp_headers, resp_body = make_request(upload_url, method="POST", headers=headers, data=body_bytes.getvalue())
        passed = status == 400
        if not passed: all_uploads_rejected = False
        result = "PASS (REJECTED 400)" if passed else f"FAIL (Status: {status})"
        print(f"Upload '{filename}' ({content_type}) -> Status: {status} | Result: {result}")
        if status == 400:
            err_msg = json.loads(resp_body).get("message") if resp_body.startswith("{") else resp_body.strip()
            print(f"   Rejection Reason: '{err_msg}'")

    # 3. MIME SPOOFING TEST
    print("\n--- 3. MIME SPOOFING TEST ---")
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    body_bytes = io.BytesIO()
    body_bytes.write(f"--{boundary}\r\n".encode())
    body_bytes.write(b'Content-Disposition: form-data; name="file"; filename="spoofed.jpg"\r\n')
    body_bytes.write(b"Content-Type: image/jpeg\r\n\r\n") # Client claims JPEG MIME
    body_bytes.write(b"<html><body>Spoofed Content</body></html>") # Content is HTML text
    body_bytes.write(f"\r\n--{boundary}--\r\n".encode())

    headers = dict(auth_headers)
    headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"
    status, resp_headers, resp_body = make_request(upload_url, method="POST", headers=headers, data=body_bytes.getvalue())
    passed = status == 400
    print(f"MIME Spoof Upload 'spoofed.jpg' -> Status: {status} | Result: {'PASS (REJECTED 400)' if passed else 'FAIL'}")

    # 4. VALID UPLOAD & SECURITY HEADERS VERIFICATION
    print("\n--- 4. VALID UPLOAD & SECURITY HEADERS VERIFICATION ---")
    valid_jpeg = b"\xFF\xD8\xFF\xE0\x00\x10\x4A\x46\x49\x46\x00\x01\x01\x01\x00\x48\x00\x48\x00\x00"
    boundary = "----WebKitFormBoundary7MA4YWxkTrZu0gW"
    body_bytes = io.BytesIO()
    body_bytes.write(f"--{boundary}\r\n".encode())
    body_bytes.write(b'Content-Disposition: form-data; name="file"; filename="valid_drawing.jpg"\r\n')
    body_bytes.write(b"Content-Type: image/jpeg\r\n\r\n")
    body_bytes.write(valid_jpeg)
    body_bytes.write(f"\r\n--{boundary}--\r\n".encode())

    headers = dict(auth_headers)
    headers["Content-Type"] = f"multipart/form-data; boundary={boundary}"

    status, resp_headers, resp_body = make_request(upload_url, method="POST", headers=headers, data=body_bytes.getvalue())
    print(f"Valid Upload 'valid_drawing.jpg' -> Status: {status}")
    
    if status == 200:
        data = json.loads(resp_body)
        file_url = data.get("url")
        print(f"   Uploaded File URL: {file_url}")

        # Authenticated download & header inspection through Gateway
        get_status, get_resp_headers, get_body = make_request(f"{BASE_URL}{file_url}", method="GET", headers=auth_headers)
        
        print(f"GET {file_url} (With Auth) -> Status: {get_status}")
        print("   Inspecting Response Security Headers:")
        nosniff = get_resp_headers.get("X-Content-Type-Options") or get_resp_headers.get("x-content-type-options")
        csp = get_resp_headers.get("Content-Security-Policy") or get_resp_headers.get("content-security-policy")
        cache = get_resp_headers.get("Cache-Control") or get_resp_headers.get("cache-control")
        
        print(f"   • X-Content-Type-Options: {nosniff} | {'PASS' if nosniff == 'nosniff' else 'FAIL'}")
        print(f"   • Content-Security-Policy: {csp} | {'PASS' if csp else 'FAIL'}")
        print(f"   • Cache-Control: {cache} | {'PASS' if 'private' in str(cache) else 'FAIL'}")

    # 5. PATH TRAVERSAL TESTS
    print("\n--- 5. PATH TRAVERSAL TESTS ---")
    traversal_paths = [
        "../test.pdf",
        "..\\test.pdf",
        "%2e%2e/test.pdf",
        "....//test.pdf"
    ]
    for path in traversal_paths:
        url = f"{BASE_URL}/engineering-drawings/{path}"
        status, resp_headers, resp_body = make_request(url, method="GET", headers=auth_headers)
        passed = status in (400, 404)
        result = f"PASS (SAFE {status})" if passed else f"FAIL (Status: {status})"
        print(f"GET /engineering-drawings/{path} -> Status: {status} | Result: {result}")

    print("\n==========================================================")
    print("                 SUITE EXECUTION COMPLETE                 ")
    print("==========================================================")

if __name__ == "__main__":
    run_tests()
