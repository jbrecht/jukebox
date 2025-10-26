
        // --- CONFIGURATION ---
        // 🛑 REPLACE THESE VALUES with your actual S3 bucket details
        const BUCKET_NAME = 'tasty-mixes';
        const REGION = 'us-east-1'; // e.g., 'us-east-1'
        // ---------------------

        // Get DOM elements
        const folderList = document.getElementById('folders');
        const fileList = document.getElementById('files');
        const audioPlayer = document.getElementById('audio-player');
        const nowPlaying = document.getElementById('now-playing');
        const currentFolderName = document.getElementById('current-folder-name');
        const configWarning = document.getElementById('config-warning');

        let s3;

        // Check if the app is configured
        const isConfigured = BUCKET_NAME !== 'your-bucket-name-here' && REGION !== 'your-region-here';

        if (!isConfigured) {
            configWarning.style.display = 'block';
            // Populate with mock data for preview
            populateMockData();
        } else {
            configWarning.style.display = 'none';
            // For public S3 buckets, we'll use direct HTTP requests instead of AWS SDK
            // This avoids credential issues entirely
            listFolders();
        }

        /**
         * Populates the UI with mock data for preview purposes.
         */
        function populateMockData() {
            const mockFolders = ['My-Mixes/', 'Podcast-Episodes/', 'Audiobook-Chapters/'];
            folderList.innerHTML = '';
            mockFolders.forEach(folderName => {
                const li = document.createElement('li');
                li.textContent = folderName;
                li.onclick = () => listFiles(folderName);
                folderList.appendChild(li);
            });
            
            // Show some mock files for the first folder
            if (mockFolders.length > 0) {
                listFiles(mockFolders[0]);
            }
        }

        /**
         * Lists all "folders" (prefixes) in the root of the bucket using direct HTTP requests
         */
        async function listFolders() {
            try {
                // Use S3 REST API directly for public buckets
                const url = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/?delimiter=/`;
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const xmlText = await response.text();
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
                
                // Check for errors in the XML response
                const error = xmlDoc.getElementsByTagName('Error')[0];
                if (error) {
                    const code = error.getElementsByTagName('Code')[0]?.textContent || 'Unknown';
                    const message = error.getElementsByTagName('Message')[0]?.textContent || 'Unknown error';
                    throw new Error(`${code}: ${message}`);
                }
                
                folderList.innerHTML = ''; // Clear list
                const commonPrefixes = xmlDoc.getElementsByTagName('CommonPrefixes');
                
                if (commonPrefixes.length === 0) {
                    folderList.innerHTML = '<li>No folders found.</li>';
                } else {
                    Array.from(commonPrefixes).forEach(prefixElement => {
                        const prefixText = prefixElement.getElementsByTagName('Prefix')[0]?.textContent;
                        if (prefixText) {
                            const li = document.createElement('li');
                            li.textContent = prefixText;
                            li.onclick = () => listFiles(prefixText);
                            folderList.appendChild(li);
                        }
                    });
                }
            } catch (err) {
                console.error("Error listing folders:", err);
                showError(`Error listing folders: ${err.message}`);
            }
        }

        /**
         * Lists all .mp3 files inside a specific "folder" (prefix)
         */
        async function listFiles(folderPrefix) {
            currentFolderName.textContent = folderPrefix;
            fileList.innerHTML = '<li>Loading...</li>'; // Show loading state
            
            // Handle mock data case
            if (!isConfigured) {
                const mockFiles = {
                    'My-Mixes/': ['Awesome-Track-1.mp3', 'Chill-Vibes.mp3', 'Workout-Mix.mp3'],
                    'Podcast-Episodes/': ['Episode-101.mp3', 'Tech-Talk-Weekly.mp3'],
                    'Audiobook-Chapters/': ['Chapter-01.mp3', 'Chapter-02-Part1.mp3', 'Chapter-02-Part2.mp3']
                };
                
                fileList.innerHTML = '';
                (mockFiles[folderPrefix] || ['(No mock files for this folder)']).forEach(simpleName => {
                    if (!simpleName.endsWith('.mp3')) {
                         fileList.innerHTML = `<li>${simpleName}</li>`;
                         return;
                    }
                    const li = createFileListItem(simpleName, '#', simpleName);
                    // Disable click actions for mock data
                    li.querySelector('span').onclick = (e) => {
                        e.preventDefault();
                        playSong('#', simpleName);
                    };
                    li.querySelector('a').onclick = (e) => {
                        e.preventDefault();
                        alert('This is a preview. Download is disabled.');
                    };
                    fileList.appendChild(li);
                });
                return;
            }
            
            // Handle real data case using direct HTTP requests
            try {
                // Use S3 REST API directly for public buckets
                const encodedPrefix = encodeURIComponent(folderPrefix);
                const url = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/?prefix=${encodedPrefix}`;
                const response = await fetch(url);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const xmlText = await response.text();
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
                
                // Check for errors in the XML response
                const error = xmlDoc.getElementsByTagName('Error')[0];
                if (error) {
                    const code = error.getElementsByTagName('Code')[0]?.textContent || 'Unknown';
                    const message = error.getElementsByTagName('Message')[0]?.textContent || 'Unknown error';
                    throw new Error(`${code}: ${message}`);
                }

                fileList.innerHTML = ''; // Clear list
                let mp3Found = false;
                
                const contents = xmlDoc.getElementsByTagName('Contents');
                Array.from(contents).forEach(contentElement => {
                    const key = contentElement.getElementsByTagName('Key')[0]?.textContent;
                    const sizeText = contentElement.getElementsByTagName('Size')[0]?.textContent;
                    const size = parseInt(sizeText) || 0;
                    
                    // Filter for .mp3 files and ignore the "folder" itself (size 0)
                    if (key && key.endsWith('.mp3') && size > 0) {
                        mp3Found = true;
                        const simpleName = key.replace(folderPrefix, ''); // 'folder/song.mp3' -> 'song.mp3'
                        
                        // Construct the public URL
                        // We must encode the key in case it has spaces or special characters
                        const encodedKey = key.split('/').map(encodeURIComponent).join('/');
                        const url = `https://${BUCKET_NAME}.s3.${REGION}.amazonaws.com/${encodedKey}`;

                        const li = createFileListItem(simpleName, url, simpleName);
                        fileList.appendChild(li);
                    }
                });

                if (!mp3Found) {
                    fileList.innerHTML = '<li>No .mp3 files found in this folder.</li>';
                }

            } catch (err) {
                console.error("Error listing files:", err);
                showError(`Error listing files: ${err.message}`);
            }
        }
        
        /**
         * Helper function to create the LI element for a file
         */
        function createFileListItem(simpleName, url, downloadName) {
            const li = document.createElement('li');
            li.className = 'file-item';
            
            // Text for the song name
            const songName = document.createElement('span');
            songName.textContent = simpleName;
            songName.title = `Play ${simpleName}`;
            songName.onclick = () => playSong(url, simpleName);
            
            // Download link
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.textContent = 'Download';
            downloadLink.className = 'download-btn';
            downloadLink.setAttribute('download', downloadName); // This attribute triggers download
            downloadLink.title = `Download ${simpleName}`;

            li.appendChild(songName);
li.appendChild(downloadLink);
            return li;
        }

        /**
         * Plays the selected song
         */
        function playSong(url, name) {
            if (!isConfigured) {
                nowPlaying.textContent = `Now Playing: ${name} (Preview)`;
                alert(`This is a preview. In a real app, this would play the MP3.\n\nFile: ${name}`);
                return;
            }
            nowPlaying.textContent = `Now Playing: ${name}`;
            audioPlayer.src = url;
            audioPlayer.play().catch(e => {
                console.error("Error playing audio:", e);
                nowPlaying.textContent = `Error: Could not play ${name}.`;
            });
        }
        
        /**
         * Shows an error message in the config warning box
         */
         function showError(message) {
            configWarning.innerHTML = `<strong>Error:</strong> ${message}`;
            configWarning.style.display = 'block';
            configWarning.style.backgroundColor = '#f8d7da';
            configWarning.style.color = '#721c24';
            configWarning.style.borderColor = '#f5c6cb';
         }