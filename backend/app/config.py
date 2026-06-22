"""应用配置：通过 .env 读取 MiniMax API 及运行时参数。"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """MiniMax API 及沙箱相关配置。"""

    # LLM
    minimax_api_key: str = "sk-cp-3qOvrhpUoeAUdT8Qih_CHjJ1Vis7bmuz_YpLZLDuqz6rY5qLSugpJV1Z0FKUCNnT7l0JZggJqXzw5XGPZmXXZuvF1Cg0DDJD3WH_l0r_S0sHmbpFkGxEGU4"
    minimax_base_url: str = "https://api.minimax.chat/v1"
    minimax_model: str = "MiniMax-M3"
    llm_timeout_sec: int = 60

    # Python 沙箱
    python_exec_timeout_sec: int = 5
    python_mem_limit_mb: int = 256

    # 反思
    max_reflect_rounds: int = 3
    reflect_confidence_threshold: float = 0.85

    # CORS
    frontend_origin: str = "http://localhost:5173"

    # 代码最大长度（字符）
    max_code_length: int = 8000

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")


@lru_cache
def get_settings() -> Settings:
    """返回全局唯一 Settings 实例。"""
    return Settings()