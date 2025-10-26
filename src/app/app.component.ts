import { Component, OnInit } from '@angular/core';
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
