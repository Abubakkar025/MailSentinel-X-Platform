import email
from email import policy
from email.parser import BytesParser
import re
from typing import Dict, Any, List
from app.schemas.email import EmailParsed, ReceivedHop, AttachmentInfo, AuthResults
from app.utils.hashing import compute_sha256, compute_md5
from app.utils.ip_extractor import parse_received_header_ip, filter_public_ips, extract_ips

EXECUTABLE_EXTENSIONS = ['.exe', '.scr', '.bat', '.cmd', '.vbs', '.js', '.hta', '.cpl', '.msi', '.ps1', '.iso', '.img']
MACRO_EXTENSIONS = ['.docm', '.xlsm', '.pptm', '.dotm', '.xltm']

def parse_eml(file_bytes: bytes, filename: str = "uploaded_email.eml") -> EmailParsed:
    """
    Parse a raw .eml RFC 5322 MIME message byte stream.
    Extracts headers, Received chain, bodies, attachments, and authentication results.
    """
    msg = BytesParser(policy=policy.default).parsebytes(file_bytes)

    raw_headers = ""
    for k, v in msg.items():
        raw_headers += f"{k}: {v}\n"

    # Extract headers
    subject = str(msg.get("Subject", ""))
    from_header = str(msg.get("From", ""))
    to_header = str(msg.get("To", ""))
    cc_header = str(msg.get("Cc", ""))
    reply_to = str(msg.get("Reply-To", "")).strip("<> ") if msg.get("Reply-To") else None
    return_path = str(msg.get("Return-Path", "")).strip("<> ") if msg.get("Return-Path") else None
    message_id = str(msg.get("Message-ID", "")) if msg.get("Message-ID") else None
    date_sent = str(msg.get("Date", "")) if msg.get("Date") else None
    x_mailer = str(msg.get("X-Mailer", "")) if msg.get("X-Mailer") else None
    content_type = str(msg.get("Content-Type", "")) if msg.get("Content-Type") else None

    # Parse From address and display name
    from_address = from_header
    from_display_name = ""
    if "<" in from_header and ">" in from_header:
        from_display_name = from_header.split("<")[0].strip('" ').strip()
        from_address = from_header.split("<")[1].split(">")[0].strip()

    # Parse To and CC addresses
    to_addresses = [addr.strip("<> ") for addr in to_header.split(",") if addr.strip()]
    cc_addresses = [addr.strip("<> ") for addr in cc_header.split(",") if addr.strip()]

    # Parse Received header chain (chronological hop order)
    received_headers = msg.get_all("Received", [])
    received_chain: List[ReceivedHop] = []
    hop_num = 1
    for raw_hop in received_headers:
        from_host, by_host, ip = parse_received_header_ip(str(raw_hop))
        received_chain.append(ReceivedHop(
            hop=hop_num,
            from_host=from_host,
            by_host=by_host,
            ip=ip,
            raw=str(raw_hop)
        ))
        hop_num += 1

    # Parse Authentication-Results header
    auth_header_raw = str(msg.get("Authentication-Results", "")) if msg.get("Authentication-Results") else None

    # Extract email bodies (Text and HTML) and attachments
    body_text = ""
    body_html = ""
    attachments: List[AttachmentInfo] = []

    if msg.is_multipart():
        for part in msg.walk():
            part_content_type = part.get_content_type()
            part_disposition = str(part.get_content_disposition() or "")
            part_filename = part.get_filename()

            if part_disposition == "attachment" or part_filename:
                fname = part_filename or "unnamed_attachment"
                payload = part.get_payload(decode=True) or b""
                sha256_h = compute_sha256(payload)
                md5_h = compute_md5(payload)
                ext = ("." + fname.split(".")[-1]).lower() if "." in fname else ""
                
                # Check extension properties
                is_exec = ext in EXECUTABLE_EXTENSIONS
                is_macro = ext in MACRO_EXTENSIONS
                has_double_ext = len(fname.split(".")) > 2 and ("." + fname.split(".")[-1]).lower() in EXECUTABLE_EXTENSIONS

                attachments.append(AttachmentInfo(
                    filename=fname,
                    content_type=part_content_type,
                    file_size_bytes=len(payload),
                    sha256_hash=sha256_h,
                    md5_hash=md5_h,
                    is_executable=is_exec,
                    is_macro_enabled=is_macro,
                    has_double_extension=has_double_ext
                ))
            elif part_content_type == "text/plain":
                try:
                    body_text += part.get_content()
                except Exception:
                    pass
            elif part_content_type == "text/html":
                try:
                    body_html += part.get_content()
                except Exception:
                    pass
    else:
        part_content_type = msg.get_content_type()
        try:
            content = msg.get_content()
            if part_content_type == "text/html":
                body_html = content
            else:
                body_text = content
        except Exception:
            pass

    sha256_file = compute_sha256(file_bytes)

    return EmailParsed(
        subject=subject,
        from_address=from_address,
        from_display_name=from_display_name,
        to_addresses=to_addresses,
        cc_addresses=cc_addresses,
        reply_to=reply_to,
        return_path=return_path,
        message_id=message_id,
        date_sent=date_sent,
        received_chain=received_chain,
        x_mailer=x_mailer,
        content_type=content_type,
        body_text=body_text,
        body_html=body_html,
        raw_headers=raw_headers,
        auth_results=AuthResults(auth_header_raw=auth_header_raw),
        attachments=attachments,
        original_filename=filename,
        file_sha256=sha256_file,
        file_size_bytes=len(file_bytes)
    )
