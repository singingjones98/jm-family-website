// Initialize Supabase client
const { createClient } = supabase;
const supabaseClient = createClient('https://khsyzbxzdwvfhooeniyf.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtoc3l6Ynh6ZHd2Zmhvb2VuaXlmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk2MTg4NDksImV4cCI6MjA3NTE5NDg0OX0.H11VjNGhsMYna20WHNqHbn4GkDJu77VnNm5789hySTs');

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
            user_id: supabaseClient.auth.user()?.id,
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