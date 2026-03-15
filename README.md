# AnimagineIt v2.0

AnimagineIt is a quick, simple and intuitive solution to self-host for inference of [animagine-xl-4.0](https://huggingface.co/cagliostrolab/animagine-xl-4.0), fine-tuned checkpoint of SDXL from Stability AI, for text-to-image generation.

## Installation
Entire app is docker containerized. To build and run the container, use the following commands:

```bash
$ docker-compose up --build
```

The app will be available at `http://localhost:8501`.

## Configuration
The configuration is fully managed inside the app. 
Navigate to the app and it will prompt you for every mandatory configuration parameter.

## Accelerators
CUDA acceleration is most stable, but you can also use AMD ROCm or Apple Metal.
NPU is currently out of scope, but may become for future development.

If local accelerators are not available, alternatively you can provide Modal API key to use their cloud GPU services. They provide a free $30 monthly credit for every users. (A single batch of 10 image generation roughly cost around $0.03.)
Follow the app instructions to create an account and get your API key. Simple as that!