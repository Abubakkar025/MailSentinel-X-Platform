import sys
import os

# Add backend directory to sys.path BEFORE importing tests
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "services", "api"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from tests.backend.test_email_parser import test_parse_phishing_eml, test_parse_malware_eml
from tests.backend.test_auth_analyzer import test_analyze_auth_pass, test_analyze_auth_fail
from tests.backend.test_risk_engine import test_risk_score_benign, test_risk_score_phishing, test_risk_score_malware
from tests.backend.test_investigate_api import test_health_endpoint, test_investigate_upload_phishing, test_list_cases_endpoint, test_dashboard_stats_endpoint

if __name__ == "__main__":
    print("=" * 60)
    print("  MailSentinel X — Backend Pipeline & API Test Suite")
    print("=" * 60)
    tests = [
        ("test_parse_phishing_eml", test_parse_phishing_eml),
        ("test_parse_malware_eml", test_parse_malware_eml),
        ("test_analyze_auth_pass", test_analyze_auth_pass),
        ("test_analyze_auth_fail", test_analyze_auth_fail),
        ("test_risk_score_benign", test_risk_score_benign),
        ("test_risk_score_phishing", test_risk_score_phishing),
        ("test_risk_score_malware", test_risk_score_malware),
        ("test_health_endpoint", test_health_endpoint),
        ("test_investigate_upload_phishing", test_investigate_upload_phishing),
        ("test_list_cases_endpoint", test_list_cases_endpoint),
        ("test_dashboard_stats_endpoint", test_dashboard_stats_endpoint)
    ]

    passed = 0
    failed = 0

    for name, func in tests:
        try:
            func()
            print(f"  [PASS] {name}")
            passed += 1
        except Exception as e:
            print(f"  [FAIL] {name}: {e}")
            import traceback
            traceback.print_exc()
            failed += 1

    print("=" * 60)
    print(f"  Test Summary: {passed} PASSED, {failed} FAILED")
    print("=" * 60)

    if failed > 0:
        sys.exit(1)
