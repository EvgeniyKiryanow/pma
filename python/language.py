# hello.py
import sys

def main():
    arg = sys.argv[1] if len(sys.argv) > 1 else "NoArg"
    print(f"Hello from Python! Received: {arg}")

if __name__ == '__main__':
    main()
