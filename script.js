const supabaseUrl = 'https://khsyzbxzdwvfhooeniyf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtoc3l6Ynh6ZHd2Zmhvb2VuaXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MTg4NDksImV4cCI6MjA3NTE5NDg0OX0.H11VjNGhsMYna20WHNqHbn4GkDJu77VnNm5789hySTs';
const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Function to compress images
async function compressImage(file, maxDimension = 800, quality = 0.8) {
    // Skip compression for non-image files (e.g., videos)
    if (!file.type.startsWith('image/')) {
        return file;
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        img.onload = () => {
            let width = img.width;
            let height = img.height;

            // Calculate new dimensions while preserving aspect ratio
            if (width > height) {
                if (width > maxDimension) {
                    height = Math.round((height * maxDimension) / width);
                    width = maxDimension;
                }
            } else {
                if (height > maxDimension) {
                    width = Math.round((width * maxDimension) / height);
                    height = maxDimension;
                }
            }

            // Set canvas dimensions
            canvas.width = width;
            canvas.height = height;

            // Draw and compress image
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Failed to compress image'));
                        return;
                    }
                    // Create a new File object with the compressed blob
                    const compressedFile = new File([blob], file.name, {
                        type: 'image/jpeg',
                        lastModified: Date.now()
                    });
                    resolve(compressedFile);
                },
                'image/jpeg',
                quality
            );
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
    });
}

// Handle confirmation link on page load
async function handleAuthRedirect() {
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    if (accessToken && refreshToken) {
        const { error } = await supabaseClient.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
        });
        if (error) {
            console.error('Error setting session:', error.message);
            alert('Failed to confirm email: ' + error.message);
        } else {
            alert('Email confirmed and logged in!');
            window.history.replaceState({}, document.title, window.location.pathname);
            window.location.reload();
        }
    }
}

handleAuthRedirect();

// Handle form submission
document.getElementById('upload-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Upload form submitted');
    const fileInput = document.getElementById('file-input');
    const description = document.getElementById('description').value;
    const file = fileInput.files[0];

    if (!file || !description) {
        console.log('Missing file or description');
        alert('Please select a file and add a description.');
        return;
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
        console.log('User not logged in:', userError?.message);
        alert('You must be logged in to upload.');
        return;
    }
    console.log('User ID:', user.id);

    // Compress image if it's an image file
    let uploadFile = file;
    try {
        console.log('Compressing file:', file.name);
        uploadFile = await compressImage(file, 800, 0.8);
        console.log('File compressed:', uploadFile.name, uploadFile.size);
    } catch (err) {
        console.error('Compression error:', err.message);
        alert('Failed to compress image: ' + err.message);
        return;
    }

    // Upload file to Supabase storage
    const fileName = `${Date.now()}_${uploadFile.name}`;
    console.log('Uploading file to family-media:', fileName);
    const { data, error } = await supabaseClient.storage
        .from('family-media')
        .upload(fileName, uploadFile);

    if (error) {
        console.log('Storage upload error:', error.message);
        alert('Upload failed: ' + error.message);
        return;
    }
    console.log('File uploaded:', data.path);

    // Save entry to database
    console.log('Saving to family_entries:', { user_id: user.id, description, file_path: fileName });
    try {
        const { error: dbError } = await supabaseClient
            .from('family_entries')
            .insert({
                user_id: user.id,
                description,
                file_path: fileName
            });

        if (dbError) {
            console.log('Database insert error:', dbError.message);
            alert('Failed to save entry: ' + dbError.message);
            return;
        }
    } catch (err) {
        console.log('Unexpected error during insert:', err.message);
        alert('Unexpected error during upload: ' + err.message);
        return;
    }

    console.log('Upload successful');
    alert('Upload successful!');
    fileInput.value = '';
    document.getElementById('description').value = '';
});

// Handle login
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Login form submitted');
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
        console.log('Login error:', error.message);
        alert('Login failed: ' + error.message);
        return;
    }

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) {
        console.log('Session active:', session.user.id);
        document.querySelector('.auth-section').style.display = 'none';
        document.querySelector('.upload-section').style.display = 'block';
        document.getElementById('logout-button').style.display = 'block';
        alert('Logged in!');
    } else {
        console.log('No session after login');
        alert('Session not found after login. Please try again.');
    }
});

// Handle signup
document.getElementById('signup-link')?.addEventListener('click', async (e) => {
    e.preventDefault();
    console.log('Signup link clicked');
    const email = prompt('Enter email for signup:');
    const password = prompt('Enter password:');
    if (email && password) {
        const { error } = await supabaseClient.auth.signUp({ email, password });
        if (error) {
            console.log('Signup error:', error.message);
            alert('Signup failed: ' + error.message);
        } else {
            console.log('Signup successful, email sent');
            alert('Signup successful! Check your email to confirm.');
        }
    }
});

// Handle logout
document.getElementById('logout-button')?.addEventListener('click', async () => {
    console.log('Logout button clicked');
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        console.log('Logout error:', error.message);
        alert('Logout failed: ' + error.message);
        return;
    }
    alert('Logged out!');
    window.location.reload();
});

// Check if user is logged in
supabaseClient.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session);
    const logoutButton = document.getElementById('logout-button');
    
    // Only run auth-related UI updates on index.html
    if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
        const authSection = document.querySelector('.auth-section');
        const uploadSection = document.querySelector('.upload-section');
        
        if (session) {
            if (authSection) authSection.style.display = 'none';
            if (uploadSection) uploadSection.style.display = 'block';
            if (logoutButton) logoutButton.style.display = 'block';
        } else {
            if (authSection) authSection.style.display = 'block';
            if (uploadSection) uploadSection.style.display = 'none';
            if (logoutButton) logoutButton.style.display = 'none';
        }
    }
});

// Load photos for gallery
async function loadPhotos() {
    if (!window.location.pathname.includes('photos.html')) {
        console.log('Skipping loadPhotos: Not on photos.html');
        return;
    }

    const gallery = document.getElementById('photo-gallery');
    if (!gallery) {
        console.log('No photo-gallery element found');
        return;
    }

    console.log('Loading photos from family_entries');
    const { data, error } = await supabaseClient
        .from('family_entries')
        .select('description, file_path');

    if (error) {
        console.error('Error loading photos:', error);
        alert('Failed to load photos: ' + error.message);
        return;
    }
    console.log('Photos loaded:', data);

    gallery.innerHTML = '';
    if (data.length === 0) {
        console.log('No photos found in family_entries');
        gallery.innerHTML = '<p>No photos available.</p>';
    } else {
        for (const item of data) {
            console.log('Adding media to gallery:', item.file_path);
            const fileExtension = item.file_path.split('.').pop().toLowerCase();
            const isVideo = ['mp4', 'mov', 'webm'].includes(fileExtension);
            const { data: signedData, error: signedError } = await supabaseClient.storage
                .from('family-media')
                .createSignedUrl(item.file_path, 60);
            if (signedError) {
                console.error('Error generating signed URL:', signedError.message);
                continue;
            }
            const mediaElement = isVideo ? document.createElement('video') : document.createElement('img');
            mediaElement.src = signedData.signedUrl;
            mediaElement.alt = item.description;
            mediaElement.style.width = '100%';
            if (isVideo) {
                mediaElement.controls = true;
                mediaElement.style.height = '200px';
                mediaElement.style.objectFit = 'cover';
            }
            mediaElement.onerror = () => {
                console.error(`Failed to load media: ${mediaElement.src}`);
            };
            gallery.appendChild(mediaElement);
        }
    }
}

// Only call loadPhotos on photos.html after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('photos.html') && document.getElementById('photo-gallery')) {
        console.log('Initializing loadPhotos on photos.html');
        loadPhotos();
    }
});