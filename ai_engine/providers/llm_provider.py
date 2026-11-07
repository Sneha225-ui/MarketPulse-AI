
import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_ollama import ChatOllama

load_dotenv()


def get_llm():
    provider = os.getenv("LLM_PROVIDER", "openai").lower()

    if provider == "openai":
        api_key = os.getenv("OPENAI_API_KEY")

        if not api_key:
            raise ValueError(
                "OPENAI_API_KEY is missing from ai_engine/.env"
            )

        return ChatOpenAI(
            model=os.getenv("OPENAI_MODEL", "gpt-4.1-mini"),
            api_key=api_key,
            temperature=0.2
        )

    if provider == "ollama":
        return ChatOllama(
            model=os.getenv("OLLAMA_MODEL", "llama3.2"),
            base_url=os.getenv(
                "OLLAMA_BASE_URL",
                "http://localhost:11434"
            ),
            temperature=0.2
        )

    raise ValueError(f"Unsupported LLM provider: {provider}")
