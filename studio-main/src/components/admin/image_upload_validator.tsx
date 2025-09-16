"use client";

import React, { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, X, AlertCircle, CheckCircle, FileImage } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import Image from 'next/image';

interface ImageUploadProps {
  onImageChange: (file: File | null, previewUrl: string) => void;
  currentImageUrl?: string;
  maxSizeInMB?: number;
  allowedFormats?: string[];
  className?: string;
}

export function ImageUploadValidator({
  onImageChange,
  currentImageUrl = '',
  maxSizeInMB = 2,
  allowedFormats = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'],
  className = ''
}: ImageUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState(currentImageUrl);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isValid, setIsValid] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateFile = (file: File): string[] => {
    const errors: string[] = [];

    // Check file type
    if (!allowedFormats.includes(file.type)) {
      errors.push(`Invalid file format. Allowed formats: ${allowedFormats.map(f => f.split('/')[1]).join(', ')}`);
    }

    // Check file size
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > maxSizeInMB) {
      errors.push(`File size too large. Maximum size: ${maxSizeInMB}MB, Current size: ${fileSizeInMB.toFixed(2)}MB`);
    }

    // Check if file is actually an image
    if (!file.type.startsWith('image/')) {
      errors.push('File must be an image');
    }

    return errors;
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) {
      resetSelection();
      return;
    }

    const errors = validateFile(file);
    setValidationErrors(errors);

    if (errors.length === 0) {
      setSelectedFile(file);
      setIsValid(true);
      
      // Create preview URL
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);
      
      // Call parent callback
      onImageChange(file, preview);
      
      toast({
        title: "Image Selected",
        description: `${file.name} is ready to upload`,
      });
    } else {
      setSelectedFile(null);
      setIsValid(false);
      setPreviewUrl(currentImageUrl);
      
      toast({
        title: "Invalid File",
        description: errors[0],
        variant: "destructive",
      });
    }
  };

  const resetSelection = () => {
    setSelectedFile(null);
    setPreviewUrl(currentImageUrl);
    setValidationErrors([]);
    setIsValid(false);
    onImageChange(null, currentImageUrl);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <Label htmlFor="image-upload">Image Upload</Label>
        <div className="text-sm text-muted-foreground">
          Allowed formats: {allowedFormats.map(f => f.split('/')[1].toUpperCase()).join(', ')} | Max size: {maxSizeInMB}MB
        </div>
      </div>

      {/* Hidden file input */}
      <Input
        ref={fileInputRef}
        type="file"
        accept={allowedFormats.join(',')}
        onChange={handleFileSelect}
        className="hidden"
        id="image-upload"
      />

      {/* Upload button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleButtonClick}
        className="w-full flex items-center justify-center gap-2 h-12"
      >
        <Upload className="h-4 w-4" />
        Choose Image File
      </Button>

      {/* File info and validation */}
      {selectedFile && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <FileImage className="h-8 w-8 text-blue-500" />
                <div>
                  <p className="font-medium text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(selectedFile.size)} • {selectedFile.type.split('/')[1].toUpperCase()}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {isValid ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetSelection}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            {/* Validation errors */}
            {validationErrors.length > 0 && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                {validationErrors.map((error, index) => (
                  <p key={index} className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {error}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Image preview */}
      {previewUrl && (
        <Card>
          <CardContent className="p-4">
            <Label className="text-sm font-medium">Preview</Label>
            <div className="mt-2 relative w-full h-48 border rounded-md overflow-hidden bg-muted">
              <Image
                src={previewUrl}
                alt="Image preview"
                fill
                sizes="300px"
                className="object-contain"
                onError={() => {
                  setPreviewUrl('');
                  toast({
                    title: "Preview Error",
                    description: "Could not load image preview",
                    variant: "destructive",
                  });
                }}
              />
            </div>
            
            {selectedFile && (
              <div className="mt-2 flex justify-between items-center text-xs text-muted-foreground">
                <span>Dimensions will be automatically optimized</span>
                <span>{isValid ? 'Ready to upload' : 'Invalid file'}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Upload guidelines */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-3">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Upload Guidelines:</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Use high-quality images for better presentation</li>
            <li>• Square or landscape orientation works best</li>
            <li>• Avoid blurry or pixelated images</li>
            <li>• Images will be automatically resized for optimal display</li>
            <li>• Only image files are accepted (no PDFs, documents, etc.)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for easy integration
export function useImageUpload(initialUrl = '') {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState(initialUrl);
  const [previewUrl, setPreviewUrl] = useState(initialUrl);

  const handleImageChange = (file: File | null, preview: string) => {
    setImageFile(file);
    setPreviewUrl(preview);
    if (!file) {
      setImageUrl(initialUrl);
    }
  };

  const reset = () => {
    setImageFile(null);
    setImageUrl(initialUrl);
    setPreviewUrl(initialUrl);
  };

  return {
    imageFile,
    imageUrl,
    previewUrl,
    handleImageChange,
    reset,
    hasNewImage: !!imageFile
  };
}