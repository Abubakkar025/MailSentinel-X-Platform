from app.services.auth_analyzer import analyze_auth

def test_analyze_auth_pass():
    header = "mx.google.com; dkim=pass header.i=@techdigest.com; spf=pass (google.com: domain of sender@techdigest.com designates 209.85.221.54 as permitted sender) smtp.mailfrom=techdigest.com; dmarc=pass (p=REJECT) header.from=techdigest.com"
    res = analyze_auth(header)
    assert res.spf_result == "pass"
    assert res.dkim_result == "pass"
    assert res.dmarc_result == "pass"
    assert res.dmarc_policy == "reject"

def test_analyze_auth_fail():
    header = "mx.company.com; spf=fail (sender SPF not authorized) smtp.mailfrom=cheap-hosting-xyz.net; dkim=fail (signature verification failed) header.d=micros0ft-verify.com; dmarc=fail (p=NONE) header.from=micros0ft-verify.com"
    res = analyze_auth(header)
    assert res.spf_result == "fail"
    assert res.dkim_result == "fail"
    assert res.dmarc_result == "fail"
    assert res.dmarc_policy == "none"
