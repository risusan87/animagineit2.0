# AnimagineIt v2.0

AnimagineIt is a quick, simple and intuitive solution to self-host for inference of [animagine-xl-4.0](https://huggingface.co/cagliostrolab/animagine-xl-4.0), fine-tuned checkpoint of SDXL from Stability AI, for text-to-image generation.

Made with Gemini at Google AI Studio:<br>
https://ai.studio/apps/02d5d1bd-728e-4ef1-84d3-6f888c6a5c99

## Installation
Easiest method is to use Docker.
Download and install [Docker Desktop](https://www.docker.com/products/docker-desktop/).
For linux users, CLI only is available option if you prefer.

1. Copy environment variables: `$ cp .env.example .env`
2. Run docker compose: `$ docker-compose up --build`
3. Done! The app is available at http://localhost:8501

## Configuration
The configuration is fully managed inside the app. 
Navigate to the app and it will prompt you for every mandatory configuration parameter.

## Accelerators
Local acceleration is currently not supported. The app relies on Modal's cloud GPU services for inference. 
They provide a free $30 monthly credit for every users. (A single batch of 10 image generation roughly cost around $0.03.)
Follow the app instructions to create an account and get your API key. Simple as that!
