from dataclasses import dataclass


@dataclass
class Profile:
    id: int
    name: str
    base_url: str
    api_key_obscured: str
    model: str
    is_default: bool
    created_at: str
