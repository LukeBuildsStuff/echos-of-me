// Debug script to test voice workflow
// Using built-in fetch in Node.js 18+

async function testVoiceWorkflow() {
    console.log('🔍 Testing Voice Workflow...\n');
    
    // Test 1: Check ML service status
    console.log('1. Testing ML service status...');
    try {
        const statusResponse = await fetch('http://ml-inference:8000/voice/status');
        const statusData = await statusResponse.json();
        console.log('✅ ML service status:', JSON.stringify(statusData, null, 2));
    } catch (error) {
        console.log('❌ ML service status failed:', error.message);
        return;
    }
    
    // Test 2: Test voice profiles
    console.log('\n2. Testing voice profiles...');
    try {
        const profilesResponse = await fetch('http://ml-inference:8000/voice/profiles');
        const profilesData = await profilesResponse.json();
        console.log('✅ Voice profiles:', JSON.stringify(profilesData, null, 2));
    } catch (error) {
        console.log('❌ Voice profiles failed:', error.message);
        return;
    }
    
    // Test 3: Test voice synthesis
    console.log('\n3. Testing voice synthesis...');
    try {
        const synthesisResponse = await fetch('http://ml-inference:8000/voice/synthesize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: "This is a test from the debug workflow script.",
                voice_id: "voice_lukemoeller_yahoo_com_latest"
            })
        });
        
        const synthesisData = await synthesisResponse.json();
        console.log('✅ Voice synthesis result:', JSON.stringify(synthesisData, null, 2));
        
        // Test 4: Check if file exists
        const fs = require('fs');
        const audioPath = '/app/public' + synthesisData.audio_url;
        if (fs.existsSync(audioPath)) {
            const stats = fs.statSync(audioPath);
            console.log(`✅ Audio file created: ${audioPath} (${stats.size} bytes)`);
        } else {
            console.log(`❌ Audio file not found: ${audioPath}`);
        }
        
    } catch (error) {
        console.log('❌ Voice synthesis failed:', error.message);
    }
    
    console.log('\n🎯 Voice workflow test complete!');
}

testVoiceWorkflow().catch(console.error);