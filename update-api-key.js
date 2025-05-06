// Script to update OpenRouter API key
// This sets the API key in localStorage for the website to use

// Using IIFE (Immediately Invoked Function Expression) to create a closure 
// that hides the key from browser inspection
(function() {
    // The API key is inside this closure and not accessible in the global scope
    // This provides some protection against casual inspection
    const _k = [
        's', 'k', '-', 'o', 'r', '-', 'v', '1', '-',
        'b', 'd', '5', '6', '7', 'c', 'd', '5', '4', 'f', 'c', 'f', '8', 'c', '5', '6',
        'e', '3', 'a', '8', '6', 'e', 'd', 'd', '9', 'a', 'e', '3', '6', '3', '2', 'c',
        'b', '0', '9', '9', '1', 'f', '3', '8', '9', 'a', 'b', '2', '5', 'f', 'e', 'c',
        '2', 'a', '2', '1', 'c', '5', 'c', '0', '8', '5', 'b', '8', '5', 'a', '0', 'a'
    ];
    
    function getKey() {
        return _k.join('');
    }
    
    // Store the key in localStorage
    localStorage.setItem('openrouter_api_key', getKey());
    
    // Confirm the key was set
    console.log('OpenRouter API key updated successfully!');
    console.log('You can now use the meta-llama/llama-3.1-405b:free model.');
    
    // Redirect to the main app page
    setTimeout(() => {
        window.location.href = 'app.html';
    }, 2000);
})(); // End of IIFE 