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
let selectedFiles = new Set();

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
            document.getElementById('deleteSelectedContainer').style.display = 'none';
        } else {
            // Add select all checkbox header
            const headerLi = document.createElement('li');
            headerLi.className = 'file-header';
            headerLi.innerHTML = `
                <div class="select-wrapper">
                    <input type="checkbox" id="selectAllCheckbox" class="select-all-checkbox">
                    <label for="selectAllCheckbox">Select All</label>
                </div>
            `;
            filesList.appendChild(headerLi);

            // Add individual file items
            paginatedFiles.forEach(file => {
                const li = document.createElement('li');
                li.className = 'file-item';
                li.innerHTML = `
                    <div class="file-checkbox-wrapper">
                        <input type="checkbox" class="file-checkbox" data-filename="${file}" 
                            ${selectedFiles.has(file) ? 'checked' : ''}>
                    </div>
                    <div class="file-item-content">
                        <a href="/download/${file}" download>${file}</a>
                    </div>
                    <button class="delete-btn" data-filename="${file}">Delete</button>
                `;
                filesList.appendChild(li);

                const checkbox = li.querySelector('.file-checkbox');
                const deleteBtn = li.querySelector('.delete-btn');

                // Individual file checkbox
                checkbox.addEventListener('change', () => {
                    if (checkbox.checked) {
                        selectedFiles.add(file);
                    } else {
                        selectedFiles.delete(file);
                    }
                    updateDeleteButton();
                });

                // Individual delete button
                deleteBtn.addEventListener('click', async () => {
                    if (confirm(`Are you sure you want to delete "${file}"?`)) {
                        await deleteFile(file);
                    }
                });
            });

            // Handle select all checkbox
            const selectAllCheckbox = document.getElementById('selectAllCheckbox');
            selectAllCheckbox.addEventListener('change', () => {
                const checkboxes = document.querySelectorAll('.file-checkbox');
                if (selectAllCheckbox.checked) {
                    checkboxes.forEach(cb => {
                        cb.checked = true;
                        selectedFiles.add(cb.dataset.filename);
                    });
                } else {
                    checkboxes.forEach(cb => {
                        cb.checked = false;
                        selectedFiles.delete(cb.dataset.filename);
                    });
                }
                updateDeleteButton();
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
        updateDeleteButton();
    } catch (err) {
        console.error('Error loading files:', err);
    }
}

// Update delete button visibility and state
function updateDeleteButton() {
    const downloadSelectedBtn = document.getElementById('downloadSelectedBtn');
    const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
    const selectedActionsContainer = document.getElementById('selectedActionsContainer');
    
    if (selectedFiles.size > 0) {
        selectedActionsContainer.style.display = 'flex';
        downloadSelectedBtn.textContent = `⬇️ Download Selected (${selectedFiles.size})`;
        deleteSelectedBtn.textContent = `🗑️ Delete Selected (${selectedFiles.size})`;
    } else {
        selectedActionsContainer.style.display = 'none';
    }
}

// Delete single file
async function deleteFile(filename) {
    try {
        const deleteResponse = await fetch(`/delete/${filename}`, {
            method: 'DELETE'
        });
        
        if (deleteResponse.ok) {
            showMessage(`✓ "${filename}" deleted successfully!`, 'success');
            selectedFiles.delete(filename);
            loadFiles(1);
        } else {
            showMessage('✗ Delete failed. Try again.', 'error');
        }
    } catch (err) {
        showMessage('✗ Error deleting file: ' + err.message, 'error');
    }
}

// Delete multiple selected files
async function deleteSelectedFiles() {
    if (selectedFiles.size === 0) return;

    const count = selectedFiles.size;
    if (!confirm(`Are you sure you want to delete ${count} file(s)?`)) return;

    try {
        const filesToDelete = Array.from(selectedFiles);
        let deletedCount = 0;
        let failedCount = 0;

        for (const filename of filesToDelete) {
            try {
                const deleteResponse = await fetch(`/delete/${filename}`, {
                    method: 'DELETE'
                });
                
                if (deleteResponse.ok) {
                    deletedCount++;
                } else {
                    failedCount++;
                }
            } catch (err) {
                failedCount++;
            }
        }

        if (failedCount === 0) {
            showMessage(`✓ Successfully deleted ${deletedCount} file(s)!`, 'success');
        } else {
            showMessage(`✓ Deleted ${deletedCount}, but ${failedCount} failed.`, 'error');
        }

        selectedFiles.clear();
        loadFiles(1);
    } catch (err) {
        showMessage('✗ Error deleting files: ' + err.message, 'error');
    }
}

// Download multiple selected files
async function downloadSelectedFiles() {
    if (selectedFiles.size === 0) return;

    const filesToDownload = Array.from(selectedFiles);
    
    // Download files one by one
    filesToDownload.forEach((filename, index) => {
        setTimeout(() => {
            const link = document.createElement('a');
            link.href = `/download/${filename}`;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }, index * 500); // Stagger downloads by 500ms to avoid browser blocking
    });

    showMessage(`✓ Downloading ${filesToDownload.length} file(s)...`, 'success');
}

async function clearSelectedFiles() {
    selectedFiles.clear();
    loadFiles(currentPage);
}


// Event listeners for pagination
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

// Event listener for download selected button
document.getElementById('downloadSelectedBtn').addEventListener('click', downloadSelectedFiles);
// Event listener for delete selected button
document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelectedFiles);

document.getElementById('clearSelectionBtn').addEventListener('click', clearSelectedFiles);

function showMessage(text, type) {
    message.textContent = text;
    message.className = 'message ' + type;
    setTimeout(() => {
        message.className = 'message';
    }, 3000);
}

// Load files on page load
loadFiles();
