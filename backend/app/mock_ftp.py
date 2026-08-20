import socket
import sys

def start_mock_ftp(port=21):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    
    try:
        s.bind(('0.0.0.0', port))
    except PermissionError:
        print(f"[-] Permission denied on port {port}. (On Windows/Linux, ports < 1024 require Administrator/root privileges).")
        if port == 21:
            print("[+] Retrying on port 2121 (Alternative FTP port)...")
            return start_mock_ftp(2121)
        else:
            sys.exit(1)
    except Exception as e:
        print(f"[-] Failed to bind to port {port}: {e}")
        sys.exit(1)
        
    s.listen(5)
    active_port = s.getsockname()[1]
    print(f"\n========================================================")
    print(f" SENTINEL-X MOCK FTP SERVER IS RUNNING")
    print(f"========================================================")
    print(f"[*] Port: {active_port}")
    print(f"[*] Interfaces: Bind to all interfaces (0.0.0.0)")
    print(f"[*] Status: LISTENING")
    print(f"[*] Test commands: Connect using any FTP client or run:")
    print(f"    ftp 127.0.0.1 {active_port if active_port != 21 else ''}")
    print(f"--------------------------------------------------------")
    print(f"[*] Press Ctrl+C to stop the server.")
    print(f"========================================================\n")
    
    try:
        while True:
            client, addr = s.accept()
            print(f"[+] Connection established from {addr[0]}:{addr[1]}")
            client.sendall(b"220 Mock FTP Server Ready\r\n")
            
            while True:
                data = client.recv(1024)
                if not data:
                    break
                cmd = data.decode('utf-8', errors='ignore').strip()
                print(f"[*] Received from {addr[0]}: {cmd}")
                if cmd.upper().startswith("QUIT"):
                    client.sendall(b"221 Goodbye.\r\n")
                    break
                else:
                    client.sendall(b"500 Syntax error, command unrecognized.\r\n")
            client.close()
            print(f"[-] Connection closed from {addr[0]}:{addr[1]}")
    except KeyboardInterrupt:
        print("\n[*] Stopping Mock FTP Server.")
    finally:
        s.close()

if __name__ == "__main__":
    start_mock_ftp()
