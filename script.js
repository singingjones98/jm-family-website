// Initialize Supabase client
const supabaseUrl = 'https://khsyzbxzdwvfhooeniyf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtoc3l6Ynh6ZHd2Zmhvb2VuaXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MTg4NDksImV4cCI6MjA3NTE5NDg0OX0.H11VjNGhsMYna20WHNqHbn4GkDJu77VnNm5789hySTs';
const { createClient } = supabase;
const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Handle form submission
document.getElementById('upload-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById('file-input');
    const description = document.getElementById('description').value;
    const file = fileInput.files[0];

    if (!file || !description) {
        alert('Please select a file and add a description.');
        return;
    }

    // Upload file to Supabase storage
    const fileName = `${Date.now()}_${file.name}`;
    const { data, error } = await supabaseClient.storage
        .from('family-media')
        .upload(fileName, file);

    if (error) {
        alert('Upload failed: ' + error.message);
        return;
    }

    // Save entry to database
    const { error: dbError } = await supabaseClient
        .from('family_entries')
        .insert({
            user_id: supabaseClient.auth.getUser()?.data.user?.id,
            description,
            file_path: fileName
        });

    if (dbError) {
        alert('Failed to save entry: ' + dbError.message);
        return;
    }

    alert('Upload successful!');
    fileInput.value = '';
    document.getElementById('description').value = '';
});

// Handle login
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
        alert('Login failed: ' + error.message);
        return;
    }
    alert('Logged in!');
    window.location.reload(); // Refresh to show upload form
});

// Handle signup (basic, extend as needed)
document.getElementById('signup-link')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const email = prompt('Enter email for signup:');
    const password = prompt('Enter password:');
    if (email && password) {
        const { error } = await supabaseClient.auth.signUp({ email, password });
        if (error) {
            alert('Signup failed: ' + error.message);
        } else {
            alert('Signup successful! Check your email to confirm.');
        }
    }
});

// Handle logout
document.getElementById('logout-button')?.addEventListener('click', async () => {
    const { error } = await supabaseClient.auth.signOut();
    if (error) {
        alert('Logout failed: ' + error.message);
        return;
    }
    alert('Logged out!');
    window.location.reload();
});

// Check if user is logged in
supabaseClient.auth.onAuthStateChange((event, session) => {
    const logoutButton = document.getElementById('logout-button');
    if (session) {
        document.querySelector('.auth-section').style.display = 'none';
        document.querySelector('.upload-section').style.display = 'block';
        if (logoutButton) logoutButton.style.display = 'block';
    } else {
        document.querySelector('.auth-section').style.display = 'block';
        document.querySelector('.upload-section').style.display = 'none';
        if (logoutButton) logoutButton.style.display = 'none';
    }
});

// Load photos for gallery
async function loadPhotos() {
    const { data, error } = await supabaseClient
        .from('family_entries')
        .select('description, file_path');

    if (error) {
        console.error('Error loading photos:', error);
        return;
    }

    const gallery = document.getElementById('photo-gallery');
if (gallery) {
        gallery.innerHTML = '';
        data.forEach(item => {
            const img = document.createElement('img');
            img.src = supabaseClient.storage.from('family-media').getPublicUrl(item.file_path).data.publicUrl;
            img.alt = item.description;
            img.style.width = '100%';
            gallery.appendChild(img);
        });
    }
}

if (document.getElementById('photo-gallery')) {
    loadPhotos();
}