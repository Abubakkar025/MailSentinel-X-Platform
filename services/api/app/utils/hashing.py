import hashlib

def compute_sha256(data: bytes) -> str:
    """Compute SHA-256 hash of byte data."""
    return hashlib.sha256(data).hexdigest()

def compute_md5(data: bytes) -> str:
    """Compute MD5 hash of byte data."""
    return hashlib.md5(data).hexdigest()
