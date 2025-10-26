import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { S3Service, S3Folder, S3File } from './services/s3.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  template: `
    <div class="app">
      <header class="header">
        <h1>�� S3 Music Jukebox</h1>
        <p>Browse and play music from your S3 bucket</p>
      </header>
      
      <main class="main">
        <section class="folders">
          <h2>📁 Folders</h2>
          <div class="folder-grid">
            @for (folder of folders; track folder.prefix) {
              <div class="folder-card" (click)="selectFolder(folder)">
                {{ folder.name }}
              </div>
            }
          </div>
        </section>
        
        @if (selectedFolder) {
          <section class="files">
            <h2>🎵 Files in {{ selectedFolder.name }}</h2>
            <div class="file-list">
              @for (file of files; track file.key) {
                <div class="file-item">
                  <span class="file-name" (click)="playFile(file)">{{ file.name }}</span>
                  <div class="file-actions">
                    <small>{{ s3Service.formatFileSize(file.size) }}</small>
                    <button class="play-btn" (click)="playFile(file)">▶️</button>
                    <a [href]="file.url" [download]="file.name" class="download-btn">⬇️</a>
                  </div>
                </div>
              }
            </div>
          </section>
        }
        
        @if (currentlyPlaying) {
          <section class="player">
            <h3>🎵 Now Playing: {{ currentlyPlaying.name }}</h3>
            <audio #audioPlayer controls [src]="currentlyPlaying.url" class="audio-player">
              Your browser does not support the audio element.
            </audio>
          </section>
        }
      </main>
    </div>
  `,
  styles: [`
    .app {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
    }
    .folder-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }
    .folder-card {
      background: rgba(255, 255, 255, 0.1);
      padding: 20px;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-align: center;
      font-weight: 500;
    }
    .folder-card:hover {
      background: rgba(255, 255, 255, 0.2);
      transform: translateY(-4px);
    }
    .files {
      margin-top: 40px;
    }
    .file-list {
      margin-top: 16px;
    }
    .file-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      margin-bottom: 8px;
      transition: all 0.3s ease;
    }
    .file-item:hover {
      background: rgba(255, 255, 255, 0.2);
    }
    .file-name {
      cursor: pointer;
      font-weight: 500;
      flex-grow: 1;
    }
    .file-name:hover {
      text-decoration: underline;
    }
    .file-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .play-btn, .download-btn {
      padding: 8px;
      background: rgba(255, 255, 255, 0.2);
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
      color: white;
    }
    .play-btn:hover, .download-btn:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.1);
    }
    .player {
      margin-top: 40px;
      padding: 20px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      text-align: center;
    }
    .audio-player {
      width: 100%;
      margin-top: 16px;
      border-radius: 8px;
    }
  `]
})
export class AppComponent implements OnInit {
  title = 'S3 Music Jukebox';
  folders: S3Folder[] = [];
  files: S3File[] = [];
  selectedFolder: S3Folder | null = null;
  currentlyPlaying: S3File | null = null;

  constructor(public s3Service: S3Service) {}

  ngOnInit() {
    this.loadFolders();
  }

  loadFolders() {
    this.s3Service.listFolders().subscribe(folders => {
      this.folders = folders;
    });
  }

  selectFolder(folder: S3Folder) {
    this.selectedFolder = folder;
    this.s3Service.listFiles(folder.prefix).subscribe(files => {
      this.files = files;
    });
  }

  playFile(file: S3File) {
    this.currentlyPlaying = file;
    console.log('Playing:', file.name, 'from URL:', file.url);
  }
}
