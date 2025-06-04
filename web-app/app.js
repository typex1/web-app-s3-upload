document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const fileInput = document.getElementById('fileInput');
    const fileName = document.getElementById('fileName');
    const uploadButton = document.getElementById('uploadButton');
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const status = document.getElementById('status');
    const filesList = document.getElementById('filesList');
    
    // API endpoint from environment variable (set by Amplify)
    // In local development, you can set this manually
    const apiEndpoint = process.env.API_ENDPOINT || 'https://your-api-endpoint.execute-api.region.amazonaws.com/dev/generate-presigned-url';
    
    // Store uploaded files in local storage
    let uploadedFiles = JSON.parse(localStorage.getItem('uploadedFiles')) || [];
    
    // Display uploaded files on load
    displayUploadedFiles();
    
    // File input change handler
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            fileName.textContent = fileInput.files[0].name;
            uploadButton.disabled = false;
        } else {
            fileName.textContent = 'No file chosen';
            uploadButton.disabled = true;
        }
    });
    
    // Upload button click handler
    uploadButton.addEventListener('click', async () => {
        const file = fileInput.files[0];
        if (!file) return;
        
        try {
            // Disable upload button during upload
            uploadButton.disabled = true;
            status.textContent = 'Generating pre-signed URL...';
            status.className = 'status info';
            
            // Get pre-signed URL from API
            const presignedUrlData = await getPresignedUrl(file.name, file.type);
            
            // Show progress bar
            progressContainer.classList.remove('hidden');
            
            // Upload file to S3 using pre-signed URL
            await uploadFileToS3(presignedUrlData.uploadUrl, file, updateProgress);
            
            // Add file to uploaded files list
            const fileData = {
                name: file.name,
                key: presignedUrlData.key,
                size: formatFileSize(file.size),
                type: file.type,
                uploadedAt: new Date().toISOString()
            };
            
            uploadedFiles.push(fileData);
            localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));
            
            // Update UI
            displayUploadedFiles();
            status.textContent = 'File uploaded successfully!';
            status.className = 'status success';
            
            // Reset file input
            fileInput.value = '';
            fileName.textContent = 'No file chosen';
            
        } catch (error) {
            console.error('Upload error:', error);
            status.textContent = `Upload failed: ${error.message}`;
            status.className = 'status error';
        } finally {
            // Hide progress bar and re-enable upload button
            progressContainer.classList.add('hidden');
            uploadButton.disabled = false;
        }
    });
    
    // Function to get pre-signed URL from API Gateway
    async function getPresignedUrl(fileName, fileType) {
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                fileName,
                fileType
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to get pre-signed URL');
        }
        
        return response.json();
    }
    
    // Function to upload file to S3 using pre-signed URL
    async function uploadFileToS3(presignedUrl, file, progressCallback) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            
            // Set up progress tracking
            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    progressCallback(percentComplete);
                }
            });
            
            // Set up completion handler
            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve();
                } else {
                    reject(new Error(`HTTP Error: ${xhr.status}`));
                }
            });
            
            // Set up error handler
            xhr.addEventListener('error', () => {
                reject(new Error('Network error occurred'));
            });
            
            // Open and send the request
            xhr.open('PUT', presignedUrl);
            xhr.setRequestHeader('Content-Type', file.type);
            xhr.send(file);
        });
    }
    
    // Function to update progress bar
    function updateProgress(percent) {
        progressBar.style.width = `${percent}%`;
        progressText.textContent = `${percent}%`;
    }
    
    // Function to display uploaded files
    function displayUploadedFiles() {
        filesList.innerHTML = '';
        
        if (uploadedFiles.length === 0) {
            filesList.innerHTML = '<li class="no-files">No files uploaded yet</li>';
            return;
        }
        
        // Sort files by upload date (newest first)
        uploadedFiles.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
        
        uploadedFiles.forEach((file, index) => {
            const li = document.createElement('li');
            
            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-info';
            
            const fileIcon = document.createElement('span');
            fileIcon.className = 'file-icon';
            fileIcon.textContent = getFileIcon(file.type);
            
            const fileDetails = document.createElement('div');
            fileDetails.className = 'file-details';
            
            const fileNameElement = document.createElement('div');
            fileNameElement.className = 'file-name';
            fileNameElement.textContent = file.name;
            
            const fileMetadata = document.createElement('div');
            fileMetadata.className = 'file-metadata';
            fileMetadata.textContent = `${file.size} • ${new Date(file.uploadedAt).toLocaleString()}`;
            
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-button';
            deleteButton.textContent = '×';
            deleteButton.addEventListener('click', () => {
                uploadedFiles.splice(index, 1);
                localStorage.setItem('uploadedFiles', JSON.stringify(uploadedFiles));
                displayUploadedFiles();
            });
            
            fileDetails.appendChild(fileNameElement);
            fileDetails.appendChild(fileMetadata);
            
            fileInfo.appendChild(fileIcon);
            fileInfo.appendChild(fileDetails);
            
            li.appendChild(fileInfo);
            li.appendChild(deleteButton);
            
            filesList.appendChild(li);
        });
    }
    
    // Helper function to format file size
    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Helper function to get file icon based on file type
    function getFileIcon(fileType) {
        if (fileType.startsWith('image/')) return '🖼️';
        if (fileType.startsWith('video/')) return '🎬';
        if (fileType.startsWith('audio/')) return '🎵';
        if (fileType.includes('pdf')) return '📄';
        if (fileType.includes('word') || fileType.includes('document')) return '📝';
        if (fileType.includes('excel') || fileType.includes('spreadsheet')) return '📊';
        if (fileType.includes('zip') || fileType.includes('compressed')) return '🗜️';
        return '📁';
    }
});