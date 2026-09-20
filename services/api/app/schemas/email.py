from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class ReceivedHop(BaseModel):
    hop: int
    from_host: Optional[str] = None
    by_host: Optional[str] = None
    ip: Optional[str] = None
    protocol: Optional[str] = None
    timestamp: Optional[str] = None
    raw: str

class AttachmentInfo(BaseModel):
    filename: str
    content_type: str
    file_size_bytes: int
    sha256_hash: str
    md5_hash: str
    is_executable: bool = False
    is_macro_enabled: bool = False
    has_double_extension: bool = False

class AuthResults(BaseModel):
    spf_result: str = "none" # pass, fail, softfail, neutral, none
    dkim_result: str = "none" # pass, fail, neutral, none
    dmarc_result: str = "none" # pass, fail, none
    auth_header_raw: Optional[str] = None
    spf_domain: Optional[str] = None
    dkim_domain: Optional[str] = None
    dmarc_policy: Optional[str] = None

class EmailParsed(BaseModel):
    subject: Optional[str] = ""
    from_address: Optional[str] = ""
    from_display_name: Optional[str] = ""
    to_addresses: List[str] = []
    cc_addresses: List[str] = []
    reply_to: Optional[str] = None
    return_path: Optional[str] = None
    message_id: Optional[str] = None
    date_sent: Optional[str] = None
    received_chain: List[ReceivedHop] = []
    x_mailer: Optional[str] = None
    content_type: Optional[str] = None
    body_text: Optional[str] = ""
    body_html: Optional[str] = ""
    raw_headers: str = ""
    auth_results: AuthResults = AuthResults()
    attachments: List[AttachmentInfo] = []
    original_filename: Optional[str] = "uploaded_email.eml"
    file_sha256: str = ""
    file_size_bytes: int = 0
