from pyngrok import ngrok
from pyngrok import conf
import os

# Optionally set your authtoken here or in environment variable NGROK_AUTHTOKEN
authtoken = os.environ.get('NGROK_AUTHTOKEN')
if authtoken:
    conf.get_default().auth_token = authtoken

def main():
    # Opens an HTTP tunnel to port 5000
    public_url = ngrok.connect(5000, "http").public_url
    print('Public URL:', public_url)
    print('Press Ctrl+C to stop the tunnel')
    try:
        # block forever
        ngrok.get_ngrok_process().join()
    except KeyboardInterrupt:
        print('Shutting down...')


if __name__ == '__main__':
    main()
