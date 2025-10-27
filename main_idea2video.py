import asyncio
from pipelines.idea2video_pipeline import Idea2VideoPipeline
from langchain.chat_models import init_chat_model
from tools.image_generator.gemini import GeminiImageGenerator
from tools.video_generator.veo import VeoVideoGenerator


# SET YOUR OWN API KEYS AND BASE URLS HERE
chat_model_name = "gemini-pro-latest"
api_key = ""
base_url = ""
working_dir = ".working_dir/idea2video"


# SET YOUR OWN IDEA, USER REQUIREMENT, AND STYLE HERE
idea = \
"""
If a cat and a dog are best friends, what would happen when they meet a new cat?
"""
user_requirement = \
"""
For children, do not exceed 3 scenes.
"""
style = "Cartoon"


pipeline = Idea2VideoPipeline(
    chat_model=init_chat_model(
        chat_model_name=chat_model_name,
        api_key=api_key,
        base_url=base_url,
    ),
    image_generator=GeminiImageGenerator(
        api_key=api_key,
        base_url=base_url,
    ),
    video_generator=VeoVideoGenerator(
        api_key=api_key,
        t2v_model="veo3-fast-frames",
        ff2v_model="veo3-fast-frames",
        flf2v_model="veo2-fast-frames",
    ),
    working_dir=working_dir,
)
asyncio.run(pipeline(idea=idea, user_requirement=user_requirement, style=style))
