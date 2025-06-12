# agent.py
# This is the core Python script for your Aura AI voice assistant.
# It uses LiveKit Agents to connect to audio, process speech,
# generate responses with an LLM, and convert text back to speech.

from dotenv import load_dotenv
from livekit import agents
from livekit.agents import AgentSession, Agent, RoomInputOptions
from livekit.plugins import (
    openai, # Used for the LLM (Large Language Model)
    cartesia, # Used for TTS (Text-to-Speech)
    deepgram, # Used for STT (Speech-to-Text)
    noise_cancellation, # For improving audio quality
    silero, # For VAD (Voice Activity Detection)
)
from livekit.plugins.turn_detector.multilingual import MultilingualModel

# Load environment variables (like API keys) from the .env file
load_dotenv()

# Define your AI Assistant's personality and role
class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(instructions="You are Aura AI, a helpful and friendly voice assistant. Your purpose is to assist users with their queries in a polite and efficient manner. Always respond concisely and clearly.")

# Main entry point for the LiveKit agent
async def entrypoint(ctx: agents.JobContext):
    # Configure the AgentSession with various plugins
    session = AgentSession(
        stt=deepgram.STT(model="nova-3", language="multi"), # Speech-to-Text: Deepgram for transcribing user's speech
        llm=openai.LLM(model="gpt-4o-mini"), # Large Language Model: OpenAI's GPT-4o-mini for generating responses
        tts=cartesia.TTS(model="sonic-2", voice="f786b574-daa5-4673-aa0c-cbe3e8534c02"), # Text-to-Speech: Cartesia for natural voice output
        vad=silero.VAD.load(), # Voice Activity Detection: Silero for detecting when speech starts/stops
        turn_detection=MultilingualModel(), # For managing conversational turns
    )

    # Start the agent session in the LiveKit room
    await session.start(
        room=ctx.room, # The LiveKit room context
        agent=Assistant(), # Your defined AI Assistant
        room_input_options=RoomInputOptions(
            # LiveKit Cloud enhanced noise cancellation to improve audio input
            noise_cancellation=noise_cancellation.BVC(),
        ),
    )

    # Connect to the LiveKit room
    await ctx.connect()

    # Generate an initial greeting from Aura AI
    await session.generate_reply(
        instructions="Hello! I am Aura AI, your personal voice assistant. How can I help you today?"
    )

# This block allows you to run the agent from the command line
if __name__ == "__main__":
    agents.cli.run_app(agents.WorkerOptions(entrypoint_fnc=entrypoint))
