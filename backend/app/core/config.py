from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://ffxiv:ffxiv@localhost:5432/mitplanner"
    secret_key: str = "dev-secret-key"

    class Config:
        env_file = ".env"


settings = Settings()
