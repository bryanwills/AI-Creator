<h1 align='center'>🚀 Agentic-AIGC: Video Production with <br/> Multi-Modal Agents</h1>
<!-- <h1 align='center'>🚀 Agentic-AIGC: Multi-Modal Agents for Video Production</h1> -->

<div align='center'>
    <h3>
    One Prompt → Video Creation: AI Unleashed<br/>
    </h3>
</div>

## 🎯 Introduction

This project serves as a **Comprehensive Cookbook for Agentic-AIGC Development**, with a primary focus on video creation workflows. It guides readers through the emerging field of agent-based AI-generated content creation. Video production represents the ultimate complexity challenge in AIGC.

&emsp;&emsp;Unlike traditional AIGC approaches that rely on single-model generation, Agentic-AIGC represents the next frontier where intelligent agents coordinate multiple AI tools, make creative decisions, and maintain coherence across complex production pipelines. Through detailed recipes covering video production, audio synthesis, cross-cultural adaptation, and multi-modal storytelling, this cookbook teaches you how to build systems that can understand intent, reason about creative choices, and execute professional-level content workflows autonomously.

### ✨ What Will You Gain?

- 📚 **Agentic-AIGC Fundamentals** - Understanding of agent-based content generation concepts
- 🍳 **Hands-On Experience** - Working implementations of video production workflows
- 🤖 **Multi-Tool Coordination** - Examples of orchestrating different AI models together
- 🎬 **Video Creation Techniques** - Practical approaches to automated video editing and production
- 🎵 **Audio Processing Skills** - Voice synthesis and music synchronization implementations
- 🔧 **Integration Patterns** - Code examples for combining various AI tools
- 🌐 **Cross-Modal Applications** - Working with text, audio, and visual content simultaneously
- 📖 **Ready-to-Use Recipes** - Six different content creation workflows you can adapt and extend

<div align='center'>
<img src='assets/cover_16-9.png' />
</div>

## 🧾 Table of Contents

- [🎯 Project Introduction](#-project-introduction)
  - [✨ What Will You Gain?](#-what-will-you-gain)
- [🧾 Table of Contents](#-table-of-contents)
- [🍳 What is Agentic-AIGC](#-what-is-agentic-aigc)
- [🧾 Prerequisites \& Setup](#-prerequisites--setup)
  - [Environment](#environment)
  - [Clone and Install](#clone-and-install)
  - [Download Required Models](#download-required-models)
  - [Configure LLM](#configure-llm)
- [🍽 Recipes: Creating Videos](#-recipes-creating-videos)
  - [🎬 Movie Edits (Rhythm-Based)](#-movie-edits-rhythm-based)
  - [📖 Novel-to-Screen Adaptation](#-novel-to-screen-adaptation)
  - [📰 News Summary](#-news-summary)
  - [😂 Meme Video](#-meme-video)
  - [🎵 Music Video (SVC)](#-music-video-svc)
  - [🎭 Cross-Culture Comedy](#-cross-culture-comedy)
- [📋 Configuration Details](#-configuration-details)
  - [Input Configuration](#input-configuration)
  - [Character Image for Visual Retrieval Enhancement](#character-image-for-visual-retrieval-enhancement)
  - [Running the Tool](#running-the-tool)
- [🎥 Demos](#-demos)
- [🙏 Acknowledgements](#-acknowledgements)


## 🍳 What is Agentic-AIGC

Recently, with the help of generative techniques like **diffusion models** and **LLMs**, AI-Generated Content (AIGC) has shown great success in domains like automated writing, image generation, and video clip generation.

However, **creating high-quality videos** remains challenging as it demands more than simple content generation.

It requires **understanding user intent**, **coordinating multiple tools**, and **maintaining coherence** across complex workflows.

These challenges cannot be addressed by generative models alone, as they **lack reasoning capabilities** for complex creative decision-making.

They also **cannot orchestrate specialized tools** for coherent long-form content creation.

---

To solve these challenges, **Agentic-AIGC builds comprehensive agent-based systems** that automate the entire pipeline of expert-level video production.

By deploying **🧠 specialized AI agents** that can reason about creative decisions, **🔧 coordinate multiple generative tools**, and **📝 maintain narrative coherence** across complex multi-modal productions, Agentic-AIGC achieves both **fully automated workflow execution** and **expert-level creative output quality**.

This approach **🏆 rivals professional video production standards** while requiring **minimal human intervention**.



## 🧾 Prerequisites & Setup

This section walks you through the environment setup to get Agentic-AIGC running on your device.

### Environment

*   **GPU Memory:** 8GB
*   **System:** Linux, Windows

### Clone and Install

```bash
# 1. Clone the repository
git clone https://github.com/HKUDS/Agentic-AIGC.git

# 2. Create and activate a Conda environment
conda create --name aicreator python=3.10
conda activate aicreator

# 3. Install system dependencies (pynini, ffmpeg)
conda install -y -c conda-forge pynini==2.1.5 ffmpeg

# 4. Install Python dependencies
pip install -r requirements.txt
```

### Download Required Models

Ensure `git-lfs` is installed first: [https://git-lfs.com](https://git-lfs.com)

```bash
git lfs install
```

Navigate to the `tools` directory and download the necessary models. You only need to download the models relevant to the video types you want to create (see feature/model table below).

```bash
# Example downloads (adjust paths and models as needed)

# Download CosyVoice
cd tools/CosyVoice
huggingface-cli download PillowTa1k/CosyVoice --local-dir pretrained_models

# Download fish-speech
cd tools/fish-speech
huggingface-cli download fishaudio/fish-speech-1.5 --local-dir checkpoints/fish-speech-1.5

# Download seed-vc
cd tools/seed-vc
huggingface-cli download PillowTa1k/seed-vc --local-dir checkpoints

# Download DiffSinger
cd tools/DiffSinger
huggingface-cli download PillowTa1k/DiffSinger --local-dir checkpoints

# Download MiniCPM
cd tools
git lfs clone https://huggingface.co/openbmb/MiniCPM-V-2_6-int4  

# Download Whisper
cd tools
git lfs clone https://huggingface.co/openai/whisper-large-v3-turbo  

# Download all-MiniLM-L6-v2
cd tools
git lfs clone https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2  

# Download ImageBind
cd tools
mkdir .checkpoints
cd .checkpoints
wget https://dl.fbaipublicfiles.com/imagebind/imagebind_huge.pth  
```





**Feature & Model Requirements Table:**



<div align="center">
<table>
<tr>
<th align="center">Feature</th>
<th align="center">Agentic-AIGC</th>
<th align="center">Director</th>
<th align="center">Funclip</th>
<th align="center">NarratoAI</th>
<th align="center">NotebookLM</th>
</tr>
<tr>
<td align="center">Beat-synced Edits</td>
<td align="center">✅</td>
<td align="center">✅</td>
<td align="center">✅</td>
<td align="center">—</td>
<td align="center">—</td>
</tr>
<tr>
<td align="center">Storytelling Video</td>
<td align="center">✅</td>
<td align="center">—</td>
<td align="center">—</td>
<td align="center">✅</td>
<td align="center">—</td>
</tr>
<tr>
<td align="center">Video Overview</td>
<td align="center">✅</td>
<td align="center">✅</td>
<td align="center">✅</td>
<td align="center">✅</td>
<td align="center">✅</td>
</tr>
<tr>
<td align="center">Meme Video</td>
<td align="center">✅</td>
<td align="center">—</td>
<td align="center">—</td>
<td align="center">—</td>
<td align="center">—</td>
</tr>
<tr>
<td align="center">Music Remixes</td>
<td align="center">✅</td>
<td align="center">—</td>
<td align="center">—</td>
<td align="center">—</td>
<td align="center">—</td>
</tr>
<tr>
<td align="center">Comedy Remaking</td>
<td align="center">✅</td>
<td align="center">—</td>
<td align="center">—</td>
<td align="center">—</td>
<td align="center">—</td>
</tr>
</table>
</div>



<div align="center">

<table>
  <tr>
    <th align="center">Feature Type</th>
    <th align="center">Video Demo</th>
    <th align="center">Required Models</th>
  </tr>
  <tr>
    <td align="center">Cross Talk</td>
    <td align="center">English Stand-up Comedy to Chinese Crosstalk</td>
    <td align="center">CosyVoice, MiniCPM, Whisper, ImageBind, all-MiniLM-L6-v2 </td>
  </tr>
  <tr>
    <td align="center">Talk Show</td>
    <td align="center">Chinese Crosstalk to English Stand-up Comedy</td>
    <td align="center">CosyVoice, MiniCPM, Whisper, ImageBind, all-MiniLM-L6-v2</td>
  </tr>
  <tr>
    <td align="center">MAD TTS</td>
    <td align="center">Xiao-Ming-Jian-Mo(小明剑魔) Meme</td>
    <td align="center">fish-speech</td>
  </tr>
  <tr>
    <td align="center">MAD SVC</td>
    <td align="center">AI Music Videos</td>
    <td align="center">DiffSinger, seed-vc, MiniCPM, Whisper, ImageBind, all-MiniLM-L6-v2</td>
  </tr>
  <tr>
    <td align="center">Rhythm</td>
    <td align="center">Spider-Man: Across the Spider-Verse</td>
    <td align="center">MiniCPM, Whisper, ImageBind, all-MiniLM-L6-v2</td>
  </tr>
  <tr>
    <td align="center">Comm</td>
    <td align="center">Novel-to-Screen Adaptation</td>  
    <td align="center">MiniCPM, Whisper, ImageBind, all-MiniLM-L6-v2</td>
  </tr>
  <tr>
    <td align="center">News</td>
    <td align="center">Tech News: OpenAI's GPT-4o Image Generation Release</td>
    <td align="center">MiniCPM, Whisper, ImageBind, all-MiniLM-L6-v2</td>
  </tr>
</table>

</div>

### Configure LLM

1.  **API Keys:** Edit `Agentic-AIGC/environment/config/config.yml` to add your LLM API key and base URL.
2.  **Model Names:** Check and adjust model names in `environment/config/llm.py` according to your LLM provider's requirements. For single-model APIs like official GPT, use the specific model name (e.g., `gpt-4o-mini`) for all entries.
  

## 🍽 Recipes: Creating Videos

Each "recipe" below corresponds to a specific video type you can create with Agentic-AIGC.

### 🎬 Movie Edits (Rhythm-Based)

**Goal:** Create a video edit synchronized with music beats or based on a user's narrative idea, selecting high-energy or relevant clips from source videos.

**Steps:**

1.  **Prepare Source Material:** Place your source video clips in a directory (e.g., `dataset/user_video/`).
2.  **Prepare Music (Optional for beat-sync):** Place your background music file (e.g., `.mp3`) in your project.
3.  **Run the Tool:** Execute `python main.py`.
4.  **Select Type:** When prompted, input type `eg. Rhythm-Based Editing`.
5.  **Provide Prompt:** Enter a detailed description of the story/feel you want (e.g., "Action scenes featuring Spider-Gwen...").
6.  **(Optional) Adjust Beat Sync:** Modify parameters in `music_filter.py` (thresholds, masks) if needed.
7.  **Wait:** The system will process, analyze videos, detect beats, retrieve visual relevant clips, and generate the final video.

### 📖 Novel-to-Screen Adaptation

**Goal:** Turn a text file (like a novel excerpt) into a video with commentary and scenes from provided video sources.

**Steps:**

1.  **Prepare Source Material:** Place your source video clips in a directory (e.g., `dataset/user_video/`). Place your novel `.txt` file in the project.
2.  **(Optional) Prepare Voice Sample:** Place a short `.wav` file (e.g., `ava_16k.wav`) for voice cloning in `dataset/video_edit/voice_data/`.
3.  **(Optional) Prepare Style File:** Customize or input `dataset/video_edit/writing_data/present_style.txt` file describing the desired commentary tone.
4.  **Run the Tool:** Execute `python main.py`.
5.  **Select Type:** When prompted, input type `eg. Novel-to-Screen Commentary`.
6.  **Provide Prompt:** Enter a prompt for the commentary script (e.g., "Write fluent commentary script with 1500 words.").
7.  **Wait:** The system will generate the script, split it, synthesize audio, match scenes, and produce the video.

### 📰 News Summary

**Goal:** Create a summary video from an interview or news source video/audio.

**Steps:**

1.  **Prepare Source Material:** Place your source video/audio file in a directory (e.g., `dataset/user_video/`).
2.  **(Optional) Prepare Voice Sample:** Place a short `.wav` file (e.g., `ava_16k.wav`) for voice cloning in `dataset/video_edit/voice_data/`.
3.  **(Optional) Prepare Style File:** Customize or input `dataset/video_edit/writing_data/present_style.txt` file for the summary tone.
4.  **Run the Tool:** Execute `python main.py`.
5.  **Select Type:** When prompted, input type `eg. Summary of News`.
6.  **Provide Prompt:** Enter a prompt for the summary (e.g., "Short tech news, colloquial expression within 250 words...").
7.  **Wait:** The system will transcribe, summarize, synthesize audio, match clips, and generate the video.

### 😂 Meme Video

**Goal:** Remake an existing video by replacing its audio with a humorous or adapted script, keeping video content synced.

**Steps:**

1.  **Prepare Source Video:** Place your source meme video (e.g., `.mp4`) in a directory (e.g., `dataset/meme_video/`).
2.  **Configure Input:** Edit `Agentic-AIGC/environment/config/mad_tts.yml`. Set `video_path` to your source video. Adjust `output_path` if needed.
3.  **Run the Tool:** Execute `python main.py`.
4.  **Select Type:** When prompted, choose `TTS`.
5.  **Provide Prompt:** Enter a detailed prompt for rewriting the audio (e.g., "Create a humorous narrative about two PhD students...").
6.  **Wait:** The system will extract audio, transcribe, rewrite, generate new audio (Fish-Speech), adjust video timing, and combine.

### 🎵 Music Video (SVC)

**Goal:** Create a cover version of a song using a target voice, potentially synced with visuals.

**Steps:**

1.  **Prepare Source Material:** Place your MIDI file, original lyrics (`.txt`), background music (BGM) file, and target voice sample (`.wav`) in the project.
2.  **Configure Input:** Edit `Agentic-AIGC/environment/config/mad_svc.yml`. Set paths for `midi_path`, `lyrics_path`, `bgm_path` (if used), `target_voice_path`.
3.  **Run the Tool:** Execute `python main.py`.
4.  **Select Type:** When prompted, choose `SVC`.
5.  **Provide Prompt:** Enter a prompt for adapting the lyrics (e.g., "The song is performed by Patrick Star, focusing on the theme of struggles of manuscript submission...").
6.  **Wait:** The system will process MIDI, generate audio segments (DiffSinger), clone voice (Seed-VC), adjust timing, and prepare for video editing (integrates with Movie Edit pipeline).

### 🎭 Cross-Culture Comedy

**Goal:** Adapt a comedy audio (e.g., English stand-up) into a different format (e.g., Chinese crosstalk) or vice-versa.

**Steps:**

1.  **Prepare Source Audio:** Place your source comedy audio file (e.g., `.wav`) in a directory (e.g., `dataset/cross_talk/`).
2.  **Prepare Voice Samples:** Place `.wav` files for the target voices (e.g.,郭德纲, 付航, we have placed some ready-to-use samples in the warehouse.).
3.  **Configure Input:** Edit `Agentic-AIGC/environment/config/cross_talk.yml` (or `talk_show.yml`). Set `audio_path` to your source audio. Set paths for `dou_gen`, `peng_gen` (or relevant character voices). Adjust `output` path.
4.  **Run the Tool:** Execute `python main.py`.
5.  **Select Type:** When prompted, choose `Cross Talk` or `Talk Show`.
6.  **Provide Prompt:** Enter a prompt for adapting the script (e.g., "Generate a Chinese crosstalk script...").
7.  **Wait:** The system will adapt the script, synthesize voices (CosyVoice), add effects, and prepare for video editing (integrates with Movie Edit pipeline).



## 📋 Configuration Details

### Input Configuration

Input settings for different video types are managed in YAML files located in `Agentic-AIGC/environment/config/`. Common parameters include:

*   `reqs`: A prompt or instruction for the specific agent.
*   `audio_path`: Path to the source audio file.
*   `video_source_dir`: Path to the directory containing source video clips.
*   `novel_path`: Path to the source text file (for novel adaptation).
*   `output`: Path for the final generated video file.
*   `dou_gen`, `peng_gen`, etc.: Paths to specific voice sample files for cloning.

Always ensure paths in these YAML files are correct relative to your project structure.

### Character Image for Visual Retrieval Enhancement

To improve character recognition during video editing/retrieval:

1.  Navigate to `dataset/video_edit/face_db`.
2.  Create a folder named exactly after the character (e.g., `Spiderman`, `Batman`).
3.  Place clear images of that character's face inside the corresponding folder.
4.  Example structure:
    ```
    face_db/
    ├── Spiderman/
    │   ├── image01.png
    │   └── image02.png
    └── Batman/
        └── image01.png
    ```

### Running the Tool

After setup and configuration:

1.  Activate your Conda environment: `conda activate aicreator`.
2.  Run the main script from the project root: `python main.py`.
3.  Follow the on-terminal prompts to select the video type and provide any required input.

## 🎥 Demos

<table>
<tr>
<td align="center" width="33%">
<a href="https://www.bilibili.com/video/BV1C9Z6Y3ESo/" target='_blank'><img src="assets/spiderman_cover.png" width="100%"></a>
Movie Edits
</td>
<td align="center" width="33%">
<a href="https://www.bilibili.com/video/BV1ucZ6YmEBU/" target='_blank'><img src="assets/masterma_cover.png" width="100%"></a>
Meme Videos
</td>
<td align="center" width="33%">
<a href="https://www.bilibili.com/video/BV1t8ZCYsEeA/" target='_blank'><img src="assets/airencuoguo_cover.png" width="100%"></a>
Music Videos
</td>
</tr>
<tr>
<td align="center" width="33%">
<a href="https://www.bilibili.com/video/BV1ucZ6YmESg/" target='_blank'><img src="assets/adapted_crosstalk_cover.png" width="100%"></a>
Verbal Comedy Arts
</td>
<td align="center" width="33%">
<a href="https://www.bilibili.com/video/BV1TmZ6YjEvV/" target='_blank'><img src="assets/joylife_cover.png" width="100%"></a>
Commentary Video
</td>
<td align="center" width="33%">
<a href="https://www.bilibili.com/video/BV12mZ6YLEqW/" target='_blank'><img src="assets/openai_news_cover.png" width="100%"></a>
Video Overview
</td>
</tr>
</table>

For additional demo usage details, please refer to:  
👉 [Demos Documentation](demos_documents.md)


You can find more fun videos on our Bilibili channel here:  
👉 [Bilibili Homepage](https://space.bilibili.com/3546868449544308)  
Feel free to check it out for more entertaining content! 😊

**Note**: All videos are used for research and demonstration purposes only. The audio and visual assets are sourced from the Internet. Please contact us if you believe any content infringes upon your intellectual property rights.



---

## 🙏 Acknowledgements

We would like to express our deepest gratitude to the numerous individuals and organizations that have made Agentic-AIGC possible. This project stands on the shoulders of giants, benefiting from the collective wisdom of the open-source community and the groundbreaking work of AI researchers worldwide.

First and foremost, we are indebted to the open-source community and AI service providers whose tools and technologies form the foundation of our work:

- [CosyVoice](https://github.com/FunAudioLLM/CosyVoice  )
- [Fish Speech](https://github.com/fishaudio/fish-speech  )
- [Seed-VC](https://github.com/Plachtaa/seed-vc  )
- [DiffSinger](https://github.com/MoonInTheRiver/DiffSinger  )
- [VideoRAG](https://github.com/HKUDS/VideoRAG  )
- [ImageBind](https://github.com/facebookresearch/ImageBind  )
- [whisper](https://github.com/openai/whisper  )
- [MiniCPM](https://github.com/OpenBMB/MiniCPM-o  )
- [Librosa](https://github.com/librosa/librosa  )
- [moviepy](https://github.com/Zulko/moviepy  )
- [ffmpeg](https://github.com/FFmpeg/FFmpeg  )

Our work has been significantly enriched by the creative contributions of content creators across various platforms:
- The talented creators behind the original video content we used for testing and demonstration
- The comedy artists whose work inspired our cross-cultural adaptations
- The filmmakers and production teams behind the movies and TV shows featured in our demos
- The content creators who have shared their knowledge and insights about video editing techniques

All content used in our demonstrations is for research purposes only. We deeply respect the intellectual property rights of all content creators and welcome any concerns or feedback regarding content usage.
- Spider-Man movie editing idea reference Douyin account[@我是不是zx](https://www.douyin.com/user/MS4wLjABAAAApVuuGxyM7CI4MJRHQvc6SAy0J2zrJ12eg3f5jFqCIXk?from_tab_name=main&vid=7468621366913273115)

<!-- # Framework of Agentic-AIGC

[First a framework plot]
Then a short explanation on the framework, without specific technical details. -->
