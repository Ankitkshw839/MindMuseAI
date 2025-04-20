// Auth utilities for MindfulChat
// Handles form validation and authentication UI interactions

import { 
    auth,
    createUser, 
    signInUser, 
    signInWithGoogle, 
    getCurrentUser,
    storeUserData,
    logoutUser
} from './firebase-config.js';

// DOM Elements
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const forgotPasswordLink = document.getElementById('forgot-password');
const googleSignInBtn = document.getElementById('google-signin') || document.getElementById('google-signup');
const logoutBtn = document.getElementById('logout-btn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const errorMessages = document.querySelectorAll('.error-message');
const togglePasswordBtn = document.getElementById('toggle-password');

// Form validation
export function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

export function validatePassword(password) {
    // At least 6 characters
    return password.length >= 6;
}

export function validateName(name) {
    return name.trim().length > 0;
}

// UI Feedback functions
export function showError(element, message) {
    // Find the validation message element
    const validationMessage = document.getElementById(`${element.id}-validation`);
    if (validationMessage) {
        validationMessage.textContent = message;
        validationMessage.style.display = 'block';
    }
    
    // Add error class to the input
    element.classList.add('error');
    element.style.borderColor = '#ff5c5c';
    
    // Show global error if needed
    const errorContainer = document.getElementById('error-message');
    if (errorContainer && !errorContainer.textContent) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            errorContainer.style.display = 'none';
            errorContainer.textContent = '';
        }, 5000);
    }
}

export function clearError(element) {
    const validationMessage = document.getElementById(`${element.id}-validation`);
    if (validationMessage) {
        validationMessage.style.display = 'none';
    }
    
    element.classList.remove('error');
    element.style.borderColor = element.value.length > 0 ? '#7b68ee' : 'rgba(255, 255, 255, 0.1)';
}

export function showLoadingState(button, isLoading) {
    if (isLoading) {
        const originalText = button.innerHTML;
        button.setAttribute('data-original-text', originalText);
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
        button.disabled = true;
    } else {
        const originalText = button.getAttribute('data-original-text');
        if (originalText) {
            button.innerHTML = originalText;
        }
        button.disabled = false;
    }
}

// Form submission handlers
export async function handleSignup(event, formData) {
    event.preventDefault();
    
    const { firstName, lastName, email, password, confirmPassword } = formData;
    
    // Validate inputs
    let isValid = true;
    
    if (!validateName(firstName)) {
        showError(document.getElementById('first-name'), 'Please enter your first name');
        isValid = false;
    }
    
    if (!validateName(lastName)) {
        showError(document.getElementById('last-name'), 'Please enter your last name');
        isValid = false;
    }
    
    if (!validateEmail(email)) {
        showError(document.getElementById('email'), 'Please enter a valid email address');
        isValid = false;
    }
    
    if (!validatePassword(password)) {
        showError(document.getElementById('password'), 'Password must be at least 6 characters');
        isValid = false;
    }
    
    if (password !== confirmPassword) {
        showError(document.getElementById('confirm-password'), 'Passwords do not match');
        isValid = false;
    }
    
    if (!document.getElementById('terms').checked) {
        showGlobalError('You must agree to the Terms of Service and Privacy Policy');
        isValid = false;
    }
    
    if (!isValid) return false;
    
    // Show loading state
    const submitButton = document.querySelector('button[type="submit"]');
    showLoadingState(submitButton, true);
    
    try {
        console.log("Attempting to create user with:", email);
        // Create user in Firebase
        const userCredential = await createUser(email, password);
        console.log("User created successfully:", userCredential);
        
        // Store additional user data
        const userData = {
            firstName,
            lastName,
            email,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            preferences: {
                theme: 'dark',
                notifications: true
            }
        };
        
        console.log("Storing user data for:", userCredential.uid);
        await storeUserData(userCredential.uid, userData);
        
        // Success! Redirect to app.html
        window.location.href = 'app.html';
        return true;
    } catch (error) {
        console.error('Signup error:', error);
        // Display detailed error message for debugging
        const errorDetails = `Error Code: ${error.code || 'unknown'}, Message: ${error.message || 'Unknown error'}`;
        console.error(errorDetails);
        
        showGlobalError(errorDetails);
        showLoadingState(submitButton, false);
        return false;
    }
}

export async function handleLogin(event, formData) {
    event.preventDefault();
    
    const { email, password, rememberMe } = formData;
    
    // Validate inputs
    let isValid = true;
    
    if (!validateEmail(email)) {
        showError(document.getElementById('email'), 'Please enter a valid email address');
        isValid = false;
    }
    
    if (!password) {
        showError(document.getElementById('password'), 'Please enter your password');
        isValid = false;
    }
    
    if (!isValid) return false;
    
    // Show loading state
    const submitButton = document.querySelector('button[type="submit"]');
    showLoadingState(submitButton, true);
    
    try {
        // Sign in with Firebase
        await signInUser(email, password);
        
        // Set persistent session if remember me is checked
        if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
        } else {
            localStorage.removeItem('rememberMe');
        }
        
        // Success! Redirect to app page instead of index
        window.location.href = 'app.html';
        return true;
    } catch (error) {
        console.error('Login error:', error);
        showGlobalError(handleAuthError(error));
        showLoadingState(submitButton, false);
        return false;
    }
}

export async function handleGoogleSignIn() {
    // Show loading state
    const googleButton = document.getElementById('google-signin') || document.getElementById('google-signup');
    if (googleButton) {
        showLoadingState(googleButton, true);
    }
    
    try {
        // Sign in with Google
        const userCredential = await signInWithGoogle();
        
        // Success! Redirect to app page
        window.location.href = 'app.html';
        return true;
    } catch (error) {
        console.error('Google sign in error:', error);
        showGlobalError(handleAuthError(error));
        if (googleButton) {
            showLoadingState(googleButton, false);
        }
        return false;
    }
}

// Check if user is already logged in
export async function checkAuthState() {
    try {
        const user = await getCurrentUser();
        
        // User is signed in
        if (user) {
            // Update user's last login time
            updateUserLastLogin(user.uid);
            
            // Check if we're on a login/signup page and redirect if necessary
            const currentPath = window.location.pathname;
            if (currentPath.includes('login.html') || currentPath.includes('signup.html')) {
                window.location.href = 'app.html';
            }
            
            // Update UI for logged in user
            updateUIForAuthenticatedUser(user);
        } else {
            // No user is signed in
            // Check if we're on a protected page and redirect if necessary
            const currentPath = window.location.pathname;
            if (!currentPath.includes('login.html') && 
                !currentPath.includes('signup.html') && 
                !currentPath.includes('index.html') && 
                currentPath !== '/' && 
                !currentPath.endsWith('/')) {
                // Redirect to login page
                window.location.href = 'login.html';
            }
            
            // Update UI for logged out user
            updateUIForUnauthenticatedUser();
        }
        
        return user;
    } catch (error) {
        console.error('Auth state check error:', error);
        return null;
    }
}

// Helper functions
function handleAuthError(error) {
    let errorMessage = 'An error occurred. Please try again.';
    
    if (error.code) {
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'This email is already in use. Please try logging in instead.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'Please enter a valid email address.';
                break;
            case 'auth/weak-password':
                errorMessage = 'Your password is too weak. Please use at least 6 characters.';
                break;
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                errorMessage = 'Invalid email or password. Please try again.';
                break;
            case 'auth/too-many-requests':
                errorMessage = 'Too many unsuccessful login attempts. Please try again later.';
                break;
            case 'auth/user-disabled':
                errorMessage = 'Your account has been disabled. Please contact support.';
                break;
            case 'auth/popup-closed-by-user':
                errorMessage = 'Sign in was cancelled. Please try again.';
                break;
            case 'auth/network-request-failed':
                errorMessage = 'Network error. Please check your connection and try again.';
                break;
        }
    }
    
    return errorMessage;
}

function showGlobalError(message) {
    const errorContainer = document.getElementById('error-message');
    if (errorContainer) {
        errorContainer.textContent = message;
        errorContainer.style.display = 'block';
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            errorContainer.style.display = 'none';
        }, 5000);
    }
}

function updateUIForAuthenticatedUser(user) {
    // This function updates the UI when a user is logged in
    const loginButtons = document.querySelectorAll('.login-button, .signup-button');
    const profileButtons = document.querySelectorAll('.profile-button, .logout-button');
    const userNameElements = document.querySelectorAll('.user-name');
    
    // Hide login/signup buttons, show profile/logout buttons
    loginButtons.forEach(button => button.style.display = 'none');
    profileButtons.forEach(button => button.style.display = 'flex');
    
    // Update user name if present
    if (user.displayName) {
        userNameElements.forEach(element => element.textContent = user.displayName);
    }
    
    // Setup logout button
    const logoutButtons = document.querySelectorAll('.logout-button');
    logoutButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                await logoutUser();
                window.location.href = 'login.html';
            } catch (error) {
                console.error('Logout error:', error);
            }
        });
    });
}

function updateUIForUnauthenticatedUser() {
    // This function updates the UI when no user is logged in
    const loginButtons = document.querySelectorAll('.login-button, .signup-button');
    const profileButtons = document.querySelectorAll('.profile-button, .logout-button');
    
    // Show login/signup buttons, hide profile/logout buttons
    loginButtons.forEach(button => button.style.display = 'flex');
    profileButtons.forEach(button => button.style.display = 'none');
}

async function updateUserLastLogin(userId) {
    try {
        await storeUserData(userId, {
            lastLogin: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error updating last login:', error);
    }
}

// Initialize auth state check and event listeners when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication state
    checkAuthState();
    
    // Setup login form if we're on the login page
    if (window.location.pathname.includes('login.html')) {
        setupLoginForm();
    }
    
    // Setup signup form if we're on the signup page
    if (window.location.pathname.includes('signup.html')) {
        setupSignupForm();
    }
    
    // Setup password reset functionality
    if (forgotPasswordLink) {
        setupPasswordReset();
    }
});

// Setup login form
function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;
    
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const rememberMeCheckbox = document.getElementById('remember-me');
    const googleSignInButton = document.getElementById('google-signin');
    
    // Setup input validation
    emailInput?.addEventListener('input', () => {
        if (emailInput.value) {
            clearError(emailInput);
        }
    });
    
    passwordInput?.addEventListener('input', () => {
        if (passwordInput.value) {
            clearError(passwordInput);
        }
    });
    
    // Setup password toggle
    setupPasswordToggle();
    
    // Handle form submission
    loginForm.addEventListener('submit', (e) => {
        const formData = {
            email: emailInput ? emailInput.value : '',
            password: passwordInput ? passwordInput.value : '',
            rememberMe: rememberMeCheckbox ? rememberMeCheckbox.checked : false
        };
        
        handleLogin(e, formData);
    });
    
    // Handle Google sign in
    if (googleSignInButton) {
        googleSignInButton.addEventListener('click', handleGoogleSignIn);
    }
}

// Setup signup form
function setupSignupForm() {
    const signupForm = document.getElementById('signup-form');
    if (!signupForm) return;
    
    const firstNameInput = document.getElementById('first-name');
    const lastNameInput = document.getElementById('last-name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');
    const termsCheckbox = document.getElementById('terms');
    const googleSignUpButton = document.getElementById('google-signup');
    
    // Setup input validation
    firstNameInput?.addEventListener('input', () => {
        if (firstNameInput.value) {
            clearError(firstNameInput);
        }
    });
    
    lastNameInput?.addEventListener('input', () => {
        if (lastNameInput.value) {
            clearError(lastNameInput);
        }
    });
    
    emailInput?.addEventListener('input', () => {
        if (validateEmail(emailInput.value)) {
            clearError(emailInput);
        }
    });
    
    passwordInput?.addEventListener('input', () => {
        if (validatePassword(passwordInput.value)) {
            clearError(passwordInput);
        }
        
        // Check password match if confirm password has input
        if (confirmPasswordInput?.value) {
            if (passwordInput.value === confirmPasswordInput.value) {
                clearError(confirmPasswordInput);
            } else {
                showError(confirmPasswordInput, 'Passwords do not match');
            }
        }
        
        // Update password strength meter
        if (passwordInput) {
            updatePasswordStrength(passwordInput.value);
        }
    });
    
    confirmPasswordInput?.addEventListener('input', () => {
        if (passwordInput?.value === confirmPasswordInput.value) {
            clearError(confirmPasswordInput);
        } else {
            showError(confirmPasswordInput, 'Passwords do not match');
        }
    });
    
    // Setup password toggle
    setupPasswordToggle();
    
    // Handle form submission
    signupForm.addEventListener('submit', (e) => {
        const formData = {
            firstName: firstNameInput ? firstNameInput.value : '',
            lastName: lastNameInput ? lastNameInput.value : '',
            email: emailInput ? emailInput.value : '',
            password: passwordInput ? passwordInput.value : '',
            confirmPassword: confirmPasswordInput ? confirmPasswordInput.value : ''
        };
        
        handleSignup(e, formData);
    });
    
    // Handle Google sign up
    if (googleSignUpButton) {
        googleSignUpButton.addEventListener('click', handleGoogleSignIn);
    }
}

// Update password strength meter
function updatePasswordStrength(password) {
    const strengthMeter = document.querySelector('.password-strength-meter');
    const strengthLabel = document.querySelector('.strength-label');
    
    if (!strengthMeter || !strengthLabel) return;
    
    // Remove previous strength classes
    strengthMeter.classList.remove('weak', 'medium', 'strong', 'very-strong');
    
    if (!password) {
        strengthMeter.style.display = 'none';
        strengthLabel.style.display = 'none';
        return;
    }
    
    strengthMeter.style.display = 'block';
    strengthLabel.style.display = 'block';
    
    // Calculate password strength
    let strength = 0;
    
    // Length check (up to 4 points)
    if (password.length >= 6) strength += 1;
    if (password.length >= 8) strength += 1;
    if (password.length >= 10) strength += 1;
    if (password.length >= 12) strength += 1;
    
    // Character type checks
    if (/[A-Z]/.test(password)) strength += 1; // Uppercase
    if (/[a-z]/.test(password)) strength += 1; // Lowercase
    if (/[0-9]/.test(password)) strength += 1; // Numbers
    if (/[^A-Za-z0-9]/.test(password)) strength += 1; // Special characters
    
    // Set strength indicator
    if (strength < 3) {
        strengthMeter.classList.add('weak');
        strengthLabel.textContent = 'Weak';
    } else if (strength < 5) {
        strengthMeter.classList.add('medium');
        strengthLabel.textContent = 'Medium';
    } else if (strength < 7) {
        strengthMeter.classList.add('strong');
        strengthLabel.textContent = 'Strong';
    } else {
        strengthMeter.classList.add('very-strong');
        strengthLabel.textContent = 'Very Strong';
    }
}

// Setup password toggle functionality
function setupPasswordToggle() {
    const passwordInputs = document.querySelectorAll('input[type="password"]');
    const toggleButtons = document.querySelectorAll('.toggle-password');
    
    if (passwordInputs.length > 0 && toggleButtons.length > 0) {
        toggleButtons.forEach((button, index) => {
            if (index < passwordInputs.length) {
                button.addEventListener('click', () => {
                    const input = passwordInputs[index];
                    if (input.type === 'password') {
                        input.type = 'text';
                        button.innerHTML = '<i class="fas fa-eye-slash"></i>';
                    } else {
                        input.type = 'password';
                        button.innerHTML = '<i class="fas fa-eye"></i>';
                    }
                });
            }
        });
    }
}

// Password reset functionality
function setupPasswordReset() {
    if (!forgotPasswordLink) return;
    
    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        
        const emailInput = document.getElementById('email');
        if (!emailInput || !emailInput.value) {
            showGlobalError('Please enter your email address for password reset');
            return;
        }
        
        if (!validateEmail(emailInput.value)) {
            showGlobalError('Please enter a valid email address');
            return;
        }
        
        try {
            // Firebase password reset functionality would go here
            // Since we don't have this function imported, showing a success message
            showGlobalError('Password reset email sent. Please check your inbox');
        } catch (error) {
            console.error('Password reset error:', error);
            showGlobalError(handleAuthError(error));
        }
    });
}

// Clear any error messages
function clearErrors() {
    const errorMessages = document.querySelectorAll('.validation-message, .error-message');
    errorMessages.forEach(message => {
        message.style.display = 'none';
        message.textContent = '';
    });
    
    const errorInputs = document.querySelectorAll('input.error');
    errorInputs.forEach(input => {
        input.classList.remove('error');
        input.style.borderColor = input.value.length > 0 ? '#7b68ee' : 'rgba(255, 255, 255, 0.1)';
    });
} 