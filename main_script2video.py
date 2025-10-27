import asyncio
from pipelines.script2video_pipeline import Script2VideoPipeline
from langchain.chat_models import init_chat_model
from tools.image_generator.gemini import GeminiImageGenerator
from tools.video_generator.veo import VeoVideoGenerator


# SET YOUR OWN API KEYS AND BASE URLS HERE
chat_model_name = "gemini-pro-latest"
api_key = ""
base_url = ""
working_dir = ".working_dir/script2video"


# SET YOUR OWN SCRIPT, USER REQUIREMENT, AND STYLE HERE
script = \
"""
EXT. SCHOOL GYM - DAY
A group of students are practicing basketball in the gym. The gym is large and open, with a basketball hoop at one end and a large crowd of spectators at the other end. John (18, male, tall, athletic) is the star player, and he is practicing his dribble and shot. Jane (17, female, short, athletic) is the assistant coach, and she is helping John with his practice. The other students are watching the practice and cheering for John.
John: (dribbling the ball) I'm going to score a basket!
Jane: (smiling) Good job, John!
John: (shooting the ball) Yes!
Jane: (clapping) Great shot, John!
John: (dribbling the ball) I'm going to score a basket!
Jane: (smiling) Good job, John!
John: (shooting the ball) Yes!
Jane: (clapping) Great shot, John!
...
"""
user_requirement = \
"""
Fast-paced with no more than 20 shots.
"""
style = "Realistic"


pipeline = Script2VideoPipeline(
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
asyncio.run(pipeline(script=script, user_requirement=user_requirement, style=style))
