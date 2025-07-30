#!/usr/bin/env python3

"""
UI Workflow and User Experience Test
Tests the voice cloning interface and Echo chat functionality from a user perspective.
"""

import requests
import json
import time
from pathlib import Path
from datetime import datetime

class UIWorkflowTester:
    def __init__(self):
        self.web_base_url = "http://localhost:3001"
        self.test_results = []
        
    def log_test(self, test_name, status, details=None, severity="INFO"):
        """Log test results"""
        result = {
            "test": test_name,
            "status": status,
            "severity": severity,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        
        colors = {
            "PASS": "\033[92m",  # Green
            "FAIL": "\033[91m",  # Red  
            "WARN": "\033[93m",  # Yellow
            "INFO": "\033[94m",  # Blue
            "CRITICAL": "\033[95m"  # Magenta
        }
        color = colors.get(severity, colors["INFO"])
        reset = "\033[0m"
        
        print(f"{color}[{severity}] {test_name}: {status}{reset}")
        if details:
            print(f"  Details: {details}")

    def test_voice_clone_interface_accessibility(self):
        """Test Voice Clone Interface Structure and Accessibility"""
        print("\n=== Testing Voice Clone Interface Accessibility ===")
        
        # Check if dashboard page loads
        try:
            response = requests.get(f"{self.web_base_url}/dashboard", timeout=10)
            if response.status_code == 200:
                html_content = response.text
                
                # Check for voice cloning elements
                if "Clone Your Voice" in html_content or "voice-clone" in html_content:
                    self.log_test("Voice Clone Interface", "PASS", 
                                "Voice cloning interface accessible")
                else:
                    self.log_test("Voice Clone Interface", "WARN", 
                                "Voice interface elements not found in dashboard")
                
                # Check for mobile-friendly elements
                if "mobile-full-height" in html_content and "mobile-card" in html_content:
                    self.log_test("Mobile Compatibility", "PASS", 
                                "Mobile-optimized CSS classes found")
                else:
                    self.log_test("Mobile Compatibility", "WARN", 
                                "Mobile optimization classes not found")
                
                # Check for accessibility features
                if 'aria-label' in html_content and 'role=' in html_content:
                    self.log_test("Accessibility Features", "PASS", 
                                "ARIA labels and roles found")
                else:
                    self.log_test("Accessibility Features", "WARN", 
                                "Limited accessibility features detected")
            else:
                self.log_test("Dashboard Access", "FAIL", 
                            f"Dashboard not accessible: {response.status_code}", "CRITICAL")
                
        except Exception as e:
            self.log_test("Dashboard Access", "FAIL", 
                        f"Connection failed: {e}", "CRITICAL")

    def test_echo_chat_interface(self):
        """Test AI Echo Chat Interface"""
        print("\n=== Testing AI Echo Chat Interface ===")
        
        try:
            response = requests.get(f"{self.web_base_url}/ai-echo", timeout=10)
            if response.status_code == 200:
                html_content = response.text
                
                # Check for chat interface elements
                if "Chat with" in html_content and "AI Echo" in html_content:
                    self.log_test("Echo Chat Interface", "PASS", 
                                "AI Echo chat interface accessible")
                else:
                    self.log_test("Echo Chat Interface", "WARN", 
                                "Chat interface elements not clearly visible")
                
                # Check for voice controls
                if "Voice" in html_content and ("🔊" in html_content or "🔇" in html_content):
                    self.log_test("Voice Controls", "PASS", 
                                "Voice toggle controls found")
                else:
                    self.log_test("Voice Controls", "WARN", 
                                "Voice controls not visible")
                
                # Check for suggested questions
                if "Try asking" in html_content or "suggested" in html_content.lower():
                    self.log_test("User Guidance", "PASS", 
                                "Suggested questions for user guidance")
                else:
                    self.log_test("User Guidance", "WARN", 
                                "Limited user guidance found")
                
            else:
                self.log_test("Echo Chat Access", "FAIL", 
                            f"Echo chat not accessible: {response.status_code}", "CRITICAL")
                
        except Exception as e:
            self.log_test("Echo Chat Access", "FAIL", 
                        f"Connection failed: {e}", "CRITICAL")

    def test_responsive_design(self):
        """Test Responsive Design Elements"""
        print("\n=== Testing Responsive Design ===")
        
        # Simulate different viewport sizes
        viewport_tests = [
            ("Mobile Portrait", {"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15"}),
            ("Tablet", {"User-Agent": "Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15"}),
            ("Desktop", {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"})
        ]
        
        for viewport_name, headers in viewport_tests:
            try:
                response = requests.get(f"{self.web_base_url}/ai-echo", 
                                      headers=headers, timeout=10)
                if response.status_code == 200:
                    html_content = response.text
                    
                    # Check for responsive elements
                    responsive_elements = [
                        "sm:px-", "md:", "lg:", "xl:", 
                        "mobile-", "max-w-", "min-h-"
                    ]
                    
                    responsive_found = sum(1 for elem in responsive_elements 
                                         if elem in html_content)
                    
                    if responsive_found >= 3:
                        self.log_test(f"Responsive Design - {viewport_name}", "PASS", 
                                    f"Found {responsive_found} responsive design elements")
                    else:
                        self.log_test(f"Responsive Design - {viewport_name}", "WARN", 
                                    f"Limited responsive elements: {responsive_found}")
                else:
                    self.log_test(f"Responsive Design - {viewport_name}", "FAIL", 
                                f"Page not accessible: {response.status_code}")
                    
            except Exception as e:
                self.log_test(f"Responsive Design - {viewport_name}", "FAIL", 
                            f"Test failed: {e}")

    def test_voice_interface_workflow(self):
        """Test Voice Interface Workflow Logic"""
        print("\n=== Testing Voice Interface Workflow ===")
        
        # Test 4 diverse passages structure
        passages_expected = [
            "conversational-warmth",
            "emotional-expression", 
            "wisdom-legacy",
            "technical-clarity"
        ]
        
        try:
            # Read the VoiceCloneInterface component to verify structure
            component_path = Path("/home/luke/personal-ai-clone/web/components/VoiceCloneInterface.tsx")
            if component_path.exists():
                with open(component_path, 'r') as f:
                    component_content = f.read()
                
                # Check for all 4 passage types
                passages_found = []
                for passage in passages_expected:
                    if passage in component_content:
                        passages_found.append(passage)
                
                if len(passages_found) == 4:
                    self.log_test("Voice Passages Structure", "PASS", 
                                f"All 4 diverse passages configured: {', '.join(passages_found)}")
                else:
                    self.log_test("Voice Passages Structure", "WARN", 
                                f"Only {len(passages_found)}/4 passages found")
                
                # Check for quality assessment features
                quality_features = [
                    "audioQuality", "qualityScore", "analyzeRecordingQuality",
                    "phoneticDiversity", "emotionalRange"
                ]
                
                quality_found = sum(1 for feature in quality_features 
                                  if feature in component_content)
                
                if quality_found >= 3:
                    self.log_test("Quality Assessment", "PASS", 
                                f"Voice quality assessment features implemented")
                else:
                    self.log_test("Quality Assessment", "WARN", 
                                f"Limited quality assessment: {quality_found}/5 features")
                
                # Check for RTX 5090 training integration
                if "rtx5090" in component_content.lower() or "RTX 5090" in component_content:
                    self.log_test("RTX 5090 Integration", "PASS", 
                                "RTX 5090 training integration found")
                else:
                    self.log_test("RTX 5090 Integration", "WARN", 
                                "RTX 5090 integration not clearly indicated")
                
                # Check for user feedback and guidance
                feedback_elements = [
                    "currentTip", "Recording Guide", "Quality Tips", 
                    "trainingDataSufficient", "meetsRequirements"
                ]
                
                feedback_found = sum(1 for elem in feedback_elements 
                                   if elem in component_content)
                
                if feedback_found >= 3:
                    self.log_test("User Feedback System", "PASS", 
                                f"Comprehensive user feedback system")
                else:
                    self.log_test("User Feedback System", "WARN", 
                                f"Limited user feedback: {feedback_found}/5 elements")
                    
            else:
                self.log_test("Component Structure", "FAIL", 
                            "VoiceCloneInterface component not found", "CRITICAL")
                
        except Exception as e:
            self.log_test("Component Analysis", "FAIL", 
                        f"Failed to analyze component: {e}")

    def test_error_handling_ui(self):
        """Test UI Error Handling and User Experience"""
        print("\n=== Testing UI Error Handling ===")
        
        try:
            # Check AIEchoChat component for error handling
            echo_component_path = Path("/home/luke/personal-ai-clone/web/components/AIEchoChat.tsx")
            if echo_component_path.exists():
                with open(echo_component_path, 'r') as f:
                    echo_content = f.read()
                
                # Check for error handling features
                error_features = [
                    "voiceError", "retryCount", "synthesizeVoice", 
                    "errorMessage", "fallback", "try.*catch"
                ]
                
                error_handling_found = sum(1 for feature in error_features 
                                         if feature in echo_content)
                
                if error_handling_found >= 4:
                    self.log_test("Voice Error Handling", "PASS", 
                                f"Comprehensive error handling implemented")
                else:
                    self.log_test("Voice Error Handling", "WARN", 
                                f"Basic error handling: {error_handling_found}/6 features")
                
                # Check for user-friendly error messages
                user_friendly_messages = [
                    "taking a moment", "temporarily unavailable", 
                    "please try again", "connection", "retry"
                ]
                
                friendly_messages_found = sum(1 for msg in user_friendly_messages 
                                            if msg in echo_content.lower())
                
                if friendly_messages_found >= 3:
                    self.log_test("User-Friendly Messages", "PASS", 
                                "Compassionate error messaging implemented")
                else:
                    self.log_test("User-Friendly Messages", "WARN", 
                                f"Limited friendly messaging: {friendly_messages_found}/5")
                
                # Check for auto-retry mechanisms
                if "retryCount" in echo_content and "auto-retry" in echo_content.lower():
                    self.log_test("Auto-Retry System", "PASS", 
                                "Auto-retry mechanism implemented")
                else:
                    self.log_test("Auto-Retry System", "WARN", 
                                "Auto-retry not clearly implemented")
                    
            else:
                self.log_test("Echo Component", "FAIL", 
                            "AIEchoChat component not found", "CRITICAL")
                
        except Exception as e:
            self.log_test("Error Handling Analysis", "FAIL", 
                        f"Failed to analyze error handling: {e}")

    def test_accessibility_compliance(self):
        """Test Accessibility and WCAG Compliance"""
        print("\n=== Testing Accessibility Compliance ===")
        
        try:
            # Test both main interfaces
            pages_to_test = [
                ("/dashboard", "Dashboard"),
                ("/ai-echo", "AI Echo Chat")
            ]
            
            for page_url, page_name in pages_to_test:
                response = requests.get(f"{self.web_base_url}{page_url}", timeout=10)
                if response.status_code == 200:
                    html_content = response.text
                    
                    # Check for accessibility features
                    accessibility_features = {
                        "ARIA Labels": 'aria-label=',
                        "ARIA Roles": 'role=',
                        "Alt Text": 'alt=',
                        "Screen Reader Support": 'sr-only',
                        "Keyboard Navigation": 'tabindex',
                        "Focus Management": 'focus:',
                        "Semantic HTML": '<main',
                        "Skip Links": 'skip-'
                    }
                    
                    accessibility_score = 0
                    found_features = []
                    
                    for feature_name, search_term in accessibility_features.items():
                        if search_term in html_content:
                            accessibility_score += 1
                            found_features.append(feature_name)
                    
                    if accessibility_score >= 5:
                        self.log_test(f"Accessibility - {page_name}", "PASS", 
                                    f"Good accessibility: {accessibility_score}/8 features")
                    elif accessibility_score >= 3:
                        self.log_test(f"Accessibility - {page_name}", "WARN", 
                                    f"Basic accessibility: {accessibility_score}/8 features")
                    else:
                        self.log_test(f"Accessibility - {page_name}", "FAIL", 
                                    f"Poor accessibility: {accessibility_score}/8 features")
                        
                else:
                    self.log_test(f"Accessibility - {page_name}", "FAIL", 
                                f"Page not accessible: {response.status_code}")
                    
        except Exception as e:
            self.log_test("Accessibility Testing", "FAIL", 
                        f"Accessibility test failed: {e}")

    def test_performance_indicators(self):
        """Test Performance and Loading Indicators"""
        print("\n=== Testing Performance Indicators ===")
        
        try:
            # Test page load times
            pages_to_test = [
                ("/", "Landing Page"),
                ("/dashboard", "Dashboard"),
                ("/ai-echo", "AI Echo Chat")
            ]
            
            for page_url, page_name in pages_to_test:
                start_time = time.time()
                response = requests.get(f"{self.web_base_url}{page_url}", timeout=15)
                load_time = time.time() - start_time
                
                if response.status_code == 200:
                    if load_time < 3.0:
                        self.log_test(f"Page Load - {page_name}", "PASS", 
                                    f"Fast load time: {load_time:.2f}s")
                    elif load_time < 5.0:
                        self.log_test(f"Page Load - {page_name}", "WARN", 
                                    f"Acceptable load time: {load_time:.2f}s")
                    else:
                        self.log_test(f"Page Load - {page_name}", "FAIL", 
                                    f"Slow load time: {load_time:.2f}s")
                        
                    # Check for loading indicators
                    html_content = response.text
                    loading_indicators = [
                        "animate-spin", "animate-pulse", "animate-bounce",
                        "loading", "spinner", "Loading..."
                    ]
                    
                    indicators_found = sum(1 for indicator in loading_indicators 
                                         if indicator in html_content)
                    
                    if indicators_found >= 2:
                        self.log_test(f"Loading Indicators - {page_name}", "PASS", 
                                    f"Good loading feedback: {indicators_found} types")
                    else:
                        self.log_test(f"Loading Indicators - {page_name}", "WARN", 
                                    f"Limited loading feedback: {indicators_found} types")
                else:
                    self.log_test(f"Performance - {page_name}", "FAIL", 
                                f"Page not accessible: {response.status_code}")
                    
        except Exception as e:
            self.log_test("Performance Testing", "FAIL", 
                        f"Performance test failed: {e}")

    def generate_ui_report(self):
        """Generate UI/UX test report"""
        print("\n" + "="*60)
        print("UI/UX AND USER EXPERIENCE TEST REPORT")
        print("="*60)
        
        total_tests = len(self.test_results)
        passed = len([r for r in self.test_results if r["status"] == "PASS"])
        failed = len([r for r in self.test_results if r["status"] == "FAIL"])
        warnings = len([r for r in self.test_results if r["status"] == "WARN"])
        
        critical_failures = len([r for r in self.test_results 
                               if r["status"] == "FAIL" and r["severity"] == "CRITICAL"])
        
        print(f"\nSUMMARY:")
        print(f"  Total UI Tests: {total_tests}")
        print(f"  Passed: {passed}")
        print(f"  Failed: {failed}")
        print(f"  Warnings: {warnings}")
        print(f"  Critical UI Issues: {critical_failures}")
        
        success_rate = (passed / total_tests * 100) if total_tests > 0 else 0
        print(f"  UI Success Rate: {success_rate:.1f}%")
        
        # UI/UX assessment
        if critical_failures == 0 and failed <= 1:
            print(f"\n🟢 UI/UX ASSESSMENT: EXCELLENT USER EXPERIENCE")
            print("The interface is user-friendly and accessible.")
        elif critical_failures == 0 and failed <= 3:
            print(f"\n🟡 UI/UX ASSESSMENT: GOOD USER EXPERIENCE")
            print("The interface works well with some improvements needed.")
        else:
            print(f"\n🔴 UI/UX ASSESSMENT: USER EXPERIENCE NEEDS IMPROVEMENT")
            print("Several interface issues may impact user satisfaction.")
        
        # UI recommendations
        print(f"\nUI/UX RECOMMENDATIONS:")
        
        critical_ui_issues = [r for r in self.test_results 
                             if r["status"] == "FAIL" and r["severity"] == "CRITICAL"]
        if critical_ui_issues:
            print("🚨 CRITICAL UI ISSUES:")
            for issue in critical_ui_issues:
                print(f"   - {issue['test']}: {issue['details']}")
        
        ui_improvements = [r for r in self.test_results if r["status"] == "WARN"]
        if ui_improvements:
            print("💡 UI IMPROVEMENTS:")
            for improvement in ui_improvements[:5]:
                print(f"   - {improvement['test']}: {improvement['details']}")
        
        ui_strengths = [r for r in self.test_results if r["status"] == "PASS"]
        if ui_strengths:
            print("✨ UI STRENGTHS:")
            for strength in ui_strengths[:3]:
                print(f"   - {strength['test']}")
        
        return success_rate >= 75

def main():
    """Run UI workflow tests"""
    print("🎨 Starting UI/UX and User Experience Test")
    print("=" * 60)
    
    tester = UIWorkflowTester()
    
    try:
        # Run all UI test suites
        tester.test_voice_clone_interface_accessibility()
        tester.test_echo_chat_interface()
        tester.test_responsive_design()
        tester.test_voice_interface_workflow()
        tester.test_error_handling_ui()
        tester.test_accessibility_compliance()
        tester.test_performance_indicators()
        
        # Generate UI report
        ui_ready = tester.generate_ui_report()
        
        return ui_ready
        
    except Exception as e:
        print(f"\n\nUI test framework error: {e}")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)