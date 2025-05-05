// Test script for OpenRouter API with Claude 3.7 Sonnet integration
const OPENROUTER_API_KEY = localStorage.getItem('openrouter_api_key') || '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';

// Simple test function to check API connectivity
async function testClaudeAPI() {
    console.log('Testing Claude 3.7 Sonnet API connection...');
    
    try {
        console.log('Making API request to OpenRouter...');
        const requestBody = {
            "model": "anthropic/claude-3.7-sonnet",
            "messages": [
                {
                    "role": "user",
                    "content": "List 3 mental health self-care tips in a concise format."
                }
            ],
            "max_tokens": 500  // Limit token usage to stay within available credits
        };
        
        console.log('Request body:', JSON.stringify(requestBody, null, 2));
        console.log('Using API key:', OPENROUTER_API_KEY.substring(0, 10) + '...');
        
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                "HTTP-Referer": "https://mindmuseai.app",
                "X-Title": "MindMuseAI",
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody)
        });
        
        console.log('Response status:', response.status);
        
        // Even if not OK, try to get response body for better error details
        const responseText = await response.text();
        console.log('Response text:', responseText);
        
        if (!response.ok) {
            try {
                const errorData = JSON.parse(responseText);
                console.error('Detailed API error:', errorData);
                throw new Error(`API request failed with status ${response.status}: ${errorData.error?.message || responseText}`);
            } catch (parseError) {
                throw new Error(`API request failed with status ${response.status}: ${responseText}`);
            }
        }
        
        // Parse the JSON response
        const data = JSON.parse(responseText);
        console.log('API Response:', data);
        console.log('Bot Reply:', data.choices[0].message.content);
        console.log('Test completed successfully!');
        return data;
    } catch (error) {
        console.error('Error testing Claude API:', error);
        return null;
    }
}

// Run the test if executed directly
if (typeof window !== 'undefined' && window.location.pathname.includes('test-claude')) {
    document.addEventListener('DOMContentLoaded', function() {
        const testButton = document.getElementById('test-api');
        const resultDisplay = document.getElementById('api-result');
        
        if (testButton) {
            testButton.addEventListener('click', async function() {
                if (resultDisplay) {
                    resultDisplay.innerHTML = `
                        <div style="text-align: center; margin-bottom: 1rem;">
                            <p>Testing API connection...</p>
                            <p style="font-size: 0.9rem; opacity: 0.7;">Check the browser console (F12) for detailed logs</p>
                        </div>
                    `;
                }
                
                const result = await testClaudeAPI();
                
                if (result && resultDisplay) {
                    resultDisplay.innerHTML = `
                        <h3>API Test Successful!</h3>
                        <pre>${JSON.stringify(result, null, 2)}</pre>
                        <div class="bot-response">
                            <h4>Claude's Response:</h4>
                            <p>${result.choices[0].message.content}</p>
                        </div>
                    `;
                } else if (resultDisplay) {
                    resultDisplay.innerHTML = `
                        <h3>API Test Failed</h3>
                        <p>Please check console for error details.</p>
                        <div style="margin-top: 1rem; font-size: 0.9rem;">
                            <p>Common issues:</p>
                            <ul style="margin-top: 0.5rem; margin-left: 1.5rem;">
                                <li>Incorrect model name - try "anthropic/claude-3.7-sonnet" or check OpenRouter docs for current model IDs</li>
                                <li>API key issues - verify the key is correct and has sufficient credits</li>
                                <li>Network issues - check your internet connection</li>
                                <li>CORS issues - may occur when testing locally</li>
                            </ul>
                        </div>
                    `;
                }
            });
        }
    });
}

// Export the function for use in other scripts
if (typeof module !== 'undefined') {
    module.exports = { testClaudeAPI };
} 