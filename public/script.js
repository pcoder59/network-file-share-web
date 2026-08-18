const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');
const uploadBtn = document.getElementById('uploadBtn');
const filesList = document.getElementById('filesList');
const message = document.getElementById('message');
const progress = document.getElementById('progress');
const progressFill = document.getElementById('progressFill');
const searchInput = document.getElementById('searchInput');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const searchResults = document.getElementById('searchResults');

const filesPerPage = 5;
let currentPage = 1;
let allFiles = [];
let filteredFiles = [];
let selectedFiles = new Set();
let isSearchActive = false;
let searchQuery = '';

function showLoader() {
  document.getElementById('filesLoader').style.display = 'flex';
  document.getElementById('filesList').style.display = 'none';
}

// Hide loader when done
function hideLoader() {
  document.getElementById('filesLoader').style.display = 'none';
  document.getElementById('filesList').style.display = 'block';
}

// Format bytes to human-readable format
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Show selected file name
fileInput.addEventListener('change', (e) => {
    fileName.textContent = '';
    const files = e.target.files;
    if (files) {
        if (files.length == 1) {
            const size = formatFileSize(files[0].size);
            fileName.textContent = `📄 ${files[0].name} (${size})`;
            fileName.style.display = 'block';
            uploadBtn.disabled = false;
        } else {
            let totalSize = 0;
            for (let i = 0; i < files.length; i++) {
                totalSize += files[i].size;
            }
            fileName.textContent = `📄 ${files.length} Files Selected (${formatFileSize(totalSize)})`;
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

    const filesToCheck = Array.from(fileInput.files);
    const existingFileNames = allFiles.map(f => f.name);
    const duplicates = filesToCheck.filter(file => existingFileNames.includes(file.name));

    if (duplicates.length > 0) {
        alert(`These files already exist:\n${duplicates.map(f => f.name).join('\n')}\n\nPlease rename or delete them first.`);
        return;
    }

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
                    const fileSize = formatFileSize(file.size);
                    var message = `✓ ${file.name} (${fileSize}) uploaded successfully!`;
                    showMessage(message, 'success');
                    fileInput.value = '';
                    fileName.style.display = 'none';
                    uploadBtn.disabled = true;
                    progressFill.style.width = '0%';
                    setTimeout(() => {
                        progress.style.display = 'none';
                        clearSearch();
                        loadFiles();
                    }, 1000);
                }
            });

            xhr.addEventListener('error', () => {
                var message = `✗ ${file.name} upload failed. Try again.`;
                showMessage(message, 'error');
                uploadBtn.disabled = false;
                progress.style.display = 'none';
            });

            xhr.open('POST', '/upload');
            xhr.send(formData);
        } catch (err) {
            showMessage(`${file.name} ✗ Error: ${err.message}`, 'error');
            if (i == files.length - 1) {
                showMessage('File Transfer Completed! ✓')
                uploadBtn.disabled = false;
            }
            progress.style.display = 'none';
        }
    }
});

// Search files
function searchFiles(query) {
    searchQuery = query.toLowerCase().trim();
    
    if (searchQuery === '') {
        isSearchActive = false;
        filteredFiles = [];
        clearSearchBtn.style.display = 'none';
        searchResults.textContent = '';
        loadFiles(1);
        return;
    }

    isSearchActive = true;
    filteredFiles = allFiles.filter(file => {
        const fileName = typeof file === 'string' ? file : file.name;
        return fileName.toLowerCase().includes(searchQuery);
    });

    clearSearchBtn.style.display = 'inline-block';
    
    if (filteredFiles.length === 0) {
        searchResults.textContent = `No files found matching "${searchQuery}"`;
    } else {
        searchResults.textContent = `Found ${filteredFiles.length} file(s)`;
    }

    currentPage = 1;
    displayFiles();
}

// Clear search
function clearSearch() {
    searchInput.value = '';
    searchQuery = '';
    isSearchActive = false;
    filteredFiles = [];
    clearSearchBtn.style.display = 'none';
    searchResults.textContent = '';
    selectedFiles.clear();
    loadFiles(1);
}

// Load and display files
async function loadFiles(page = 1) {
    showLoader();
    try {
        const response = await fetch('/files');
        const files = await response.json();
        allFiles = files;
        currentPage = page;
        displayFiles();
    } catch (err) {
        console.error('Error loading files:', err);
    }
}

// Display files with pagination
function displayFiles(page = currentPage) {
    currentPage = page;
    const filesToDisplay = isSearchActive ? filteredFiles : allFiles;
    
    const totalPages = Math.ceil(filesToDisplay.length / filesPerPage);
    const startIndex = (page - 1) * filesPerPage;
    const endIndex = startIndex + filesPerPage;
    const paginatedFiles = filesToDisplay.slice(startIndex, endIndex);

    // Display files
    filesList.innerHTML = '';
    if (filesToDisplay.length === 0) {
        const emptyMsg = isSearchActive 
            ? `No files match "${searchQuery}"` 
            : 'No files uploaded yet';
        filesList.innerHTML = `<li class="empty-message">${emptyMsg}</li>`;
        document.getElementById('pagination').style.display = 'none';
        document.getElementById('selectedActionsContainer').style.display = 'none';
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
            
            const fileName = typeof file === 'string' ? file : file.name;
            const fileSize = typeof file === 'string' ? 0 : (file.size || 0);
            const fileSizeText = formatFileSize(fileSize);
            
            li.innerHTML = `
                <div class="file-checkbox-wrapper">
                    <input type="checkbox" class="file-checkbox" data-filename="${fileName}" 
                        ${selectedFiles.has(fileName) ? 'checked' : ''}>
                </div>
                <div class="file-item-content">
                    <a href="/download/${fileName}" download>${fileName}</a>
                    <span class="file-size">${fileSizeText}</span>
                </div>
                <button class="delete-btn" data-filename="${fileName}">Delete</button>
            `;
            filesList.appendChild(li);

            const checkbox = li.querySelector('.file-checkbox');
            const deleteBtn = li.querySelector('.delete-btn');

            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    selectedFiles.add(fileName);
                } else {
                    selectedFiles.delete(fileName);
                }
                updateDeleteButton();
            });

            deleteBtn.addEventListener('click', async () => {
                if (confirm(`Are you sure you want to delete "${fileName}"?`)) {
                    await deleteFile(fileName);
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
            
            document.getElementById('prevBtn').disabled = page === 1;
            document.getElementById('nextBtn').disabled = page === totalPages;
        } else {
            paginationDiv.style.display = 'none';
        }
    }
    updateDeleteButton();
    hideLoader();
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
            clearSearch();
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
        clearSearch();
        loadFiles(1);
    } catch (err) {
        showMessage('✗ Error deleting files: ' + err.message, 'error');
    }
}

// Download multiple selected files
async function downloadSelectedFiles() {
    if (selectedFiles.size === 0) return;

    const filesToDownload = Array.from(selectedFiles);
    
    filesToDownload.forEach((filename, index) => {
        setTimeout(() => {
            const link = document.createElement('a');
            link.href = `/download/${filename}`;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }, index * 500);
    });

    showMessage(`✓ Downloading ${filesToDownload.length} file(s)...`, 'success');
}

async function clearSelectedFiles() {
    selectedFiles.clear();
    displayFiles();
}

// Event listeners for pagination
document.getElementById('prevBtn').addEventListener('click', () => {
    const filesToDisplay = isSearchActive ? filteredFiles : allFiles;
    if (currentPage > 1) {
        displayFiles(currentPage - 1);
    }
});

document.getElementById('nextBtn').addEventListener('click', () => {
    const filesToDisplay = isSearchActive ? filteredFiles : allFiles;
    const totalPages = Math.ceil(filesToDisplay.length / filesPerPage);
    if (currentPage < totalPages) {
        displayFiles(currentPage + 1);
    }
});

// Search event listeners
searchInput.addEventListener('input', (e) => {
    searchFiles(e.target.value);
});

clearSearchBtn.addEventListener('click', clearSearch);

// Event listener for download selected button
document.getElementById('downloadSelectedBtn').addEventListener('click', downloadSelectedFiles);
// Event listener for delete selected button
document.getElementById('deleteSelectedBtn').addEventListener('click', deleteSelectedFiles);

document.getElementById('clearSelectionBtn').addEventListener('click', clearSelectedFiles);

// Event listener for go to page button
document.getElementById('goToPageBtn').addEventListener('click', () => {
    const pageInput = document.getElementById('pageInput');
    const pageNum = parseInt(pageInput.value);
    const filesToDisplay = isSearchActive ? filteredFiles : allFiles;
    const totalPages = Math.ceil(filesToDisplay.length / filesPerPage);

    if (!pageNum || pageNum < 1 || pageNum > totalPages) {
        showMessage(`✗ Please enter a page number between 1 and ${totalPages}`, 'error');
        return;
    }

    displayFiles(pageNum);
    pageInput.value = ''; // Clear input after navigation
});

// Allow Enter key to submit page number
document.getElementById('pageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('goToPageBtn').click();
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

