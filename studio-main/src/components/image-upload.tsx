// src/components/image-upload.tsx
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Link, X } from 'lucide-react';
import Image from 'next/image';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  onFileChange?: (file: File | null) => void;
}

export function ImageUpload({ value, onChange, onFileChange }: ImageUploadProps) {
  const [imageUrl, setImageUrl] = useState(value || '');
  const [uploading, setUploading] = useState(false);

  const handleUrlChange = (url: string) => {
    setImageUrl(url);
    onChange(url);
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      handleUrlChange(data.url);
      if (onFileChange) onFileChange(file);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setUploading(false);
    }
  };

  const clearImage = () => {
    setImageUrl('');
    onChange('');
    if (onFileChange) onFileChange(null);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="image-url">Image URL (Cloudinary or direct link)</Label>
        <div className="flex gap-2 mt-1">
          <Input
            id="image-url"
            placeholder="https://res.cloudinary.com/..."
            value={imageUrl}
            onChange={(e) => handleUrlChange(e.target.value)}
          />
          <Button type="button" variant="outline" size="icon" onClick={clearImage}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="text-center">
        <div className="text-sm text-muted-foreground mb-2">OR</div>
        <Label htmlFor="file-upload" className="cursor-pointer">
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-gray-400 transition-colors">
            <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <span className="text-sm text-gray-600">
              {uploading ? 'Uploading...' : 'Click to upload image'}
            </span>
          </div>
          <Input
            id="file-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
            disabled={uploading}
          />
        </Label>
      </div>

      {imageUrl && (
        <div className="relative w-full h-40 border rounded-lg overflow-hidden">
          <Image
            src={imageUrl}
            alt="Preview"
            fill
            className="object-cover"
            onError={() => {
              // Handle broken image URLs
              setImageUrl('');
              onChange('');
            }}
          />
        </div>
      )}
    </div>
  );
}
