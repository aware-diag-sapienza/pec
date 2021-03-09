import argparse
from pec import PECServer

if __name__ == "__main__":
    defaultPort = 6789
    parser = argparse.ArgumentParser()
    parser.add_argument("-p", "--port", help=f"port number, default port is {defaultPort}")
    args = parser.parse_args()
    
    port = args.port if args.port is not None else defaultPort
    print(f"Starting PEC Server on address ws://0.0.0.0:{port}")
    server = PECServer(port)
    server.run()