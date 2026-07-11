import { useState, useRef } from 'react';
import { uploadApi } from '../api/client';

interface Props {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
}

export default function ImageUpload({ value, onChange, placeholder }: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadApi.image(file);
      onChange(url);
    } catch (err: any) {
      alert(err.message);
    }
    setUploading(false);
    // 清空 input 以便再次选择同一文件
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="image-upload">
      <input type="file" accept="image/*" onChange={handleFile} ref={inputRef} disabled={uploading} />
      {uploading && <span className="upload-hint">上传中...</span>}
      <div className="image-upload-row">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder || '图片 URL，或点击上传'}
        />
        {value && (
          <div className="image-preview">
            <img src={value} alt="preview" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
        )}
      </div>
    </div>
  );
}
