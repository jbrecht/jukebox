import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { HttpClient } from '@angular/common/http';

export interface S3Config {
  bucketName: string;
  region: string;
}

export interface S3Folder {
  name: string;
  prefix: string;
}

export interface S3File {
  name: string;
  key: string;
  url: string;
  size: number;
}

@Injectable({
  providedIn: 'root'
})
export class S3Service {
  private config: S3Config = {
    bucketName: 'tasty-mixes', // Your actual bucket name
    region: 'us-east-1'        // Your actual region
  };

  constructor(private http: HttpClient) {}

  setConfig(config: S3Config): void {
    this.config = config;
  }

  getConfig(): S3Config {
    return { ...this.config };
  }

  isConfigured(): boolean {
    return this.config.bucketName !== 'your-bucket-name-here' && 
           this.config.region !== 'your-region-here';
  }

  listFolders(): Observable<S3Folder[]> {
    return from(this.fetchFolders());
  }

  listFiles(prefix: string): Observable<S3File[]> {
    return from(this.fetchFiles(prefix));
  }

  private async fetchFolders(): Promise<S3Folder[]> {
    try {
      // Use S3 REST API directly for public buckets
      const url = `https://${this.config.bucketName}.s3.${this.config.region}.amazonaws.com/?delimiter=/`;
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
      
      const folders: S3Folder[] = [];
      const commonPrefixes = xmlDoc.getElementsByTagName('CommonPrefixes');
      
      Array.from(commonPrefixes).forEach(prefixElement => {
        const prefixText = prefixElement.getElementsByTagName('Prefix')[0]?.textContent;
        if (prefixText) {
          folders.push({
            name: prefixText,
            prefix: prefixText
          });
        }
      });
      
      return folders;
    } catch (error) {
      console.error('Error listing folders:', error);
      // Fallback to mock data on error
      return [
        { name: 'My-Mixes/', prefix: 'My-Mixes/' },
        { name: 'Electronic/', prefix: 'Electronic/' },
        { name: 'Rock/', prefix: 'Rock/' },
        { name: 'Jazz/', prefix: 'Jazz/' }
      ];
    }
  }

  private async fetchFiles(prefix: string): Promise<S3File[]> {
    try {
      // Use S3 REST API directly for public buckets
      const encodedPrefix = encodeURIComponent(prefix);
      const url = `https://${this.config.bucketName}.s3.${this.config.region}.amazonaws.com/?prefix=${encodedPrefix}`;
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

      const files: S3File[] = [];
      const contents = xmlDoc.getElementsByTagName('Contents');
      
      Array.from(contents).forEach(contentElement => {
        const key = contentElement.getElementsByTagName('Key')[0]?.textContent;
        const sizeText = contentElement.getElementsByTagName('Size')[0]?.textContent;
        const size = parseInt(sizeText || '0') || 0;
        
        // Filter for .mp3 files and ignore the "folder" itself (size 0)
        if (key && key.endsWith('.mp3') && size > 0) {
          const simpleName = key.replace(prefix, ''); // 'folder/song.mp3' -> 'song.mp3'
          
          // Construct the public URL
          // We must encode the key in case it has spaces or special characters
          const encodedKey = key.split('/').map(encodeURIComponent).join('/');
          const fileUrl = `https://${this.config.bucketName}.s3.${this.config.region}.amazonaws.com/${encodedKey}`;

          files.push({
            name: simpleName,
            key: key,
            url: fileUrl,
            size: size
          });
        }
      });
      
      return files;
    } catch (error) {
      console.error('Error listing files:', error);
      // Fallback to mock data on error
      return [
        { name: 'Song-1.mp3', key: prefix + 'Song-1.mp3', url: '#', size: 5000000 },
        { name: 'Song-2.mp3', key: prefix + 'Song-2.mp3', url: '#', size: 7000000 }
      ];
    }
  }

  formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}
