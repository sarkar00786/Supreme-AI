# token_server.py
# This script creates a simple web server to generate LiveKit access tokens.
# Your Aura AI browser extension will request a token from this server
# to connect to LiveKit rooms where your AI agent is.

import os
from livekit import api
from flask import Flask, request, jsonify
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# IMPORTANT: These are your LiveKit API Keys and Secret.
# They are loaded from your .env file for security.
LIVEKIT_API_KEY = os.getenv('LIVEKIT_API_KEY')
LIVEKIT_API_SECRET = os.getenv('LIVEKIT_API_SECRET')

if not LIVEKIT_API_KEY or not LIVEKIT_API_SECRET:
    print("WARNING: LIVEKIT_API_KEY or LIVEKIT_API_SECRET not found in .env file.")
    print("Please ensure your .env file has these variables set correctly.")

@app.route('/getToken', methods=['GET'])
def get_token():
    """
    Generates a LiveKit access token and returns it.
    The frontend extension will call this endpoint.
    """
    # You can customize room and identity based on your needs.
    # For now, we'll use simple hardcoded values or query parameters.
    # It's safer to get these from the request in a real application.
    room_name = request.args.get('roomName', 'aura-ai-room') # Default room name
    participant_identity = request.args.get('identity', 'aura-ai-user') # Default user identity
    participant_name = request.args.get('name', 'Aura AI User')

    try:
        # Create a new LiveKit Access Token
        token = api.AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET) \
            .with_identity(participant_identity) \
            .with_name(participant_name) \
            .with_grants(api.VideoGrants(
                room_join=True, # Allows joining the room
                room=room_name, # Specifies the room to join
            ))
        
        # Convert the token to a JWT string
        jwt_token = token.to_jwt()
        
        # Return the token as a JSON response
        return jsonify(token=jwt_token)
    except Exception as e:
        print(f"Error generating token: {e}")
        return jsonify(error="Failed to generate token"), 500

if __name__ == '__main__':
    # Run the Flask server.
    # In a production environment, you would use a more robust web server like Gunicorn or uWSGI.
    print("LiveKit Token Server starting on http://127.0.0.1:5000")
    print("Ensure LIVEKIT_API_KEY and LIVEKIT_API_SECRET are set in your .env file.")
    app.run(debug=True, port=5000) # debug=True is for development, set to False for production
