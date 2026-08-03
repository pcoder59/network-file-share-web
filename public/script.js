const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const uploadBtn = document.getElementById('uploadBtn');
const filesList = document.getElementById('filesList');
const message = document.getElementById('message');
const progress = document.getElementById('progress');
const progressFill = document.getElementById('progressFill');

const filesPerPage = 5;
let currentPage = 1;
let allFiles = [];

// Show selected file name
fileInput.addEventListener('change', (e) => {
    fileName.textContent = '';
    const files = e.target.files;
    if (files) {
        if (files.length == 1) {
            fileName.textContent = `📄 Selected: ${files[0].name}`;
            fileName.style.display = 'block';
            uploadBtn.disabled = false;
        } else {
            fileName.textContent = `📄 Multiple Files Selected`;
            fileName.style.display = 'block';
            uploadBtn.disabled = false;
        }
    } else {
        fileName.style.display = 'none';
        uploadBtn.disabled = true;
    }
});

// Upload file
uploadBtn.addEventListener('click', async () => {
    const files = fileInput.files;
    if (!files) return;
    for (var i = 0; i < files.length; i++) {
        const file = fileInput.files[i];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        uploadBtn.disabled = true;
        progress.style.display = 'block';
        message.className = 'message';

        try {
            const xhr = new XMLHttpRequest();
            xhr.upload.addEventListener('progress', (e) => {
                const percent = (e.loaded / e.total) * 100;
                progressFill.style.width = percent + '%';
            });

            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    var message = file.name + 'File uploaded successfully! ✓';
                    showMessage(message, 'success');
                    fileInput.value = '';
                    fileName.style.display = 'none';
                    uploadBtn.disabled = true;
                    progressFill.style.width = '0%';
                    setTimeout(() => {
                        progress.style.display = 'none';
                        loadFiles();
                    }, 1000);
                }
            });

            xhr.addEventListener('error', () => {
                var message = file.name + 'Upload failed. Try again. ✗';
                showMessage(message, 'error');
                showMessage('✗ Upload failed. Try again.', 'error');
                uploadBtn.disabled = false;
                progress.style.display = 'none';
            });

            xhr.open('POST', '/upload');
            xhr.send(formData);
        } catch (err) {
            showMessage(file.name + ' ✗ Error: ' + err.message, 'error');
            if (i == files.length - 1) {
                showMessage('File Transfer Completed! ✓')
                uploadBtn.disabled = false;
            }
            progress.style.display = 'none';
        }
    }
});

// Load and display files
async function loadFiles(page = 1) {
    try {
        const response = await fetch('/files');
        const files = await response.json();
        allFiles = files;
        currentPage = page;

        // Calculate pagination
        const totalPages = Math.ceil(files.length / filesPerPage);
        const startIndex = (page - 1) * filesPerPage;
        const endIndex = startIndex + filesPerPage;
        const paginatedFiles = files.slice(startIndex, endIndex);

        // Display files
        filesList.innerHTML = '';
        if (files.length === 0) {
            filesList.innerHTML = '<li class="empty-message">No files uploaded yet</li>';
            document.getElementById('pagination').style.display = 'none';
        } else {
            paginatedFiles.forEach(file => {
                const li = document.createElement('li');
                li.className = 'file-item';
                li.innerHTML = `
                    <a href="/download/${file}" download>${file}</a>
                    <button class="delete-btn">Delete</button>
                `;
                filesList.appendChild(li);

                const deleteBtn = li.querySelector('.delete-btn');
                deleteBtn.addEventListener('click', async () => {
                    if (confirm(`Are you sure you want to delete "${file}"?`)) {
                        try {
                            const deleteResponse = await fetch(`/delete/${file}`, {
                                method: 'DELETE'
                            });
                            
                            if (deleteResponse.ok) {
                                showMessage(`✓ "${file}" deleted successfully!`, 'success');
                                loadFiles(1); // Reset to page 1
                            } else {
                                showMessage('✗ Delete failed. Try again.', 'error');
                            }
                        } catch (err) {
                            showMessage('✗ Error deleting file: ' + err.message, 'error');
                        }
                    }
                });
            });

            // Show pagination controls if more than one page
            const paginationDiv = document.getElementById('pagination');
            if (totalPages > 1) {
                paginationDiv.style.display = 'flex';
                document.getElementById('pageInfo').textContent = 
                    `Page ${page} of ${totalPages}`;
                
                // Update button states
                document.getElementById('prevBtn').disabled = page === 1;
                document.getElementById('nextBtn').disabled = page === totalPages;
            } else {
                paginationDiv.style.display = 'none';
            }
        }
    } catch (err) {
        console.error('Error loading files:', err);
    }
}

document.getElementById('prevBtn').addEventListener('click', () => {
    if (currentPage > 1) {
        loadFiles(currentPage - 1);
    }
});

document.getElementById('nextBtn').addEventListener('click', () => {
    const totalPages = Math.ceil(allFiles.length / filesPerPage);
    if (currentPage < totalPages) {
        loadFiles(currentPage + 1);
    }
});

function showMessage(text, type) {
    message.textContent = text;
    message.className = 'message ' + type;
    setTimeout(() => {
    message.className = 'message';
    }, 3000);
}

// Load files on page load
loadFiles();