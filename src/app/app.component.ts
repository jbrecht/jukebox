import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { S3Service, S3Folder, S3File } from './services/s3.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HttpClientModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  title = 'Tasty Jukebox';
  folders: S3Folder[] = [];
  files: S3File[] = [];
  selectedFolder: S3Folder | null = null;
  currentlyPlaying: S3File | null = null;
  currentTime: number = 0;
  duration: number = 0;
  isPlaying: boolean = false;
  progress: number = 0;

  @ViewChild('audioPlayer', { static: false }) audioPlayer!: ElementRef<HTMLAudioElement>;

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
    this.isPlaying = false;
    this.currentTime = 0;
    this.duration = 0;
    this.progress = 0;
    console.log('Playing:', file.name, 'from URL:', file.url);
  }

  // Audio event handlers
  onTimeUpdate() {
    if (this.audioPlayer?.nativeElement) {
      const audio = this.audioPlayer.nativeElement;
      this.currentTime = audio.currentTime;
      this.progress = this.duration > 0 ? (this.currentTime / this.duration) * 100 : 0;
    }
  }

  onLoadedMetadata() {
    if (this.audioPlayer?.nativeElement) {
      this.duration = this.audioPlayer.nativeElement.duration;
    }
  }

  onPlay() {
    this.isPlaying = true;
  }

  onPause() {
    this.isPlaying = false;
  }

  onEnded() {
    this.isPlaying = false;
    this.currentTime = 0;
    this.progress = 0;
  }

  // Audio control methods
  togglePlayPause() {
    if (this.audioPlayer?.nativeElement) {
      const audio = this.audioPlayer.nativeElement;
      if (this.isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
    }
  }

  seek(event: MouseEvent) {
    if (this.audioPlayer?.nativeElement && this.duration > 0) {
      const progressBar = event.currentTarget as HTMLElement;
      const rect = progressBar.getBoundingClientRect();
      const percentage = (event.clientX - rect.left) / rect.width;
      const newTime = percentage * this.duration;
      this.audioPlayer.nativeElement.currentTime = newTime;
    }
  }

  // Format time for display
  formatTime(seconds: number): string {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  formatName(name: string): string {
    return name
      .replace(/[-_]/g, ' ')  // Replace hyphens and underscores with spaces
      .replace(/\s+/g, ' ')   // Replace multiple spaces with single space
      .trim();                // Remove leading/trailing spaces
  }

  formatFolderName(folderName: string): string {
    return this.formatName(folderName.replace('/', ''));
  }

  formatFileName(fileName: string): string {
    // Remove file extension and format the name
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    return this.formatName(nameWithoutExt);
  }
}
