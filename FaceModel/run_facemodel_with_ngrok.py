import os
from pyngrok import ngrok
import uvicorn


def main() -> None:
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8002"))
    authtoken = os.getenv("NGROK_AUTHTOKEN", "")

    if authtoken:
        ngrok.set_auth_token(authtoken)

    # Prevent "endpoint already online" conflicts from previous ngrok sessions.
    try:
        for tunnel in ngrok.get_tunnels():
            ngrok.disconnect(tunnel.public_url)
        ngrok.kill()
    except Exception as e:
        print(f"ngrok cleanup warning: {e}")

    tunnel = ngrok.connect(addr=port, proto="http")
    public_url = tunnel.public_url

    print(f"Public URL: {public_url}")
    print(f"Recognize endpoint: {public_url}/recognize")

    uvicorn.run("main:app", host=host, port=port, reload=False)


if __name__ == "__main__":
    main()
